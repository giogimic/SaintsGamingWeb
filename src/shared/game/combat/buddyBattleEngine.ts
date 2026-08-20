/**
 * Saints Gaming — Turn-Based Buddy Battle Calculation Engine (Bible 07 & Bible 11)
 * Calculates authoritative turn-based move damage, elemental multipliers, and capture probability.
 */

import { ElementType, getCombatMultiplier } from './typeChartEngine';
import { getCaptureItemModifier } from '../captureItems';

export interface BattleCombatantStats {
  level: number;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  element: ElementType;
  status?: 'burn' | 'freeze' | 'paralysis' | 'sleep' | null;
}

export interface BattleMove {
  id: string;
  name: string;
  power: number; // e.g. 40, 60, 90
  accuracy: number; // 0 to 100
  element: ElementType;
  isSpecial?: boolean;
}

export interface DamageCalculationResult {
  damage: number;
  isCritical: boolean;
  typeMultiplier: number;
  stabBonus: boolean;
  weatherMultiplier: number;
  finalEffectiveness: 'super_effective' | 'not_very_effective' | 'neutral';
}

/**
 * Calculates authoritative move damage in a Turn-Based Buddy Battle.
 */
export function calculateMoveDamage(
  move: BattleMove,
  attacker: BattleCombatantStats,
  defender: BattleCombatantStats,
  weatherMultiplier: number = 1.0,
  forceCritical?: boolean
): DamageCalculationResult {
  // 1. Base Damage Formula
  const levelFactor = (2 * attacker.level) / 5 + 2;
  const statRatio = attacker.attack / Math.max(1, defender.defense);
  const baseDamage = ((levelFactor * move.power * statRatio) / 50) + 2;

  // 2. STAB (Same-Type Attack Bonus) - 1.25x
  const stabBonus = attacker.element !== 'None' && attacker.element === move.element;
  const stabMultiplier = stabBonus ? 1.25 : 1.0;

  // 3. Type Effectiveness Multiplier
  const typeMultiplier = getCombatMultiplier(move.element, defender.element);

  // 4. Critical Hit
  const isCritical = forceCritical !== undefined ? forceCritical : false;
  const critMultiplier = isCritical ? 1.5 : 1.0;

  // 5. Composite Final Damage
  const total = baseDamage * stabMultiplier * typeMultiplier * critMultiplier * weatherMultiplier;
  const finalDamage = Math.max(1, Math.floor(total));

  let finalEffectiveness: 'super_effective' | 'not_very_effective' | 'neutral' = 'neutral';
  if (typeMultiplier > 1.0) finalEffectiveness = 'super_effective';
  else if (typeMultiplier < 1.0) finalEffectiveness = 'not_very_effective';

  return {
    damage: finalDamage,
    isCritical,
    typeMultiplier,
    stabBonus,
    weatherMultiplier,
    finalEffectiveness,
  };
}

/**
 * Calculates capture success chance in a Turn-Based Buddy Battle (Bible 07 §4 & Bible 11).
 * Formula: (((3 * maxHp - 2 * currentHp) * baseCatchRate * ballModifier) / (3 * maxHp)) * statusBonus
 */
export function calculateCatchProbability(
  target: BattleCombatantStats,
  baseCatchRate: number = 120, // 0 to 255 (higher = easier)
  filmItemId?: string
): { probability: number; isGuaranteed: boolean } {
  const filmMultiplier = getCaptureItemModifier(filmItemId) ?? 1;

  // Master film (film_soul / perfect_crystal = 255)
  if (filmMultiplier >= 255) {
    return { probability: 1.0, isGuaranteed: true };
  }

  const maxHp = Math.max(1, target.maxHp);
  const currentHp = Math.max(1, target.currentHp);

  let statusBonus = 1.0;
  if (target.status === 'freeze' || target.status === 'sleep') statusBonus = 2.0;
  else if (target.status === 'paralysis' || target.status === 'burn') statusBonus = 1.5;

  const hpFactor = ((3 * maxHp - 2 * currentHp) * baseCatchRate * filmMultiplier) / (3 * maxHp);
  const modifiedRate = (hpFactor * statusBonus) / 255;

  const probability = Math.min(1.0, Math.max(0.01, modifiedRate));

  return {
    probability,
    isGuaranteed: probability >= 1.0,
  };
}
