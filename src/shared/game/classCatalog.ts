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
