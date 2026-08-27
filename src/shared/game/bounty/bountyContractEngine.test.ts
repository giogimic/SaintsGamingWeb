import { describe, expect, it } from 'vitest';
import { BountyContractEngine } from './bountyContractEngine';

describe('Master World Bounty Board & Slaying Ledger Engine (Phase 54)', () => {
  it('generates daily wanted contracts with modifiers and reward structures', () => {
    const engine = new BountyContractEngine();
    const board = engine.generateDailyBoard('zone_ashen_wastes', 1000000);

    expect(board).toHaveLength(3);
    const titan = board.find((b) => b.category === 'CELESTIAL_TITAN');
    expect(titan?.threatTier).toBe('TIER_5_MYTHIC_BOSS');
    expect(titan?.modifiers).toContain('ASTRAL_SHIELD');
    expect(titan?.rewards.gold).toBe(25000);
    expect(titan?.rewards.hunterBadges).toBe(10);
  });

  it('handles player-placed PvP bounties in gold escrow and verifies wilderness kills', () => {
    const engine = new BountyContractEngine();

    const now = 2000000;
    // 1. Player Alice places 5,000g bounty on rival Bob
    const pvpBounty = engine.placePlayerPvpBounty(
      'player_alice',
      'player_bob',
      'Bob the Renegade',
      5000,
      now
    );

    expect(pvpBounty.escrowGoldLocked).toBe(5000);
    expect(pvpBounty.isCompleted).toBe(false);

    // 2. Bounty hunter Charlie kills Bob outside wilderness -> Rejected
    const nonWildKill = engine.validateTargetKill(
      pvpBounty.contractId,
      'player_charlie',
      'player_bob',
      false, // not in wilderness
      now + 1000
    );

    expect(nonWildKill.success).toBe(false);
    expect(nonWildKill.error).toContain('wilderness combat');

    // 3. Charlie kills Bob in Wilderness -> Valid kill and receives 5000g + 3 badges
    const wildKill = engine.validateTargetKill(
      pvpBounty.contractId,
      'player_charlie',
      'player_bob',
      true, // in wilderness
      now + 2000
    );

    expect(wildKill.success).toBe(true);
    expect(wildKill.payout?.gold).toBe(5000);
    expect(wildKill.payout?.hunterBadges).toBe(3);
    expect(pvpBounty.isCompleted).toBe(true);
    expect(pvpBounty.completedByPlayerId).toBe('player_charlie');
  });
});
