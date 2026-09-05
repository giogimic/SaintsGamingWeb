import { describe, it, expect } from 'vitest';
import {
  calculateGrimoireBonus,
  addGrimoirePages,
  evaluateBlightboundBoltSave,
  rollWorldTreeGuardianLoot,
  type GrimoireState,
} from './solakLootEngine';

describe('WorldTreeGuardian Loot, Grimoire & Crossbow Engine', () => {
  it('calculates Grimoire of Erebus crit rate bonus and damage cap increase', () => {
    const inactive: GrimoireState = { isActive: false, pagesRemaining: 0, minutesRemaining: 0 };
    expect(calculateGrimoireBonus(inactive).critChanceBonus).toBe(0);
    expect(calculateGrimoireBonus(inactive).damageCap).toBe(10000);

    const active: GrimoireState = { isActive: true, pagesRemaining: 2, minutesRemaining: 90 };
    const bonus = calculateGrimoireBonus(active);
    expect(bonus.critChanceBonus).toBe(0.12);
    expect(bonus.damageCap).toBe(15000);
  });

  it('charges Grimoire with torn pages (45 mins each)', () => {
    const grimoire: GrimoireState = { isActive: true, pagesRemaining: 0, minutesRemaining: 0 };
    const res = addGrimoirePages(grimoire, 3);
    expect(res.totalPages).toBe(3);
    expect(res.newMinutes).toBe(135); // 3 * 45
  });

  it('evaluates Blightbound Crossbow 50% bolt save chance', () => {
    expect(evaluateBlightboundBoltSave(0.25)).toBe(true);
    expect(evaluateBlightboundBoltSave(0.75)).toBe(false);
  });

  it('rolls unique drops and guarantees torn pages', () => {
    // Force unique drop (seed 0.001 < 0.025) and roll Grimoire
    const loot = rollWorldTreeGuardianLoot(0.001, 0.10);
    expect(loot.hasUnique).toBe(true);
    expect(loot.uniqueDrop).not.toBeNull();
    expect(loot.uniqueDrop?.itemId).toBe('grimoire_of_erebus');
    expect(loot.tornPages).toBeGreaterThanOrEqual(1);
    expect(loot.standardSupplies.length).toBe(3);
  });
});
