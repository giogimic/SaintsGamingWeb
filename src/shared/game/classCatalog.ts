/**
 * Playable classes — shared base stats + per-class skill/stat deltas.
 * Skills are not class-locked; deltas only change starting levels.
 */

import {
  CombatSkillTyping,
  buildInitialSkills,
  type SkillData,
} from "./skillTypings";

export const PLAYABLE_CLASS_IDS = [
  "WARRIOR",
  "MAGE",
  "THIEF",
  "RANGER",
  "PRIEST",
] as const;

export type PlayableClassId = (typeof PLAYABLE_CLASS_IDS)[number];

export const DEFAULT_GAME_CONFIG_SLUG = "saints";

/** Shared combat sheet before class deltas. */
export const SHARED_BASE_STATS = {
  hp: 100,
  atk: 50,
  def: 45,
  spd: 50,
  ratk: 45,
  rdef: 45,
} as const;

export type ClassStatBlock = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  ratk: number;
  rdef: number;
};

export type ClassDefData = {
  slug: string;
  /** Canonical id used by StarterHero / GameCharacter (WARRIOR, …). */
  classId: PlayableClassId | string;
  name: string;
  description: string;
  icon?: string | null;
  color: string;
  /**
   * World profile id (tuxemon / custom_1 / custom_2).
   * null/empty = shared across all Studio profiles.
   * Not the GameConfig FK — that stays on the DB `gameId` column.
   */
  profileId?: string | null;
  /** Additive deltas on SHARED_BASE_STATS. */
  statDeltas: Partial<ClassStatBlock>;
  /** Additive deltas on combat skill starting levels (from 1). */
  skillDeltas: Partial<Record<CombatSkillTyping, number>>;
  growthRates: Record<string, number>;
  allowedSpriteTags: string[];
  spriteFilters: Record<string, string[]>;
  startingEquipment: string[];
  perks: string[];
  abilities: string[];
  /** Canonical ability IDs learnable by this class (Bible 25 §3.5) */
  learnableAbilityIds?: string[];
  /** Default combat style archetype */
  combatStyleDefault?: 'MELEE' | 'MAGIC' | 'RANGED' | 'SUPPORT' | 'TECH';
  isPlayable: boolean;
  sortOrder: number;
};

export function resolveClassStats(def: ClassDefData): ClassStatBlock {
  return {
    hp: SHARED_BASE_STATS.hp + (def.statDeltas.hp || 0),
    atk: SHARED_BASE_STATS.atk + (def.statDeltas.atk || 0),
    def: SHARED_BASE_STATS.def + (def.statDeltas.def || 0),
    spd: SHARED_BASE_STATS.spd + (def.statDeltas.spd || 0),
    ratk: SHARED_BASE_STATS.ratk + (def.statDeltas.ratk || 0),
    rdef: SHARED_BASE_STATS.rdef + (def.statDeltas.rdef || 0),
  };
}

export function resolveStartingSkills(def: ClassDefData): Record<string, SkillData> {
  return buildInitialSkills(def.skillDeltas as Record<string, number>);
}

