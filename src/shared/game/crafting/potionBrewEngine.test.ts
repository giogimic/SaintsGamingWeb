import { describe, it, expect } from 'vitest';
import {
  calculatePotionBoost,
  brewPotion,
  decantPotions,
  CANONICAL_POTION_RECIPES,
} from './potionBrewEngine';

describe('Alchemy & Herbology Potion Brew Engine (Bible 14 & 22)', () => {
  const superStr = CANONICAL_POTION_RECIPES.potion_super_strength;

  it('calculates flat + percentage combat stat boosts accurately', () => {
    // Base 99 Strength + Super Strength (+5 flat + 15% of 99 = 5 + 14 = 19 boost -> 118 boosted)
    const boosted = calculatePotionBoost(99, superStr.boost);
    expect(boosted).toBe(118);

    // Base 50 Strength (+5 + 7 = 12 boost -> 62 boosted)
    const boosted50 = calculatePotionBoost(50, superStr.boost);
    expect(boosted50).toBe(62);
  });

  it('brews potions requiring Herblore levels and ingredients', () => {
    // Attempt with low level (requires 55, player has 40 -> blocked)
    const failLevel = brewPotion(superStr, 40, true, true);
    expect(failLevel.success).toBe(false);
    expect(failLevel.reason).toContain('Requires Herblore level 55');

    // Missing secondary reagent (blocked)
    const failReagent = brewPotion(superStr, 60, true, false);
    expect(failReagent.success).toBe(false);
    expect(failReagent.reason).toContain('Missing required');

    // Successful brew (yields 3 doses + 125 XP)
    const success = brewPotion(superStr, 60, true, true);
    expect(success.success).toBe(true);
    expect(success.doses).toBe(3);
    expect(success.xpAwarded).toBe(125);
  });

  it('decants partial potion doses into full 4-dose flasks returning empty vials', () => {
    // Four 1-dose potions -> 1 full 4-dose potion, 0 remainder, 3 empty vials
    const decant1 = decantPotions([1, 1, 1, 1]);
    expect(decant1.fullFourDoseCount).toBe(1);
    expect(decant1.remainderDose).toBe(0);
    expect(decant1.emptyVialsReturned).toBe(3);

    // [3, 3, 3] = 9 doses -> 2 full 4-doses (8) + 1 remainder (1), total 3 vials used -> 0 empty vials
    const decant2 = decantPotions([3, 3, 3]);
    expect(decant2.fullFourDoseCount).toBe(2);
    expect(decant2.remainderDose).toBe(1);
    expect(decant2.emptyVialsReturned).toBe(0);
  });
});
