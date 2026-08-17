import { describe, it, expect } from 'vitest';
import {
  simulateCombatScenario,
  BalanceScenario,
  DEFAULT_PLAYER_TUNING,
} from './combatBalanceEngine';

describe('Combat Balancing & Simulation Engine (Bible 25 §3.7 & §3.8)', () => {
  it('simulates DPS, TTK, and XP per hour for a standard melee strike scenario', () => {
    const scenario: BalanceScenario = {
      id: 'test_melee_basic',
      name: 'Lv 10 Player vs Goblin Warrior',
      playerLevel: 10,
      abilityId: 'strike',
      targetMaxHp: 150,
      targetDef: 20,
      iterations: 100,
    };

    const report = simulateCombatScenario(scenario);
    expect(report.avgDamage).toBeGreaterThan(0);
    expect(report.dps).toBeGreaterThan(0);
    expect(report.timeToKillSec).toBeGreaterThan(0);
    expect(report.xpPerHourEstimate).toBeGreaterThan(0);
    expect(report.warnings.length).toBe(0);
  });

  it('handles invalid ability IDs gracefully with warning reporting', () => {
    const scenario: BalanceScenario = {
      id: 'test_invalid',
      name: 'Invalid Test',
      playerLevel: 1,
      abilityId: 'non_existent_ability_xyz',
      targetMaxHp: 100,
      targetDef: 0,
      iterations: 10,
    };

    const report = simulateCombatScenario(scenario);
    expect(report.dps).toBe(0);
    expect(report.warnings.length).toBeGreaterThan(0);
  });

  it('scales DPS appropriately with global player tuning multipliers', () => {
    const scenario: BalanceScenario = {
      id: 'test_cleave',
      name: 'Cleave Simulation',
      playerLevel: 25,
      abilityId: 'cleave',
      targetMaxHp: 500,
      targetDef: 50,
      iterations: 50,
    };

    const normalReport = simulateCombatScenario(scenario, DEFAULT_PLAYER_TUNING);
    const boostedReport = simulateCombatScenario(scenario, {
      ...DEFAULT_PLAYER_TUNING,
      globalDamageMul: 1.5,
    });

    expect(boostedReport.avgDamage).toBeGreaterThan(normalReport.avgDamage);
    expect(boostedReport.dps).toBeGreaterThan(normalReport.dps);
    expect(boostedReport.timeToKillSec).toBeLessThan(normalReport.timeToKillSec);
  });
});
