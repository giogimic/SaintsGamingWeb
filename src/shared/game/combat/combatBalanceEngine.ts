/**
 * Saints Gaming — Canonical Combat Balancing & Simulation Engine (Bible 25 §3.7 & §3.8)
 * Provides deterministic simulation of combat DPS, Time-to-Kill (TTK), and XP-per-hour metrics.
 */

import { AbilityDef, getAbilityDef } from './abilityRegistry';
import { calculateLevelFromXp } from '../skills/skillRegistry';

export interface PlayerCombatTuning {
  id: string;
  globalDamageMul: number;
  globalCooldownMul: number;
  losRequired: boolean;
}

export interface BalanceScenario {
  id: string;
  name: string;
  playerLevel: number;
  abilityId: string;
  targetMaxHp: number;
  targetDef: number;
  iterations: number;
}

export interface BalanceReport {
  avgDamage: number;
  dps: number;
  timeToKillSec: number;
  xpPerHourEstimate: number;
  warnings: string[];
}

export const DEFAULT_PLAYER_TUNING: PlayerCombatTuning = {
  id: 'default_tuning',
  globalDamageMul: 1.0,
  globalCooldownMul: 1.0,
  losRequired: true,
};

/**
 * Runs a deterministic combat simulation scenario over N iterations.
 */
export function simulateCombatScenario(
  scenario: BalanceScenario,
  tuning: PlayerCombatTuning = DEFAULT_PLAYER_TUNING
): BalanceReport {
  const ability = getAbilityDef(scenario.abilityId);
  const warnings: string[] = [];

  if (!ability) {
    return {
      avgDamage: 0,
      dps: 0,
      timeToKillSec: 0,
      xpPerHourEstimate: 0,
      warnings: [`Ability with id "${scenario.abilityId}" not found in registry.`],
    };
  }

  const damageEffect = ability.effects.find((e) => e.type === 'damage');
  const basePower = damageEffect && 'power' in damageEffect ? damageEffect.power : 0;

  if (basePower === 0) {
    warnings.push('Simulated ability has no direct damage effect.');
  }

  // Level scaling: 2% damage boost per player level
  const levelScaling = 1 + (scenario.playerLevel - 1) * 0.02;
  // Armor mitigation: reduction based on target defense
  const armorMitigation = Math.max(0.2, 100 / (100 + scenario.targetDef));
  
  const singleHitDamage = Math.max(
    1,
    Math.round(basePower * levelScaling * armorMitigation * tuning.globalDamageMul)
  );

  const totalDamage = singleHitDamage * scenario.iterations;
  const avgDamage = totalDamage / Math.max(1, scenario.iterations);

  const cooldownSec = Math.max(0.5, (ability.cooldownMs || 1500) / 1000 * tuning.globalCooldownMul);
  const dps = Number((avgDamage / cooldownSec).toFixed(1));

  const hitsToKill = Math.ceil(scenario.targetMaxHp / Math.max(1, avgDamage));
  const timeToKillSec = Number((hitsToKill * cooldownSec).toFixed(1));

  // XP estimation: base hit XP grants multiplied by attacks per hour
  const hitsPerHour = Math.floor(3600 / cooldownSec);
  const hitXp = ability.grantsSkillXp?.reduce((sum, g) => sum + g.amount, 0) || 12;
  const xpPerHourEstimate = hitsPerHour * hitXp;

  if (dps <= 0) {
    warnings.push('DPS calculation resolved to 0.');
  }
  if (timeToKillSec > 300) {
    warnings.push('Time-to-kill exceeds 5 minutes; check monster HP/Defense tuning.');
  }

  return {
    avgDamage,
    dps,
    timeToKillSec,
    xpPerHourEstimate,
    warnings,
  };
}

export interface CombatHitResult {
  damage: number;
  isCrit: boolean;
  rawDamage?: number;
  mitigatedAmount?: number;
}

/**
 * Canonical real-time combat hit calculation (Bible 02, 07, 25 §3.7).
 * Authoritative on server, and provides visual prediction numbers on client.
 */
export function calculateCombatHitDamage(
  attackerAtk: number,
  defenderDef: number,
  basePower = 10,
  multiplier = 1,
  varianceSeed?: number
): CombatHitResult {
  const isCrit = Math.random() < 0.15;
  const effectiveAtk = isCrit ? attackerAtk * 1.5 : attackerAtk;
  const defReduction = defenderDef / (defenderDef + 50); // standard diminishing returns
  const rawDamage = (effectiveAtk * 0.5 + basePower) * (1 - defReduction) * multiplier;
  const variance = varianceSeed !== undefined ? varianceSeed : 0.9 + Math.random() * 0.2;
  const finalDamage = Math.max(1, Math.round(rawDamage * variance));

  return {
    damage: finalDamage,
    isCrit,
    rawDamage: Math.round(rawDamage),
    mitigatedAmount: Math.max(0, Math.round(effectiveAtk * 0.5 + basePower - rawDamage)),
  };
}

