/**
 * Saints d20 Resolution & Capture Engine
 *
 * Implements a tabletop-inspired D20 check system for companion capture and
 * skill interactions, replacing legacy 255-scale formulas with clean, transparent
 * d20 + modifiers vs Difficulty Class (DC) rolls.
 *
 * Rules:
 *  - Creature combat (Saints Buddy Battles) remains classic turn-based move execution.
 *  - Capture Resolution uses d20 Tamer Skill Check vs Creature Willpower DC.
 *  - Nat 20 = Critical Resonance (Guaranteed capture + bonus aptitude).
 *  - Nat 1  = Critical Fumble (Capture fails + creature enrages).
 */

export type CreatureRarityTier = 'common' | 'uncommon' | 'rare' | 'elite' | 'mythic' | 'ancient';

export type CaptureToolTier = 'basic' | 'chroma' | 'master' | 'soul_prism';

export type CreatureStatusCondition = 'none' | 'restrained' | 'stunned' | 'asleep' | 'weakened';

export interface CaptureAttemptOptions {
  /** Beast current HP */
  currentHp: number;
  /** Beast Max HP */
  maxHp: number;
  /** Species rarity tier */
  rarityTier?: CreatureRarityTier;
  /** Explicit DC override if provided by creature definition */
  willpowerDCOverride?: number;
  /** Player Tamer skill proficiency (1-99 from 27-skill matrix) */
  tamerSkillLevel?: number;
  /** Taming tool item tier */
  toolTier?: CaptureToolTier | string;
  /** Current status condition on target */
  statusCondition?: CreatureStatusCondition | string;
  /** Additional custom modifier */
  customModifier?: number;
  /** RNG provider for deterministic testing */
  rng?: () => number;
}

export interface CaptureResult {
  success: boolean;
  d20Roll: number;
  secondRoll?: number;
  hadAdvantage: boolean;
  totalModifier: number;
  totalRoll: number;
  targetDC: number;
  isNat20: boolean;
  isNat1: boolean;
  breakdown: {
    baseDC: number;
    tamerBonus: number;
    toolBonus: number;
    hpBonus: number;
    statusBonus: number;
    customBonus: number;
  };
  summary: string;
}

/** Roll a standard 1d20 (integer between 1 and 20 inclusive) */
export function rollD20(rng: () => number = Math.random): number {
  return Math.floor(rng() * 20) + 1;
}

/** Roll 2d20 and return the advantage (higher) or disadvantage (lower) result */
export function rollD20Advantage(
  advantage: boolean,
  rng: () => number = Math.random
): { roll: number; discarded: number; isAdvantage: boolean } {
  const r1 = rollD20(rng);
  const r2 = rollD20(rng);
  const roll = advantage ? Math.max(r1, r2) : Math.min(r1, r2);
  const discarded = advantage ? Math.min(r1, r2) : Math.max(r1, r2);
  return { roll, discarded, isAdvantage: advantage };
}

/** Base Willpower DC based on species rarity */
export function getCreatureWillpowerDC(rarityTier: CreatureRarityTier = 'common'): number {
  switch (rarityTier) {
    case 'ancient':
      return 24;
    case 'mythic':
      return 21;
    case 'elite':
      return 18;
    case 'rare':
      return 15;
    case 'uncommon':
      return 12;
    case 'common':
    default:
      return 10;
  }
}

/** Tool bonus to capture roll */
export function getToolTierBonus(toolTier: CaptureToolTier | string = 'basic'): number {
  const t = String(toolTier).toLowerCase();
  if (t.includes('prism') || t.includes('soul') || t === 'master') return 4;
  if (t.includes('chroma') || t.includes('hyper') || t.includes('great')) return 2;
  return 0; // basic film
}

