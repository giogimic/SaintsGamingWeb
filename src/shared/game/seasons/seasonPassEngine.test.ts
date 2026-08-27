import { describe, expect, it } from 'vitest';
import { SeasonPassEngine } from './seasonPassEngine';

describe('Seasonal Battle Pass & Progression Engine (Phase 19)', () => {
  it('calculates tier status, progression curves, and tier unlocks', () => {
    const engine = new SeasonPassEngine();
    const progress = engine.initPlayerProgress('char_1', 'season_1', false);

    // 1. Initial State
    const s1 = engine.calculateTierStatus(progress.totalXp);
    expect(s1.currentTier).toBe(1);
    expect(s1.xpInTier).toBe(0);
    expect(s1.isMaxTier).toBe(false);

    // 2. Add 2500 XP -> Tier 3 (500 XP into Tier 3)
    const res = engine.addPassXp(progress, 2500);
    expect(res.newTier).toBe(3);
    expect(res.tiersUnlocked).toBe(2);

    const s2 = engine.calculateTierStatus(progress.totalXp);
    expect(s2.currentTier).toBe(3);
    expect(s2.xpInTier).toBe(500);
  });

  it('manages dual-track claims with premium permission enforcement', () => {
    const engine = new SeasonPassEngine();
    engine.registerTier({
      tier: 1,
      freeReward: { type: 'CURRENCY_GOLD', rewardId: 'gold_1000', name: '1,000 Coins', quantity: 1000 },
      premiumReward: { type: 'COSMETIC_TITLE', rewardId: 'title_pioneer', name: 'Pioneer Title' },
    });

    const progress = engine.initPlayerProgress('char_2', 'season_1', false);

    // 1. Claim Free Track
    const freeClaim = engine.claimTierReward(progress, 1, 'FREE');
    expect(freeClaim.success).toBe(true);
    expect(freeClaim.reward?.name).toBe('1,000 Coins');

    // Duplicate free claim fails
    const dupClaim = engine.claimTierReward(progress, 1, 'FREE');
    expect(dupClaim.success).toBe(false);

    // 2. Claim Premium Track without owning pass -> fails
    const premFail = engine.claimTierReward(progress, 1, 'PREMIUM');
    expect(premFail.success).toBe(false);
    expect(premFail.reason).toBe('Requires Premium Battle Pass');

    // 3. Upgrade to Premium and claim -> succeeds
    progress.hasPremium = true;
    const premSuccess = engine.claimTierReward(progress, 1, 'PREMIUM');
    expect(premSuccess.success).toBe(true);
    expect(premSuccess.reward?.name).toBe('Pioneer Title');
  });

  it('progresses seasonal challenges and awards XP upon completion', () => {
    const engine = new SeasonPassEngine();
    engine.registerChallenge({
      id: 'daily_monsters',
      title: 'Monster Slayer',
      description: 'Defeat 5 monsters.',
      period: 'DAILY',
      targetCount: 5,
      xpReward: 500,
    });

    const progress = engine.initPlayerProgress('char_3', 'season_1', false);

    // Progress 3 kills
    const c1 = engine.progressChallenge(progress, 'daily_monsters', 3);
    expect(c1.completed).toBe(false);
    expect(c1.currentCount).toBe(3);
    expect(progress.totalXp).toBe(0);

    // Progress remaining 2 kills -> completed and awards 500 XP
    const c2 = engine.progressChallenge(progress, 'daily_monsters', 2);
    expect(c2.completed).toBe(true);
    expect(c2.xpAwarded).toBe(500);
    expect(progress.totalXp).toBe(500);
  });

  it('calculates and claims post-Tier 50 prestige overflow caches', () => {
    const engine = new SeasonPassEngine();
    const progress = engine.initPlayerProgress('char_4', 'season_1', true);

    // 50,000 XP reaches Tier 50; add 3,000 extra XP -> 2 prestige caches (1,500 XP each)
    engine.addPassXp(progress, 53000);

    const status = engine.calculateTierStatus(progress.totalXp);
    expect(status.isMaxTier).toBe(true);
    expect(status.currentTier).toBe(50);
    expect(status.totalPrestigeCachesEarned).toBe(2);

    // Claim 1st cache
    const c1 = engine.claimPrestigeCache(progress);
    expect(c1.success).toBe(true);
    expect(c1.cacheNumber).toBe(1);

    // Claim 2nd cache
    const c2 = engine.claimPrestigeCache(progress);
    expect(c2.success).toBe(true);
    expect(c2.cacheNumber).toBe(2);

    // No 3rd cache yet
    const c3 = engine.claimPrestigeCache(progress);
    expect(c3.success).toBe(false);
  });
});