export const FALLBACK_CLASS_DEFS: ClassDefData[] = [
  {
    slug: "warrior",
    classId: "WARRIOR",
    name: "Warrior",
    description: "Frontline fighter. Higher attack, strength, and vitality; slightly less agile.",
    icon: "swords",
    color: "#f87171",
    statDeltas: { hp: 20, atk: 12, def: 8, spd: -5, ratk: -5, rdef: 0 },
    skillDeltas: { attack: 14, strength: 9, hitpoints: 4, agility: -2 },
    growthRates: { hp: 1.5, atk: 1.4, def: 1.3, spd: 1.1, ratk: 1.0, rdef: 1.2 },
    allowedSpriteTags: ["hero", "player", "warrior", "melee"],
    spriteFilters: {},
    startingEquipment: ["bronze_sword", "patch_kit"],
    perks: ["STAMINA_SURGE"],
    abilities: ["strike", "guard"],
    isPlayable: true,
    sortOrder: 1,
  },
  {
    slug: "mage",
    classId: "MAGE",
    name: "Mage",
    description: "Arcane caster. Strong intellect and wisdom; softer body and defence.",
    icon: "wand",
    color: "#60a5fa",
    statDeltas: { hp: -10, atk: -8, def: -8, spd: 0, ratk: 10, rdef: 5 },
    skillDeltas: { intelligence: 14, wisdom: 9, defence: -3, hitpoints: -2 },
    growthRates: { hp: 1.2, atk: 1.0, def: 1.0, spd: 1.2, ratk: 1.5, rdef: 1.3 },
    allowedSpriteTags: ["hero", "player", "mage", "caster"],
    spriteFilters: {},
    startingEquipment: ["apprentice_staff", "patch_kit"],
    perks: [],
    abilities: ["fireball", "arcane_bolt"],
    isPlayable: true,
    sortOrder: 2,
  },
  {
    slug: "thief",
    classId: "THIEF",
    name: "Thief",
    description: "Skirmisher. High agility and perception; lighter armour.",
    icon: "feather",
    color: "#34d399",
    statDeltas: { hp: 0, atk: 6, def: -8, spd: 15, ratk: 4, rdef: -5 },
    skillDeltas: { agility: 12, perception: 8, attack: 5, defence: -4 },
    growthRates: { hp: 1.25, atk: 1.25, def: 1.05, spd: 1.55, ratk: 1.2, rdef: 1.05 },
    allowedSpriteTags: ["hero", "player", "thief", "rogue"],
    spriteFilters: {},
    startingEquipment: ["iron_dagger", "patch_kit"],
    perks: ["ACROBAT"],
    abilities: ["strike", "vanish"],
    isPlayable: true,
    sortOrder: 3,
  },
  {
    slug: "ranger",
    classId: "RANGER",
    name: "Ranger",
    description: "Ranged scout. Strong ranged and agility; a little less defence.",
    icon: "bow",
    color: "#fbbf24",
    statDeltas: { hp: 0, atk: -4, def: -6, spd: 10, ratk: 14, rdef: 0 },
    skillDeltas: { ranged: 14, agility: 8, perception: 6, defence: -3 },
    growthRates: { hp: 1.3, atk: 1.1, def: 1.05, spd: 1.45, ratk: 1.5, rdef: 1.15 },
    allowedSpriteTags: ["hero", "player", "ranger", "archer"],
    spriteFilters: {},
    startingEquipment: ["shortbow", "patch_kit"],
    perks: ["SWIFT_TRAVELER"],
    abilities: ["shoot", "mark"],
    isPlayable: true,
    sortOrder: 4,
  },
  {
    slug: "priest",
    classId: "PRIEST",
    name: "Priest",
    description: "Support healer. Wisdom and intellect with solid vitality; less raw attack.",
    icon: "heart",
    color: "#e2d5b3",
    statDeltas: { hp: 15, atk: -10, def: 4, spd: 0, ratk: 6, rdef: 8 },
    skillDeltas: { wisdom: 14, intelligence: 8, hitpoints: 5, attack: -4, strength: -3 },
    growthRates: { hp: 1.45, atk: 1.0, def: 1.25, spd: 1.15, ratk: 1.3, rdef: 1.4 },
    allowedSpriteTags: ["hero", "player", "priest", "healer", "cleric"],
    spriteFilters: {},
    startingEquipment: ["oak_wand", "patch_kit"],
    perks: ["PACK_MULE"],
    abilities: ["heal", "smite"],
    isPlayable: true,
    sortOrder: 5,
  },
];

export function getFallbackClass(classIdOrSlug: string): ClassDefData | undefined {
  const key = classIdOrSlug.toUpperCase();
  return (
    FALLBACK_CLASS_DEFS.find((c) => c.classId === key) ||
    FALLBACK_CLASS_DEFS.find((c) => c.slug === classIdOrSlug.toLowerCase())
  );
}

export function listPlayableFallbackClasses(): ClassDefData[] {
  return FALLBACK_CLASS_DEFS.filter((c) => c.isPlayable).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function emptyClassDef(): ClassDefData {
  return {
    slug: "",
    classId: "WARRIOR",
    name: "",
    description: "",
    icon: null,
    color: "#cbb26a",
    profileId: null,
    statDeltas: {},
    skillDeltas: {},
    growthRates: { hp: 1.3, atk: 1.2, def: 1.2, spd: 1.2, ratk: 1.2, rdef: 1.2 },
    allowedSpriteTags: ["hero", "player"],
    spriteFilters: {},
    startingEquipment: [],
    perks: [],
    abilities: [],
    isPlayable: true,
    sortOrder: 0,
  };
}

/** Default global shiny chance percent (0–100). */
export const DEFAULT_GLOBAL_SHINY_CHANCE_PERCENT = 0.5;
