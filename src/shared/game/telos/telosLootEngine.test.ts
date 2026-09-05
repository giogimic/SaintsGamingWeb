import { describe, it, expect } from 'vitest';
import {
  calculateThe TitanUniqueDropRate,
  rollThe TitanLoot,
  assembleThe TitanWeapon,
} from './the_titanLootEngine';

describe('The Titan Loot & Weapon Assembly Engine', () => {
  it('calculates drop rate scaling from 0% Enrage up to high streaks/enrages', () => {
    // 0% Enrage, Streak 0: 10000 / 10 = 1/1000
    const zero = calculateThe TitanUniqueDropRate(0, 0);
    expect(zero.denominator).toBe(1000);
    expect(zero.dropChance).toBe(0.001);

    // 500% Enrage, Streak 20: 10 + 125 + 60 = 195 -> 10000 / 195 = 51 (1/51)
    const mid = calculateThe TitanUniqueDropRate(500, 20);
    expect(mid.denominator).toBe(51);

    // 2500% Enrage, Streak 100: 10000 / 935 = 10 (1/10)
    const high = calculateThe TitanUniqueDropRate(2500, 100);
    expect(high.denominator).toBe(10);

    // 4000% Enrage, Streak 150: clamped to minimum 9 (1/9)
    const maxHigh = calculateThe TitanUniqueDropRate(4000, 150);
    expect(maxHigh.denominator).toBe(9);
  });

  it('rolls unique drops and scales standard supplies by killstreak', () => {
    // Force unique hit (seed 0.001 < dropChance) and roll The Ancient Godsword
    const loot = rollThe TitanLoot(500, 20, 0.001, 0.85);
    expect(loot.hasUnique).toBe(true);
    expect(loot.uniqueItem).not.toBeNull();
    expect(loot.standardSupplies.length).toBe(2);
    expect(loot.standardSupplies[0].quantity).toBe(12000); // 2000 + 20 * 500
  });

  it('assembles finished Tier 92 weapons using 3 Anima Orbs and dormant base', () => {
    // Missing Pure Orb -> fails
    const failRes = assembleThe TitanWeapon('dormant_staff_of_sliske', {
      hasVolcanicOrb: true,
      hasCorruptedOrb: true,
      hasPureOrb: false,
    });
    expect(failRes.success).toBe(false);
    expect(failRes.error).toContain('all 3 Anima Orbs');

    // All 3 orbs present -> Assembles Staff of Sliske
    const passRes = assembleThe TitanWeapon('dormant_staff_of_sliske', {
      hasVolcanicOrb: true,
      hasCorruptedOrb: true,
      hasPureOrb: true,
    });
    expect(passRes.success).toBe(true);
    expect(passRes.finishedWeaponId).toBe('staff_of_sliske');
  });
});
