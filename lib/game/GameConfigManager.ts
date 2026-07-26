/**
 * GameConfigManager — Phase 5 of the Ultimate Game & Lobby Editor
 * Manages multi-game engine configurations, classes, and loot tables.
 * All JSON fields are stored as strings for SQLite compatibility.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GameConfigInput {
  slug: string;
  name: string;
  version?: string;
  description?: string;
  maxLevel?: number;
  baseStats?: Record<string, number>;
  combatFormula?: string;
  skillFormula?: string;
  xpCurve?: string;
  spritePackIds?: string[];
  tilesetPackIds?: string[];
  maxEntitiesPerMap?: number;
  maxPlayersPerMap?: number;
  chunkSize?: number;
  optimizationLevel?: string;
  enableChat?: boolean;
  enableParties?: boolean;
  enableTrading?: boolean;
  enablePvP?: boolean;
  maxPartySize?: number;
}

export interface CharacterClassInput {
  gameId: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  baseStats?: Record<string, number>;
  growthRates?: Record<string, number>;
  allowedSpriteTags?: string[];
  spriteFilters?: Record<string, string[]>;
  startingEquipment?: string[];
  skillProgression?: Array<{ level: number; skill: string }>;
  perks?: string[];
  abilities?: string[];
  isPlayable?: boolean;
  sortOrder?: number;
}

export interface LootTableInput {
  gameId: string;
  name: string;
  description?: string;
  entries?: LootEntry[];
  rollsPerDrop?: number;
  guaranteedDrops?: LootEntry[];
  commonWeight?: number;
  uncommonWeight?: number;
  rareWeight?: number;
  epicWeight?: number;
  legendaryWeight?: number;
  minLevel?: number;
  maxLevel?: number;
  requiredTags?: string[];
}

export interface LootEntry {
  itemSlug: string;
  weight: number;
  minQty: number;
  maxQty: number;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  conditions?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── GameConfigManager ────────────────────────────────────────────────────────

export class GameConfigManager {

  // ── Game Config CRUD ──────────────────────────────────────────────────────

  async listGameConfigs() {
    const configs = await prisma.gameConfig.findMany({
      include: { classes: true },
      orderBy: { createdAt: 'desc' },
    });
    return configs.map(this.parseConfig);
  }

  async getGameConfig(slug: string) {
    const config = await prisma.gameConfig.findUnique({
      where: { slug },
      include: { classes: true },
    });
    if (!config) return null;
    return this.parseConfig(config);
  }

  async createGameConfig(input: GameConfigInput) {
    const validation = this.validateConfig(input);
    if (!validation.valid) throw new Error(validation.errors.join(', '));

    return prisma.gameConfig.create({
      data: {
        slug: input.slug,
        name: input.name,
        version: input.version ?? '1.0.0',
        description: input.description,
        maxLevel: input.maxLevel ?? 100,
        baseStats: JSON.stringify(input.baseStats ?? {}),
        combatFormula: input.combatFormula ?? 'tuxemon-standard',
        skillFormula: input.skillFormula ?? 'runescape-style',
        xpCurve: input.xpCurve ?? 'exponential',
        spritePackIds: JSON.stringify(input.spritePackIds ?? []),
        tilesetPackIds: JSON.stringify(input.tilesetPackIds ?? []),
        maxEntitiesPerMap: input.maxEntitiesPerMap ?? 100,
        maxPlayersPerMap: input.maxPlayersPerMap ?? 50,
        chunkSize: input.chunkSize ?? 32,
        optimizationLevel: input.optimizationLevel ?? 'medium',
        enableChat: input.enableChat ?? true,
        enableParties: input.enableParties ?? true,
        enableTrading: input.enableTrading ?? true,
        enablePvP: input.enablePvP ?? false,
        maxPartySize: input.maxPartySize ?? 4,
        isActive: false,
      },
    });
  }

  async updateGameConfig(slug: string, input: Partial<GameConfigInput>) {
    const existing = await prisma.gameConfig.findUnique({ where: { slug } });
    if (!existing) throw new Error(`Game config not found: ${slug}`);

    return prisma.gameConfig.update({
      where: { slug },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.version !== undefined && { version: input.version }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.maxLevel !== undefined && { maxLevel: input.maxLevel }),
        ...(input.baseStats !== undefined && { baseStats: JSON.stringify(input.baseStats) }),
        ...(input.combatFormula !== undefined && { combatFormula: input.combatFormula }),
        ...(input.skillFormula !== undefined && { skillFormula: input.skillFormula }),
        ...(input.xpCurve !== undefined && { xpCurve: input.xpCurve }),
        ...(input.spritePackIds !== undefined && { spritePackIds: JSON.stringify(input.spritePackIds) }),
        ...(input.tilesetPackIds !== undefined && { tilesetPackIds: JSON.stringify(input.tilesetPackIds) }),
        ...(input.maxEntitiesPerMap !== undefined && { maxEntitiesPerMap: input.maxEntitiesPerMap }),
        ...(input.maxPlayersPerMap !== undefined && { maxPlayersPerMap: input.maxPlayersPerMap }),
        ...(input.chunkSize !== undefined && { chunkSize: input.chunkSize }),
        ...(input.optimizationLevel !== undefined && { optimizationLevel: input.optimizationLevel }),
        ...(input.enableChat !== undefined && { enableChat: input.enableChat }),
        ...(input.enableParties !== undefined && { enableParties: input.enableParties }),
        ...(input.enableTrading !== undefined && { enableTrading: input.enableTrading }),
        ...(input.enablePvP !== undefined && { enablePvP: input.enablePvP }),
        ...(input.maxPartySize !== undefined && { maxPartySize: input.maxPartySize }),
      },
    });
  }

  async deleteGameConfig(id: string) {
    return prisma.gameConfig.delete({ where: { id } });
  }

  async switchActiveGame(slug: string): Promise<void> {
    await prisma.$transaction([
      prisma.gameConfig.updateMany({ data: { isActive: false } }),
      prisma.gameConfig.update({ where: { slug }, data: { isActive: true } }),
    ]);
  }

  async cloneGame(id: string, newSlug: string, newName: string) {
    const original = await prisma.gameConfig.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!original) throw new Error('Game config not found');

    const { id: _id, slug: _slug, name: _name, createdAt: _ca, updatedAt: _ua, classes, ...rest } = original;

    const cloned = await prisma.gameConfig.create({
      data: { ...rest, slug: newSlug, name: newName, isActive: false },
    });

    // Clone character classes
    for (const cls of classes) {
      const { id: _cid, gameId: _gid, createdAt: _cca, updatedAt: _cua, ...clsRest } = cls;
      await prisma.characterClass.create({
        data: { ...clsRest, gameId: cloned.id },
      });
    }

    return cloned;
  }

  // ── Character Class CRUD ──────────────────────────────────────────────────

  async listClasses(gameId: string) {
    return prisma.characterClass.findMany({
      where: { gameId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createClass(input: CharacterClassInput) {
    return prisma.characterClass.create({
      data: {
        gameId: input.gameId,
        slug: input.slug,
        name: input.name,
        description: input.description ?? '',
        icon: input.icon,
        color: input.color ?? '#6366f1',
        baseStats: JSON.stringify(input.baseStats ?? {}),
        growthRates: JSON.stringify(input.growthRates ?? {}),
        allowedSpriteTags: JSON.stringify(input.allowedSpriteTags ?? []),
        spriteFilters: JSON.stringify(input.spriteFilters ?? {}),
        startingEquipment: JSON.stringify(input.startingEquipment ?? []),
        skillProgression: JSON.stringify(input.skillProgression ?? []),
        perks: JSON.stringify(input.perks ?? []),
        abilities: JSON.stringify(input.abilities ?? []),
        isPlayable: input.isPlayable ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async updateClass(id: string, input: Partial<CharacterClassInput>) {
    return prisma.characterClass.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.baseStats !== undefined && { baseStats: JSON.stringify(input.baseStats) }),
        ...(input.growthRates !== undefined && { growthRates: JSON.stringify(input.growthRates) }),
        ...(input.allowedSpriteTags !== undefined && { allowedSpriteTags: JSON.stringify(input.allowedSpriteTags) }),
        ...(input.spriteFilters !== undefined && { spriteFilters: JSON.stringify(input.spriteFilters) }),
        ...(input.startingEquipment !== undefined && { startingEquipment: JSON.stringify(input.startingEquipment) }),
        ...(input.skillProgression !== undefined && { skillProgression: JSON.stringify(input.skillProgression) }),
        ...(input.perks !== undefined && { perks: JSON.stringify(input.perks) }),
        ...(input.abilities !== undefined && { abilities: JSON.stringify(input.abilities) }),
        ...(input.isPlayable !== undefined && { isPlayable: input.isPlayable }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      },
    });
  }

  async deleteClass(id: string) {
    return prisma.characterClass.delete({ where: { id } });
  }

  // ── Loot Table CRUD ───────────────────────────────────────────────────────

  async listLootTables(gameId: string) {
    return prisma.lootTable.findMany({ where: { gameId }, orderBy: { name: 'asc' } });
  }

  async createLootTable(input: LootTableInput) {
    return prisma.lootTable.create({
      data: {
        gameId: input.gameId,
        name: input.name,
        description: input.description,
        entries: JSON.stringify(input.entries ?? []),
        rollsPerDrop: input.rollsPerDrop ?? 1,
        guaranteedDrops: JSON.stringify(input.guaranteedDrops ?? []),
        commonWeight: input.commonWeight ?? 60,
        uncommonWeight: input.uncommonWeight ?? 25,
        rareWeight: input.rareWeight ?? 10,
        epicWeight: input.epicWeight ?? 4,
        legendaryWeight: input.legendaryWeight ?? 1,
        minLevel: input.minLevel,
        maxLevel: input.maxLevel,
        requiredTags: JSON.stringify(input.requiredTags ?? []),
      },
    });
  }

  async updateLootTable(id: string, input: Partial<LootTableInput>) {
    return prisma.lootTable.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.entries !== undefined && { entries: JSON.stringify(input.entries) }),
        ...(input.rollsPerDrop !== undefined && { rollsPerDrop: input.rollsPerDrop }),
        ...(input.guaranteedDrops !== undefined && { guaranteedDrops: JSON.stringify(input.guaranteedDrops) }),
        ...(input.commonWeight !== undefined && { commonWeight: input.commonWeight }),
        ...(input.uncommonWeight !== undefined && { uncommonWeight: input.uncommonWeight }),
        ...(input.rareWeight !== undefined && { rareWeight: input.rareWeight }),
        ...(input.epicWeight !== undefined && { epicWeight: input.epicWeight }),
        ...(input.legendaryWeight !== undefined && { legendaryWeight: input.legendaryWeight }),
        ...(input.minLevel !== undefined && { minLevel: input.minLevel }),
        ...(input.maxLevel !== undefined && { maxLevel: input.maxLevel }),
        ...(input.requiredTags !== undefined && { requiredTags: JSON.stringify(input.requiredTags) }),
      },
    });
  }

  async deleteLootTable(id: string) {
    return prisma.lootTable.delete({ where: { id } });
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  validateConfig(config: Partial<GameConfigInput>): ValidationResult {
    const errors: string[] = [];
    if (config.slug && !config.slug.match(/^[a-z0-9-]+$/)) {
      errors.push('Slug must be lowercase alphanumeric + hyphens');
    }
    if (config.maxLevel !== undefined && (config.maxLevel < 1 || config.maxLevel > 200)) {
      errors.push('Max level must be 1–200');
    }
    if (config.maxPartySize !== undefined && (config.maxPartySize < 1 || config.maxPartySize > 8)) {
      errors.push('Max party size must be 1–8');
    }
    return { valid: errors.length === 0, errors };
  }

  // ── Parsing helpers ────────────────────────────────────────────────────────

  private parseConfig(config: any) {
    return {
      ...config,
      baseStats: this.safeParseJson(config.baseStats, {}),
      spritePackIds: this.safeParseJson(config.spritePackIds, []),
      tilesetPackIds: this.safeParseJson(config.tilesetPackIds, []),
      classes: (config.classes ?? []).map((cls: any) => this.parseClass(cls)),
    };
  }

  private parseClass(cls: any) {
    return {
      ...cls,
      baseStats: this.safeParseJson(cls.baseStats, {}),
      growthRates: this.safeParseJson(cls.growthRates, {}),
      allowedSpriteTags: this.safeParseJson(cls.allowedSpriteTags, []),
      spriteFilters: this.safeParseJson(cls.spriteFilters, {}),
      startingEquipment: this.safeParseJson(cls.startingEquipment, []),
      skillProgression: this.safeParseJson(cls.skillProgression, []),
      perks: this.safeParseJson(cls.perks, []),
      abilities: this.safeParseJson(cls.abilities, []),
    };
  }

  private safeParseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
}

export const gameConfigManager = new GameConfigManager();
