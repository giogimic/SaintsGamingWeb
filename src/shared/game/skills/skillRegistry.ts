/**
 * Saints Gaming — Canonical Skill & XP Curve Definition Engine (Bible 25 §3.3 & §3.4)
 * Canonical registry for the 27 Saint Proficiencies and algorithmic XP curves.
 */

export type CanonicalSkillCategory = 'combat' | 'gathering' | 'artisan' | 'support';

export interface XpCurveDef {
  id: string;
  name: string;
  algorithm: 'sqrt_xp_div_50' | 'osrs_table' | 'exponential' | 'linear';
  maxLevel: number;
}

export interface CanonicalSkillDef {
  id: string;
  name: string;
  category: CanonicalSkillCategory;
  description: string;
  xpCurveId: string;
  maxLevel: number;
  iconName: string;
  themeColor: string;
  tags: string[];
  isActive: boolean;
}

export const CANONICAL_XP_CURVES: Record<string, XpCurveDef> = {
  combat_curve_50: {
    id: 'combat_curve_50',
    name: 'Action Combat Curve (Max Lv 50)',
    algorithm: 'sqrt_xp_div_50',
    maxLevel: 50,
  },
  standard_curve_99: {
    id: 'standard_curve_99',
    name: 'Standard High-Ceiling Curve (Max Lv 99)',
    algorithm: 'osrs_table',
    maxLevel: 99,
  },
};

/**
 * Calculates level from XP for a given XP curve definition.
 */
export function calculateLevelFromXp(xp: number, curveId: string = 'standard_curve_99'): number {
  const curve = CANONICAL_XP_CURVES[curveId] || CANONICAL_XP_CURVES.standard_curve_99;
  const safeXp = Math.max(0, xp);

  if (curve.algorithm === 'sqrt_xp_div_50') {
    const lvl = Math.floor(Math.sqrt(safeXp / 50)) + 1;
    return Math.min(curve.maxLevel, Math.max(1, lvl));
  }

  // OSRS-style exponential curve
  let currentLvl = 1;
  let accumulatedXp = 0;

  for (let lvl = 1; lvl < curve.maxLevel; lvl++) {
    accumulatedXp += Math.floor(lvl + 300 * Math.pow(2, lvl / 7)) / 4;
    if (safeXp < accumulatedXp) break;
    currentLvl = lvl + 1;
  }

  return Math.min(curve.maxLevel, currentLvl);
}

/**
 * Calculates XP required to reach a specific level on a given curve.
 */
export function calculateXpForLevel(targetLevel: number, curveId: string = 'standard_curve_99'): number {
  const curve = CANONICAL_XP_CURVES[curveId] || CANONICAL_XP_CURVES.standard_curve_99;
  const clampedLevel = Math.min(curve.maxLevel, Math.max(1, targetLevel));

  if (clampedLevel <= 1) return 0;

  if (curve.algorithm === 'sqrt_xp_div_50') {
    const rawLvl = clampedLevel - 1;
    return rawLvl * rawLvl * 50;
  }

  let totalXp = 0;
  for (let i = 1; i < clampedLevel; i++) {
    totalXp += Math.floor(i + 300 * Math.pow(2, i / 7)) / 4;
  }
  return Math.floor(totalXp);
}

