import { describe, it, expect } from 'vitest';
import {
  validateRewardBundle,
  combineRewardBundles,
  RewardBundle,
} from './rewards';

describe('Canonical RewardBundle Engine (Bible 31 §1 & §2)', () => {
  it('validates reward bundle structure and rules out negative values', () => {
    const validBundle: RewardBundle = {
      credits: 500,
      items: [{ itemId: 'iron_ore', count: 5 }],
      skillsXp: [{ skillId: 'mining', xp: 250 }],
    };

    const validation = validateRewardBundle(validBundle);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const invalidBundle: RewardBundle = {
      credits: -100,
      items: [{ itemId: '', count: -2 }],
      skillsXp: [{ skillId: 'mining', xp: 0 }],
    };

    const invalidRes = validateRewardBundle(invalidBundle);
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('combines multiple reward bundles with item stacking and xp aggregation', () => {
    const b1: RewardBundle = {
      credits: 100,
      items: [{ itemId: 'health_potion', count: 2 }],
      skillsXp: [{ skillId: 'attack', xp: 50 }],
    };

    const b2: RewardBundle = {
      credits: 250,
      items: [
        { itemId: 'health_potion', count: 3 },
        { itemId: 'bronze_sword', count: 1 },
      ],
      skillsXp: [{ skillId: 'attack', xp: 75 }],
    };

    const combined = combineRewardBundles(b1, b2);
    expect(combined.credits).toBe(350);
    expect(combined.items?.find((i) => i.itemId === 'health_potion')?.count).toBe(5);
    expect(combined.items?.find((i) => i.itemId === 'bronze_sword')?.count).toBe(1);
    expect(combined.skillsXp?.find((s) => s.skillId === 'attack')?.xp).toBe(125);
  });
});
