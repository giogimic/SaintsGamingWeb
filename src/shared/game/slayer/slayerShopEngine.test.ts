import { describe, it, expect } from 'vitest';
import {
  purchaseSlayerUnlock,
  blockSlayerTask,
  cancelActiveTaskWithPoints,
  getMaxBlockSlots,
  calculateSlayerCombatBonus,
  type SlayerShopAccountState,
} from './slayerShopEngine';

describe('Slayer Reward Shop & Helmet Imbue Engine', () => {
  it('manages reward shop purchases and point deductions', () => {
    const account: SlayerShopAccountState = {
      slayerPoints: 500,
      questPoints: 175,
      unlockedPerks: [],
      blockedTasks: [],
    };

    // Purchase Bigger and Badder (150 pts)
    const res1 = purchaseSlayerUnlock(account, 'bigger_and_badder');
    expect(res1.success).toBe(true);
    expect(account.slayerPoints).toBe(350);
    expect(account.unlockedPerks).toContain('bigger_and_badder');

    // Duplicate purchase prevention
    const resDup = purchaseSlayerUnlock(account, 'bigger_and_badder');
    expect(resDup.success).toBe(false);
    expect(resDup.error).toContain('already unlocked');

    // Purchase Malevolent Masquerade (400 pts -> fails because 350 < 400)
    const resFail = purchaseSlayerUnlock(account, 'malevolent_masquerade');
    expect(resFail.success).toBe(false);
    expect(resFail.error).toContain('Insufficient Slayer points');
  });

  it('enforces quest point requirements on blocked monster slots', () => {
    // 175 QP -> floor(175/50) = 3 max block slots
    expect(getMaxBlockSlots(175)).toBe(3);
    // 300 QP -> max 6
    expect(getMaxBlockSlots(300)).toBe(6);

    const account: SlayerShopAccountState = {
      slayerPoints: 300,
      questPoints: 100, // 2 max block slots
      unlockedPerks: [],
      blockedTasks: ['cave_crawler'],
    };

    // Block 2nd task (costs 100 pts)
    const block2 = blockSlayerTask(account, 'banshee');
    expect(block2.success).toBe(true);
    expect(account.slayerPoints).toBe(200);
    expect(account.blockedTasks).toEqual(['cave_crawler', 'banshee']);

    // Block 3rd task (fails: limit 2 slots reached)
    const block3 = blockSlayerTask(account, 'rockslug');
    expect(block3.success).toBe(false);
    expect(block3.error).toContain('All 2 block slots are occupied');
  });

  it('allows task skipping for 30 points without resetting streak', () => {
    const account: SlayerShopAccountState = {
      slayerPoints: 50,
      questPoints: 100,
      unlockedPerks: [],
      blockedTasks: [],
    };

    const cancelRes = cancelActiveTaskWithPoints(account, true);
    expect(cancelRes.success).toBe(true);
    expect(account.slayerPoints).toBe(20);

    // Cancel again (fails: 20 < 30)
    const cancelRes2 = cancelActiveTaskWithPoints(account, true);
    expect(cancelRes2.success).toBe(false);
  });

  it('calculates on-task damage bonuses for Black Mask and Imbued Slayer Helmet', () => {
    // Off task -> 1.0 (no bonus)
    const offTask = calculateSlayerCombatBonus('SLAYER_HELMET_IMBUED', 'gargoyle', 'abyssal_demon');
    expect(offTask.isActive).toBe(false);
    expect(offTask.meleeMultiplier).toBe(1.0);
    expect(offTask.rangedMultiplier).toBe(1.0);
    expect(offTask.magicMultiplier).toBe(1.0);

    // Standard Slayer Helmet on task -> +16.67% Melee, 1.0 Ranged/Magic
    const standardHelm = calculateSlayerCombatBonus('SLAYER_HELMET', 'gargoyle', 'gargoyle');
    expect(standardHelm.isActive).toBe(true);
    expect(standardHelm.meleeMultiplier).toBeCloseTo(1.1667, 3);
    expect(standardHelm.rangedMultiplier).toBe(1.0);
    expect(standardHelm.magicMultiplier).toBe(1.0);

    // Imbued Slayer Helmet on task -> +16.67% Melee, +15% Ranged, +15% Magic
    const imbuedHelm = calculateSlayerCombatBonus('SLAYER_HELMET_IMBUED', 'gargoyle', 'gargoyle');
    expect(imbuedHelm.isActive).toBe(true);
    expect(imbuedHelm.meleeMultiplier).toBeCloseTo(1.1667, 3);
    expect(imbuedHelm.rangedMultiplier).toBe(1.15);
    expect(imbuedHelm.magicMultiplier).toBe(1.15);
  });
});
