/**
 * Saints Gaming — Simulation Modifiers & Balance Scaling Engine (Bible 16 / Studio Plan Part 6 §10)
 *
 * Provides pure multiplier and balance modifier helpers that scale gameplay rewards,
 * experience curves, drop probabilities, and gold faucets based on active SimulationPresets.
 */

export interface SimulationMultipliers {
  xpMultiplier: number;
  dropMultiplier: number;
  goldMultiplier: number;
}

export const DEFAULT_SIMULATION_MULTIPLIERS: SimulationMultipliers = {
  xpMultiplier: 1.0,
  dropMultiplier: 1.0,
  goldMultiplier: 1.0,
};

/**
 * Scale experience points according to simulation preset multipliers.
 */
export function scaleSimulationXp(
  baseXp: number,
  multipliers: SimulationMultipliers = DEFAULT_SIMULATION_MULTIPLIERS
): number {
  const mult = Math.max(0.01, multipliers.xpMultiplier ?? 1.0);
  return Math.round(baseXp * mult);
}

/**
 * Scale gold rewards / drops according to simulation preset multipliers.
 */
export function scaleSimulationGold(
  baseGold: number,
  multipliers: SimulationMultipliers = DEFAULT_SIMULATION_MULTIPLIERS
): number {
  const mult = Math.max(0.01, multipliers.goldMultiplier ?? 1.0);
  return Math.round(baseGold * mult);
}

/**
 * Scale drop rate probability (0.0 to 1.0) according to simulation preset multipliers.
 * Caps at 1.0 (100% chance).
 */
export function scaleSimulationDropRate(
  baseDropChance: number,
  multipliers: SimulationMultipliers = DEFAULT_SIMULATION_MULTIPLIERS
): number {
  const mult = Math.max(0.01, multipliers.dropMultiplier ?? 1.0);
  return Math.min(1.0, baseDropChance * mult);
}