/** Calculate all capture modifiers */
export function getCaptureModifiers(opts: {
  tamerSkillLevel?: number;
  toolTier?: CaptureToolTier | string;
  currentHp: number;
  maxHp: number;
  statusCondition?: CreatureStatusCondition | string;
  customModifier?: number;
}) {
  const level = Math.max(1, Math.min(99, opts.tamerSkillLevel ?? 1));
  const tamerBonus = Math.floor(level / 10); // +0 at Lv 1-9, up to +9 at Lv 90-99
  const toolBonus = getToolTierBonus(opts.toolTier);

  // HP bonus: Lower HP = higher bonus (clamped 0 to 1)
  const hpRatio = opts.maxHp > 0 ? Math.max(0, Math.min(1, opts.currentHp / opts.maxHp)) : 1;
  let hpBonus = 0;
  if (hpRatio <= 0.10) hpBonus = 6;
  else if (hpRatio <= 0.25) hpBonus = 4;
  else if (hpRatio <= 0.50) hpBonus = 2;

  // Status conditions
  const status = String(opts.statusCondition || 'none').toLowerCase();
  let statusBonus = 0;
  let hasAdvantage = false;

  if (status.includes('asleep') || status.includes('sleep') || status.includes('pacif')) {
    hasAdvantage = true;
    statusBonus = 2;
  } else if (status.includes('stun') || status.includes('paralyz')) {
    statusBonus = 4;
  } else if (status.includes('restrain') || status.includes('snare') || status.includes('bind')) {
    statusBonus = 3;
  } else if (status.includes('weak')) {
    statusBonus = 2;
  }

  const customBonus = opts.customModifier ?? 0;
  const totalModifier = tamerBonus + toolBonus + hpBonus + statusBonus + customBonus;

  return {
    tamerBonus,
    toolBonus,
    hpBonus,
    statusBonus,
    customBonus,
    totalModifier,
    hasAdvantage,
  };
}

/** Execute a full d20 Capture Check against creature DC */
export function attemptCapture(opts: CaptureAttemptOptions): CaptureResult {
  const rng = opts.rng || Math.random;
  const targetDC = opts.willpowerDCOverride ?? getCreatureWillpowerDC(opts.rarityTier);
  const mods = getCaptureModifiers(opts);

  let d20Roll: number;
  let secondRoll: number | undefined;

  if (mods.hasAdvantage) {
    const adv = rollD20Advantage(true, rng);
    d20Roll = adv.roll;
    secondRoll = adv.discarded;
  } else {
    d20Roll = rollD20(rng);
  }

  const isNat20 = d20Roll === 20;
  const isNat1 = d20Roll === 1;
  const totalRoll = d20Roll + mods.totalModifier;

  // Nat 20 is always a success; Nat 1 is always a failure
  const success = isNat20 ? true : isNat1 ? false : totalRoll >= targetDC;

  let summary: string;
  if (isNat20) {
    summary = `CRITICAL RESONANCE (Nat 20)! Soul bond forged with flawless aptitude!`;
  } else if (isNat1) {
    summary = `CRITICAL FUMBLE (Nat 1)! The beast broke free and entered an enraged frenzy!`;
  } else if (success) {
    summary = `SUCCESS! Rolled ${d20Roll} + ${mods.totalModifier} (${totalRoll}) vs DC ${targetDC}. Captured!`;
  } else {
    summary = `RESISTED! Rolled ${d20Roll} + ${mods.totalModifier} (${totalRoll}) vs DC ${targetDC}.`;
  }

  return {
    success,
    d20Roll,
    secondRoll,
    hadAdvantage: mods.hasAdvantage,
    totalModifier: mods.totalModifier,
    totalRoll,
    targetDC,
    isNat20,
    isNat1,
    breakdown: {
      baseDC: targetDC,
      tamerBonus: mods.tamerBonus,
      toolBonus: mods.toolBonus,
      hpBonus: mods.hpBonus,
      statusBonus: mods.statusBonus,
      customBonus: mods.customBonus,
    },
    summary,
  };
}