export const CANONICAL_SKILL_DEFINITIONS: Record<string, CanonicalSkillDef> = {
  // COMBAT (9)
  attack: { id: 'attack', name: 'Attack', category: 'combat', description: 'Melee weapon accuracy and weapon equipment tiers.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Sword', themeColor: '#ef4444', tags: ['combat', 'melee'], isActive: true },
  strength: { id: 'strength', name: 'Strength', category: 'combat', description: 'Melee damage power and heavy weapon masteries.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Dumbbell', themeColor: '#f97316', tags: ['combat', 'melee'], isActive: true },
  defence: { id: 'defence', name: 'Defence', category: 'combat', description: 'Damage mitigation, parry chance, and plate armor tiers.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Shield', themeColor: '#3b82f6', tags: ['combat', 'armor'], isActive: true },
  hitpoints: { id: 'hitpoints', name: 'Hitpoints', category: 'combat', description: 'Maximum health vitality and health regeneration.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Heart', themeColor: '#ec4899', tags: ['combat', 'vitality'], isActive: true },
  ranged: { id: 'ranged', name: 'Ranged', category: 'combat', description: 'Archery, crossbows, and critical marksmanship.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Crosshair', themeColor: '#84cc16', tags: ['combat', 'distance'], isActive: true },
  agility: { id: 'agility', name: 'Agility', category: 'combat', description: 'Sprint stamina recovery, roll evasion, and terrain shortcuts.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Wind', themeColor: '#06b6d4', tags: ['combat', 'mobility'], isActive: true },
  perception: { id: 'perception', name: 'Perception', category: 'combat', description: 'Critical hit rates, stealth detection, and weakpoint scanning.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Eye', themeColor: '#a855f7', tags: ['combat', 'utility'], isActive: true },
  wisdom: { id: 'wisdom', name: 'Wisdom', category: 'combat', description: 'Restorative mana healing, blessing magnitude, and shields.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'BookOpen', themeColor: '#eab308', tags: ['combat', 'healing'], isActive: true },
  intelligence: { id: 'intelligence', name: 'Intelligence', category: 'combat', description: 'Arcane spell damage, cast cadence, and artifact focus.', xpCurveId: 'combat_curve_50', maxLevel: 50, iconName: 'Cpu', themeColor: '#6366f1', tags: ['combat', 'magic'], isActive: true },

  // GATHERING (5)
  farming: { id: 'farming', name: 'Farming', category: 'gathering', description: 'Herb, vegetable, and crop plot cultivation.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Sprout', themeColor: '#22c55e', tags: ['gathering', 'crops'], isActive: true },
  fishing: { id: 'fishing', name: 'Fishing', category: 'gathering', description: 'Overworld node angling and deep-sea harpooning.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Fish', themeColor: '#0ea5e9', tags: ['gathering', 'water'], isActive: true },
  hunter: { id: 'hunter', name: 'Hunter', category: 'gathering', description: 'Tracking, trapping, and harvesting ambient wildlife.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Target', themeColor: '#eab308', tags: ['gathering', 'trapping'], isActive: true },
  mining: { id: 'mining', name: 'Mining', category: 'gathering', description: 'Extracting precious ores and gemstone geodes.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Pickaxe', themeColor: '#64748b', tags: ['gathering', 'ores'], isActive: true },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', category: 'gathering', description: 'Lumber harvesting and ancient tree felling.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Axe', themeColor: '#854d0e', tags: ['gathering', 'wood'], isActive: true },

  // ARTISAN (8)
  construction: { id: 'construction', name: 'Construction', category: 'artisan', description: 'Building player estates, furniture, and sanctuary rooms.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Home', themeColor: '#d97706', tags: ['artisan', 'building'], isActive: true },
  cooking: { id: 'cooking', name: 'Cooking', category: 'artisan', description: 'Preparing restorative foods, gourmet meals, and banquets.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'UtensilsCrossed', themeColor: '#ea580c', tags: ['artisan', 'food'], isActive: true },
  crafting: { id: 'crafting', name: 'Crafting', category: 'artisan', description: 'Leather armor tailoring, jewelry cutting, and soul film.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Hammer', themeColor: '#ca8a04', tags: ['artisan', 'gear'], isActive: true },
  firemaking: { id: 'firemaking', name: 'Firemaking', category: 'artisan', description: 'Bonfire creation, camp warmth bonuses, and beacon pyres.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Flame', themeColor: '#dc2626', tags: ['artisan', 'fire'], isActive: true },
  fletching: { id: 'fletching', name: 'Fletching', category: 'artisan', description: 'Carving bows, crafting arrows, and dart enchanting.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Feather', themeColor: '#65a30d', tags: ['artisan', 'archery'], isActive: true },
  herblore: { id: 'herblore', name: 'Herblore', category: 'artisan', description: 'Brewing potions, elixirs, and combat tinctures.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'FlaskConical', themeColor: '#16a34a', tags: ['artisan', 'alchemy'], isActive: true },
  runecrafting: { id: 'runecrafting', name: 'Runecrafting', category: 'artisan', description: 'Binding rune essence at cosmic altars into spell runes.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Sparkle', themeColor: '#7c3aed', tags: ['artisan', 'magic'], isActive: true },
  smithing: { id: 'smithing', name: 'Smithing', category: 'artisan', description: 'Smelting metal ores and forging weapons & armor.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Anvil', themeColor: '#475569', tags: ['artisan', 'metal'], isActive: true },

  // SUPPORT (5)
  thieving: { id: 'thieving', name: 'Thieving', category: 'support', description: 'Pickpocketing NPCs, lockpicking chests, and stealth.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Key', themeColor: '#4b5563', tags: ['support', 'stealth'], isActive: true },
  summoning: { id: 'summoning', name: 'Summoning', category: 'support', description: 'Binding spirit charms and summoning creature companions.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Sparkles', themeColor: '#9333ea', tags: ['support', 'creatures'], isActive: true },
  magic: { id: 'magic', name: 'Magic', category: 'support', description: 'Teleportation spells, utility curses, and elemental casting.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Wand2', themeColor: '#3b82f6', tags: ['support', 'magic'], isActive: true },
  prayer: { id: 'prayer', name: 'Prayer', category: 'support', description: 'Invoking divine auras, holy shields, and blessings.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Sun', themeColor: '#eab308', tags: ['support', 'holy'], isActive: true },
  necromancy: { id: 'necromancy', name: 'Necromancy', category: 'support', description: 'Reaping lost souls, binding thralls, and death magic.', xpCurveId: 'standard_curve_99', maxLevel: 99, iconName: 'Skull', themeColor: '#6b7280', tags: ['support', 'dark'], isActive: true },
};

export function getCanonicalSkillDef(id: string): CanonicalSkillDef | undefined {
  return CANONICAL_SKILL_DEFINITIONS[id.toLowerCase()];
}

export function getAllCanonicalSkillDefs(): CanonicalSkillDef[] {
  return Object.values(CANONICAL_SKILL_DEFINITIONS);
}
