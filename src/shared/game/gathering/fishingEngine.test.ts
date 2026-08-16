import { describe, it, expect } from 'vitest';
import { attemptCatchFish } from './fishingEngine';

describe('Fishing Net & Harpoon Catch Probability Engine (Bible 08)', () => {
  it('catches raw shrimp with a small net on successful roll', () => {
    // Deterministic success roll = 0.1
    const result = attemptCatchFish('SMALL_NET', 1, true, 0, 0.1, 0.99);

    expect(result.success).toBe(true);
    expect(result.caughtFish?.itemId).toBe('raw_shrimp');
    expect(result.xpAwarded).toBe(10);
    expect(result.consumedBait).toBe(false);
    expect(result.foundCasketItemId).toBeUndefined();
  });

  it('consumes bait on rod fishing spots and rejects fishing when bait is empty', () => {
    // Fly fishing rod with feathers
    const result = attemptCatchFish('FLY_ROD', 25, true, 10, 0.1, 0.99);
    expect(result.success).toBe(true);
    expect(result.consumedBait).toBe(true);
    expect(result.caughtFish?.itemId).toBe('raw_trout');

    // Attempt with 0 bait (blocked)
    const failBait = attemptCatchFish('FLY_ROD', 25, true, 0);
    expect(failBait.success).toBe(false);
    expect(failBait.reason).toContain('run out of feather');
  });

  it('discovers sea treasure casket on low casket roll', () => {
    // Casket roll = 0.001 (lower than 0.005 chance)
    const result = attemptCatchFish('SMALL_NET', 1, true, 0, 0.1, 0.001);

    expect(result.success).toBe(true);
    expect(result.foundCasketItemId).toBe('item_casket_sea');
  });

  it('blocks fishing when tool is missing or level is insufficient', () => {
    // Missing lobster pot
    const noPot = attemptCatchFish('LOBSTER_POT', 40, false);
    expect(noPot.success).toBe(false);
    expect(noPot.reason).toContain('need a lobster pot');

    // Harpoon Shark requires Level 76 (player has 50 -> blocked)
    const lowLevel = attemptCatchFish('HARPOON', 50, true);
    expect(lowLevel.success).toBe(false);
    expect(lowLevel.reason).toContain('Requires Fishing level 76');
  });
});
