import { describe, it, expect } from 'vitest';
import {
  scaleSimulationXp,
  scaleSimulationGold,
  scaleSimulationDropRate,
  DEFAULT_SIMULATION_MULTIPLIERS,
} from './simulationModifiers';
import { executeAction } from '../rules/ruleEngine';

describe('simulationModifiers', () => {
  it('returns baseline values with default multipliers', () => {
    expect(scaleSimulationXp(100, DEFAULT_SIMULATION_MULTIPLIERS)).toBe(100);
    expect(scaleSimulationGold(50, DEFAULT_SIMULATION_MULTIPLIERS)).toBe(50);
    expect(scaleSimulationDropRate(0.25, DEFAULT_SIMULATION_MULTIPLIERS)).toBe(0.25);
  });

  it('scales XP correctly with custom multiplier', () => {
    const custom = { xpMultiplier: 2.5, dropMultiplier: 1.0, goldMultiplier: 1.0 };
    expect(scaleSimulationXp(100, custom)).toBe(250);
    expect(scaleSimulationXp(33, custom)).toBe(83);
  });

  it('scales gold rewards with multiplier', () => {
    const custom = { xpMultiplier: 1.0, dropMultiplier: 1.0, goldMultiplier: 3.0 };
    expect(scaleSimulationGold(100, custom)).toBe(300);
  });

  it('scales drop rates and clamps at 1.0', () => {
    const custom = { xpMultiplier: 1.0, dropMultiplier: 5.0, goldMultiplier: 1.0 };
    expect(scaleSimulationDropRate(0.1, custom)).toBeCloseTo(0.5);
    expect(scaleSimulationDropRate(0.3, custom)).toBe(1.0);
  });

  it('scales rule engine GRANT_XP and GIVE_GOLD actions', () => {
    const player = { level: 1, gold: 0 };
    const ctx = {
      player,
      simulationMultipliers: { xpMultiplier: 2.0, dropMultiplier: 1.0, goldMultiplier: 4.0 },
    };

    const goldRes = executeAction({ kind: 'GIVE_GOLD', amount: 25 }, ctx);
    expect(goldRes.success).toBe(true);
    expect(player.gold).toBe(100); // 25 * 4.0

    const xpRes = executeAction({ kind: 'GRANT_XP', amount: 500 }, ctx);
    expect(xpRes.success).toBe(true);
    expect(player.level).toBe(3); // 1 + floor((500 * 2.0) / 500) = 1 + 2 = 3
  });
});
