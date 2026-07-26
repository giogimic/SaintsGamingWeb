/**
 * CharacterClassSystem — Phase 5 of the Ultimate Game & Lobby Editor
 * Evaluates character classes, filters sprite pools based on class tags/rules,
 * and manages RPG stat growth & progression.
 */

import { AssetManager, GameAssetItem } from './assets/AssetManager';

export interface ClassStatGrowth {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  ratk: number;
  rdef: number;
}

export interface CharacterClassDefinition {
  id: string;
  gameId: string;
  slug: string;
  name: string;
  description: string;
  icon?: string | null;
  color: string;
  baseStats: Record<string, number>;
  growthRates: Record<string, number>;
  allowedSpriteTags: string[];
  spriteFilters: Record<string, string[]>;
  startingEquipment: string[];
  learnableSkills: Array<{ level: number; skill: string }>;
  perks: string[];
  abilities: string[];
  isPlayable: boolean;
  sortOrder: number;
}

export class CharacterClassSystem {
  private static instance: CharacterClassSystem;

  public static getInstance(): CharacterClassSystem {
    if (!CharacterClassSystem.instance) {
      CharacterClassSystem.instance = new CharacterClassSystem();
    }
    return CharacterClassSystem.instance;
  }

  /**
   * Filter sprite assets for a given class definition
   */
  public async getSpritesForClass(
    classDef: CharacterClassDefinition,
    gameId?: string
  ): Promise<GameAssetItem[]> {
    const assetManager = AssetManager.getInstance();
    
    // Fetch all SPRITE assets
    const searchResult = await assetManager.searchAssets({
      type: 'SPRITE',
      gameId,
    });

    const allowedTags = classDef.allowedSpriteTags || [];
    const spriteFilters = classDef.spriteFilters || {};

    if (allowedTags.length === 0 && Object.keys(spriteFilters).length === 0) {
      return searchResult.items;
    }

    return searchResult.items.filter((sprite) => {
      const spriteTags = sprite.tags || [];
      const metadata = sprite.metadata || {};

      // If allowed tags are specified, sprite must have at least one matching tag or 'player'/'hero'
      if (allowedTags.length > 0) {
        const hasAllowedTag = allowedTags.some((tag) =>
          spriteTags.includes(tag.toLowerCase())
        ) || spriteTags.includes('player') || spriteTags.includes('hero') || spriteTags.includes('npc');

        if (!hasAllowedTag) return false;
      }

      // Check attribute filters (gender, style, etc.)
      for (const [filterKey, filterValues] of Object.entries(spriteFilters)) {
        if (!filterValues || filterValues.length === 0) continue;
        const spriteValue = metadata[filterKey] as string | undefined;
        if (spriteValue && !filterValues.includes(spriteValue)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate player stats at a given level based on class base stats and growth rates
   */
  public calculateStatsAtLevel(
    baseStats: Record<string, number>,
    growthRates: Record<string, number>,
    level: number
  ): ClassStatGrowth {
    const calcStat = (key: string, defaultBase: number, defaultGrowth: number) => {
      const base = baseStats[key] ?? defaultBase;
      const mult = growthRates[key] ?? defaultGrowth;
      return Math.floor(base + (level - 1) * mult * 3);
    };

    return {
      hp: calcStat('hp', 100, 1.4),
      atk: calcStat('atk', 50, 1.2),
      def: calcStat('def', 40, 1.1),
      spd: calcStat('spd', 50, 1.3),
      ratk: calcStat('ratk', 50, 1.2),
      rdef: calcStat('rdef', 40, 1.1),
    };
  }
}
