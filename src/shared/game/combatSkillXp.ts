/**
 * Map RT combat abilities → combat skill typing XP grants.
 * Skills are not class-gated — anyone can train any typing.
 */

import type { CombatAbility } from "./combatAbilities";

export type SkillXpGrant = { skillSlug: string; amount: number };

/** Base XP for a successful damaging hit (scaled by crit). */
export const COMBAT_HIT_BASE_XP = 8;
export const COMBAT_CRIT_BONUS_XP = 4;
export const COMBAT_UTILITY_XP = 5;
export const COMBAT_DAMAGE_TAKEN_XP = 4;
export const TB_VICTORY_SUMMONING_XP = 25;
export const TB_CAPTURE_SUMMONING_XP = 40;
export const TB_VICTORY_HITPOINTS_XP = 10;

const ABILITY_SKILL_MAP: Record<string, SkillXpGrant[]> = {
  strike: [
    { skillSlug: "attack", amount: COMBAT_HIT_BASE_XP },
    { skillSlug: "strength", amount: Math.floor(COMBAT_HIT_BASE_XP * 0.6) },
  ],
  cleave: [
    { skillSlug: "attack", amount: COMBAT_HIT_BASE_XP },
    { skillSlug: "strength", amount: COMBAT_HIT_BASE_XP },
  ],
  dash: [{ skillSlug: "agility", amount: COMBAT_UTILITY_XP }],
  shout: [{ skillSlug: "strength", amount: COMBAT_UTILITY_XP }],
  fireball: [
    { skillSlug: "intelligence", amount: COMBAT_HIT_BASE_XP },
    { skillSlug: "wisdom", amount: Math.floor(COMBAT_HIT_BASE_XP * 0.4) },
  ],
  frost: [
    { skillSlug: "intelligence", amount: COMBAT_HIT_BASE_XP },
    { skillSlug: "wisdom", amount: Math.floor(COMBAT_HIT_BASE_XP * 0.7) },
  ],
  blink: [{ skillSlug: "agility", amount: COMBAT_UTILITY_XP }],
  shield: [
    { skillSlug: "wisdom", amount: COMBAT_UTILITY_XP },
    { skillSlug: "defence", amount: Math.floor(COMBAT_UTILITY_XP * 0.5) },
  ],
  shoot: [
    { skillSlug: "ranged", amount: COMBAT_HIT_BASE_XP },
    { skillSlug: "perception", amount: Math.floor(COMBAT_HIT_BASE_XP * 0.5) },
  ],
  multishot: [
    { skillSlug: "ranged", amount: COMBAT_HIT_BASE_XP + 2 },
    { skillSlug: "perception", amount: Math.floor(COMBAT_HIT_BASE_XP * 0.6) },
  ],
  trap: [{ skillSlug: "perception", amount: COMBAT_UTILITY_XP }],
  heal: [{ skillSlug: "wisdom", amount: COMBAT_UTILITY_XP + 2 }],
};

export function grantsForAbilityCast(
  ability: Pick<CombatAbility, "id" | "category" | "power">,
  opts: { isCrit?: boolean; isMiss?: boolean; isUtilityOnly?: boolean } = {}
): SkillXpGrant[] {
  if (opts.isMiss) return [];

  const mapped = ABILITY_SKILL_MAP[ability.id];
  if (mapped) {
    if (opts.isCrit) {
      return mapped.map((g) => ({
        skillSlug: g.skillSlug,
        amount: g.amount + (ability.power > 0 ? COMBAT_CRIT_BONUS_XP : 0),
      }));
    }
    return mapped.map((g) => ({ ...g }));
  }

  // Fallback by category
  if (ability.power <= 0 || opts.isUtilityOnly) {
    if (ability.category === "heal") return [{ skillSlug: "wisdom", amount: COMBAT_UTILITY_XP }];
    if (ability.category === "buff") return [{ skillSlug: "wisdom", amount: COMBAT_UTILITY_XP }];
    return [{ skillSlug: "agility", amount: COMBAT_UTILITY_XP }];
  }
  if (ability.category === "special") {
    return [{ skillSlug: "intelligence", amount: COMBAT_HIT_BASE_XP }];
  }
  // Long-range physical ≈ ranged
  return [{ skillSlug: "attack", amount: COMBAT_HIT_BASE_XP }];
}

export function grantsForDamageTaken(damage: number): SkillXpGrant[] {
  if (damage <= 0) return [];
  const scale = Math.min(3, Math.max(1, Math.floor(damage / 20)));
  return [
    { skillSlug: "defence", amount: COMBAT_DAMAGE_TAKEN_XP * scale },
    { skillSlug: "hitpoints", amount: Math.floor(COMBAT_DAMAGE_TAKEN_XP * 0.75 * scale) },
  ];
}

export function grantsForTurnBattle(result: "WIN" | "CAPTURE" | "LOSE" | "FLEE" | string): SkillXpGrant[] {
  if (result === "WIN") {
    return [
      { skillSlug: "summoning", amount: TB_VICTORY_SUMMONING_XP },
      { skillSlug: "hitpoints", amount: TB_VICTORY_HITPOINTS_XP },
    ];
  }
  if (result === "CAPTURE") {
    return [
      { skillSlug: "summoning", amount: TB_CAPTURE_SUMMONING_XP },
      { skillSlug: "perception", amount: 8 },
    ];
  }
  return [];
}
