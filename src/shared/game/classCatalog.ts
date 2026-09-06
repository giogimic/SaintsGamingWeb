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
   * World profile id (saints / custom_1 / custom_2).
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



export const DEFAULT_PLAYABLE_CLASSES: ClassDefData[] = [
  {
    slug: "warrior",
    classId: "WARRIOR",
    name: "Warrior",
    description: "Frontline melee master with high physical defense and vitality.",
    icon: "Swords",
    color: "#f87171",
    profileId: null,
    statDeltas: { hp: 30, atk: 15, def: 15, spd: 0, ratk: -10, rdef: 5 },
    skillDeltas: { attack: 4, strength: 4, defence: 3, hitpoints: 5 },
    growthRates: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.1, ratk: 0.9, rdef: 1.1 },
    allowedSpriteTags: ["hero", "player", "warrior"],
    spriteFilters: {},
    startingEquipment: ["bronze_sword", "bronze_shield", "bronze_chestplate"],
    perks: ["SWIFT_TRAVELER"],
    abilities: ["meteor_fang", "forged_wrath", "icebreaker"],
    isPlayable: true,
    sortOrder: 1,
  },
  {
    slug: "mage",
    classId: "MAGE",
    name: "Mage",
    description: "Master of elemental and arcane magic with devastating area damage.",
    icon: "Wand2",
    color: "#a78bfa",
    profileId: null,
    statDeltas: { hp: -10, atk: -10, def: -5, spd: 5, ratk: 25, rdef: 15 },
    skillDeltas: { intelligence: 6, wisdom: 4, perception: 2 },
    growthRates: { hp: 1.0, atk: 0.9, def: 0.9, spd: 1.2, ratk: 1.5, rdef: 1.3 },
    allowedSpriteTags: ["hero", "player", "mage"],
    spriteFilters: {},
    startingEquipment: ["wooden_staff", "apprentice_robe"],
    perks: ["STAMINA_SURGE"],
    abilities: ["firestorm", "blizzard", "ion_beam"],
    isPlayable: true,
    sortOrder: 2,
  },
  {
    slug: "ranger",
    classId: "RANGER",
    name: "Ranger",
    description: "Agile ranged marksman with keen precision and rapid movement.",
    icon: "Compass",
    color: "#fbbf24",
    profileId: null,
    statDeltas: { hp: 10, atk: 10, def: 0, spd: 20, ratk: 15, rdef: 0 },
    skillDeltas: { ranged: 5, agility: 5, perception: 3 },
    growthRates: { hp: 1.2, atk: 1.2, def: 1.1, spd: 1.4, ratk: 1.3, rdef: 1.0 },
    allowedSpriteTags: ["hero", "player", "ranger"],
    spriteFilters: {},
    startingEquipment: ["shortbow", "leather_tunic", "wooden_arrows"],
    perks: ["ACROBAT"],
    abilities: ["spore_cyclone", "magma_slide", "bramble_gear"],
    isPlayable: true,
    sortOrder: 3,
  },
  {
    slug: "paladin",
    classId: "PALADIN",
    name: "Paladin",
    description: "Holy guardian blending stalwart defense with radiant smites.",
    icon: "Shield",
    color: "#60a5fa",
    profileId: null,
    statDeltas: { hp: 25, atk: 10, def: 20, spd: -5, ratk: 5, rdef: 15 },
    skillDeltas: { defence: 5, strength: 3, wisdom: 4, hitpoints: 4 },
    growthRates: { hp: 1.35, atk: 1.2, def: 1.35, spd: 1.0, ratk: 1.1, rdef: 1.3 },
    allowedSpriteTags: ["hero", "player", "paladin"],
    spriteFilters: {},
    startingEquipment: ["mace", "kite_shield", "chainmail"],
    perks: ["PACK_MULE"],
    abilities: ["holy_smite", "crystal_shield", "radiant_phoenix"],
    isPlayable: true,
    sortOrder: 4,
  },
  {
    slug: "priest",
    classId: "PRIEST",
    name: "Priest",
    description: "Devout channeler of restorative power and divine boons.",
    icon: "Heart",
    color: "#34d399",
    profileId: null,
    statDeltas: { hp: 5, atk: -5, def: 5, spd: 5, ratk: 15, rdef: 20 },
    skillDeltas: { wisdom: 6, intelligence: 3, hitpoints: 3 },
    growthRates: { hp: 1.15, atk: 0.9, def: 1.1, spd: 1.15, ratk: 1.3, rdef: 1.4 },
    allowedSpriteTags: ["hero", "player", "priest"],
    spriteFilters: {},
    startingEquipment: ["holy_symbol", "cleric_robe"],
    perks: ["MASTER_TAMER"],
    abilities: ["sylvan_song", "blessing_dew", "crystal_bloom"],
    isPlayable: true,
    sortOrder: 5,
  },
];

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
