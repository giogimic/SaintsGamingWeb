import { describe, it, expect } from 'vitest';
import { openRewardCasket } from './casketRewardEngine';

describe('Reward Casket Loot Generator & Mega-Rare Table Engine (Bible 18 & 25)', () => {
  it('opens an Easy casket and awards coins and runes', () => {
    // Deterministic random float returning 0.0 (selects first item: coins)
    const result = openRewardCasket('EASY', 3, () => 0.0);

    expect(result.tier).toBe('EASY');
    expect(result.loot.length).toBe(3);
    expect(result.loot[0].itemId).toBe('coins');
    expect(result.loot[0].quantity).toBe(50);
  });

  it('detects unique and mega-rare items in Hard casket', () => {
    // Custom random float function that simulates hitting 3rd age item
    let callCount = 0;
    const customFloat = () => {
      callCount++;
      // Return value very close to total weight to pick the 3rd age item at end of list
      if (callCount % 2 === 1) return 0.9999;
      return 0.5;
    };

    const result = openRewardCasket('HARD', 1, customFloat);
    expect(result.loot.length).toBe(1);
    expect(result.loot[0].itemId).toBe('equip_3rd_age_mage_hat');
    expect(result.totalUniqueCount).toBe(1);
    expect(result.hasMegaRare).toBe(true);
  });

  it('respects roll count boundaries for Master caskets', () => {
    const result = openRewardCasket('MASTER');
    expect(result.loot.length).toBeGreaterThanOrEqual(5);
    expect(result.loot.length).toBeLessThanOrEqual(7);
  });
});
