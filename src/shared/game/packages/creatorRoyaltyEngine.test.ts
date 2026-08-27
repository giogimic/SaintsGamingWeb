import { describe, expect, it } from 'vitest';
import {
  CreatorAccount,
  CreatorRoyaltyEngine,
} from './creatorRoyaltyEngine';

describe('Creator Attribution, Royalty Distributions & Asset Monetization Engine (Phase 30)', () => {
  it('calculates direct original sales splits accurately', () => {
    const engine = new CreatorRoyaltyEngine();

    engine.registerAttribution({
      assetId: 'pack_volcano_tiles',
      originalAuthorId: 'creator_alice',
      originalAuthorSharePercent: 95,
      remixerSharePercent: 0,
      platformFeePercent: 5,
    });

    const split = engine.calculateSplit('pack_volcano_tiles', 10000);
    expect(split.platformFee).toBe(500); // 5%
    expect(split.originalAuthorAmount).toBe(9500); // 95%
    expect(split.remixerAmount).toBe(0);
  });

  it('calculates remixer derivative blueprint sales splits with dual attribution', () => {
    const engine = new CreatorRoyaltyEngine();

    // Bob remixed Alice's open blueprint
    engine.registerAttribution({
      assetId: 'blueprint_remix_dungeon',
      originalAuthorId: 'creator_alice',
      remixerAuthorId: 'creator_bob',
      originalAuthorSharePercent: 70,
      remixerSharePercent: 25,
      platformFeePercent: 5,
    });

    const split = engine.calculateSplit('blueprint_remix_dungeon', 20000);
    expect(split.platformFee).toBe(1000); // 5% of 20,000
    expect(split.remixerAmount).toBe(5000); // 25% of 20,000
    expect(split.originalAuthorAmount).toBe(14000); // 70% of 20,000
  });

  it('processes sales and updates creator accounts with accurate balances', () => {
    const engine = new CreatorRoyaltyEngine();
    const accounts = new Map<string, CreatorAccount>();

    engine.registerAttribution({
      assetId: 'blueprint_arena',
      originalAuthorId: 'creator_alice',
      remixerAuthorId: 'creator_bob',
      originalAuthorSharePercent: 70,
      remixerSharePercent: 25,
      platformFeePercent: 5,
    });

    // Process a 10,000 gold purchase
    engine.processSale('blueprint_arena', 10000, accounts);

    const aliceAcc = accounts.get('creator_alice');
    const bobAcc = accounts.get('creator_bob');

    expect(aliceAcc?.availableGoldBalance).toBe(7000);
    expect(bobAcc?.availableGoldBalance).toBe(2500);
  });

  it('validates and executes creator payout claims', () => {
    const engine = new CreatorRoyaltyEngine();
    const account: CreatorAccount = {
      creatorId: 'creator_alice',
      availableGoldBalance: 50000,
      escrowGoldBalance: 0,
      totalEarnedAllTime: 50000,
    };

    // 1. Claim below minimum threshold of 10k fails
    const c1 = engine.claimPayout(account, 5000, 10000);
    expect(c1.success).toBe(false);
    expect(c1.reason).toContain('minimum threshold');

    // 2. Claim above available balance fails
    const c2 = engine.claimPayout(account, 100000, 10000);
    expect(c2.success).toBe(false);
    expect(c2.reason).toContain('Insufficient');

    // 3. Valid claim of 20k succeeds
    const c3 = engine.claimPayout(account, 20000, 10000);
    expect(c3.success).toBe(true);
    expect(c3.claimed).toBe(20000);
    expect(c3.remaining).toBe(30000);
    expect(account.availableGoldBalance).toBe(30000);
  });
});
