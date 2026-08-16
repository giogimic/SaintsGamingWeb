/**
 * Saints Hero Battles — D20 Combat Resolution Engine
 *
 * Implements tabletop-inspired combat resolution for Player vs Monster battles:
 *  - Armor Class (AC) and Attack Rolls (d20 + Atk Mod vs AC)
 *  - Elemental Saving Throws (Spell Save DC vs 1d20 + Element Resist)
 *  - Critical Hits (Nat 20) and Fumbles (Nat 1)
 *  - Inspiration Die (Soul Surge bonus die based on level)
 */

import { rollD20 } from "./d20Engine";

export interface HeroAttackOptions {
  attackerProficiency: number;  // +2 at low lv, +6 at high lv
  atkStatModifier: number;      // derived from ATK stat
  weaponBonus?: number;         // item weapon bonus
  targetAC: number;             // Defender's Armor Class
  isAdvantage?: boolean;
  isDisadvantage?: boolean;
  rng?: () => number;
}

export interface HeroAttackResult {
  hit: boolean;
  roll: number;
  totalRoll: number;
  targetAC: number;
  isCrit: boolean;
  isFumble: boolean;
  summary: string;
}

/** Compute player or monster Armor Class (AC) */
export function computeArmorClass(opts: {
  baseDefense: number;
  agilityModifier?: number;
  equippedArmorBonus?: number;
}): number {
  const agility = Math.max(-2, Math.min(5, Math.floor((opts.agilityModifier ?? 0) / 4)));
  const armor = Math.max(0, opts.equippedArmorBonus ?? 0);
  const defBonus = Math.floor(Math.max(0, opts.baseDefense) / 10);
  return 10 + armor + agility + defBonus;
}

/** Roll an attack check in Hero Battles */
export function rollHeroAttack(opts: HeroAttackOptions): HeroAttackResult {
  const rng = opts.rng || Math.random;
  let roll = rollD20(rng);

  if (opts.isAdvantage && !opts.isDisadvantage) {
    const r2 = rollD20(rng);
    roll = Math.max(roll, r2);
  } else if (opts.isDisadvantage && !opts.isAdvantage) {
    const r2 = rollD20(rng);
    roll = Math.min(roll, r2);
  }

  const isCrit = roll === 20;
  const isFumble = roll === 1;
  const modifier = opts.attackerProficiency + opts.atkStatModifier + (opts.weaponBonus || 0);
  const totalRoll = roll + modifier;
  const hit = isCrit ? true : isFumble ? false : totalRoll >= opts.targetAC;

  let summary: string;
  if (isCrit) {
    summary = `CRITICAL HIT (Nat 20)! Devastating blow dealing double damage!`;
  } else if (isFumble) {
    summary = `CRITICAL MISS (Nat 1)! The strike missed completely!`;
  } else if (hit) {
    summary = `HIT! Rolled ${roll} + ${modifier} (${totalRoll}) vs AC ${opts.targetAC}.`;
  } else {
    summary = `MISSED! Rolled ${roll} + ${modifier} (${totalRoll}) vs AC ${opts.targetAC}.`;
  }

  return {
    hit,
    roll,
    totalRoll,
    targetAC: opts.targetAC,
    isCrit,
    isFumble,
    summary,
  };
}

/** Elemental Ability Save (Spell DC vs Defender's Saving Throw) */
export function rollElementalSave(opts: {
  casterAbilityPower: number;
  casterProficiency: number;
  defenderElementalResist: number;
  rng?: () => number;
}): {
  saved: boolean;
  spellDC: number;
  saveRoll: number;
  saveTotal: number;
  halfDamage: boolean;
  summary: string;
} {
  const rng = opts.rng || Math.random;
  const spellDC = 8 + opts.casterProficiency + Math.floor(opts.casterAbilityPower / 10);
  const saveRoll = rollD20(rng);
  const saveTotal = saveRoll + Math.floor(opts.defenderElementalResist / 10);
  const saved = saveRoll === 20 ? true : saveRoll === 1 ? false : saveTotal >= spellDC;

  return {
    saved,
    spellDC,
    saveRoll,
    saveTotal,
    halfDamage: saved,
    summary: saved
      ? `SAVED! Rolled ${saveRoll} vs Spell DC ${spellDC}. Reduced damage!`
      : `FAILED SAVE! Rolled ${saveRoll} vs Spell DC ${spellDC}. Full effect!`,
  };
}

/** Soul Inspiration Die based on hero level */
export function rollInspirationDie(heroLevel: number, rng: () => number = Math.random): number {
  let sides = 4; // 1d4
  if (heroLevel >= 90) sides = 10;      // 1d10
  else if (heroLevel >= 60) sides = 8;  // 1d8
  else if (heroLevel >= 30) sides = 6;  // 1d6
  return Math.floor(rng() * sides) + 1;
}
