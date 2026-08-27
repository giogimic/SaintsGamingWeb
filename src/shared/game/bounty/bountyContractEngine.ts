/**
 * Saints Gaming — Master World Bounty Board, Daily Wanted Contracts & Bandit Slaying Ledger Engine (Bible 09, 15, 23, 30)
 * Manages daily wanted contracts across 5 threat tiers, combat modifiers, player-posted PvP bounties in gold escrow, and kill verification.
 */

export type BountyCategory =
  | 'BANDIT_OUTLAW'
  | 'CORRUPTED_BEAST'
  | 'WILDERNESS_RENEGADE_PVP'
  | 'CELESTIAL_TITAN';

export type ThreatTier =
  | 'TIER_1_NOVICE'
  | 'TIER_2_ADEPT'
  | 'TIER_3_VETERAN'
  | 'TIER_4_ELITE'
  | 'TIER_5_MYTHIC_BOSS';

export type CombatModifier =
  | 'ENRAGED_STRIKES'
  | 'ARMORED_CARAPACE'
  | 'SWIFT_FOOTED'
  | 'LIFE_STEAL'
  | 'ASTRAL_SHIELD';

export interface BountyContract {
  contractId: string;
  targetName: string;
  targetId: string; // monsterId or playerId
  category: BountyCategory;
  threatTier: ThreatTier;
  zoneLocation: string;
  modifiers: CombatModifier[];
  rewards: {
    gold: number;
    renownRep: number;
    hunterBadges: number;
  };
  isPvpPlayerBounty?: boolean;
  posterPlayerId?: string;
  escrowGoldLocked?: number;
  isCompleted: boolean;
  completedByPlayerId?: string;
  completedAt?: number;
}

export class BountyContractEngine {
  private contracts = new Map<string, BountyContract>();

  /**
   * Generates a daily rotation of PvE wanted contracts.
   */
  public generateDailyBoard(zoneId: string, nowMs: number = Date.now()): BountyContract[] {
    const templates: Array<{
      targetName: string;
      targetId: string;
      category: BountyCategory;
      threatTier: ThreatTier;
      modifiers: CombatModifier[];
      gold: number;
      rep: number;
      badges: number;
    }> = [
      {
        targetName: 'Krag the Bonecrusher',
        targetId: 'boss_krag_bandit',
        category: 'BANDIT_OUTLAW',
        threatTier: 'TIER_2_ADEPT',
        modifiers: ['ENRAGED_STRIKES'],
        gold: 1500,
        rep: 50,
        badges: 1,
      },
      {
        targetName: 'Corrupted Void Bear',
        targetId: 'beast_void_bear',
        category: 'CORRUPTED_BEAST',
        threatTier: 'TIER_3_VETERAN',
        modifiers: ['ARMORED_CARAPACE', 'LIFE_STEAL'],
        gold: 3500,
        rep: 120,
        badges: 2,
      },
      {
        targetName: 'Malakar the Astral Titan',
        targetId: 'titan_malakar',
        category: 'CELESTIAL_TITAN',
        threatTier: 'TIER_5_MYTHIC_BOSS',
        modifiers: ['ASTRAL_SHIELD', 'ENRAGED_STRIKES', 'SWIFT_FOOTED'],
        gold: 25000,
        rep: 500,
        badges: 10,
      },
    ];

    const generated: BountyContract[] = [];

    for (const t of templates) {
      const contract: BountyContract = {
        contractId: `bounty_daily_${t.targetId}_${nowMs}`,
        targetName: t.targetName,
        targetId: t.targetId,
        category: t.category,
        threatTier: t.threatTier,
        zoneLocation: zoneId,
        modifiers: [...t.modifiers],
        rewards: {
          gold: t.gold,
          renownRep: t.rep,
          hunterBadges: t.badges,
        },
        isCompleted: false,
      };

      this.contracts.set(contract.contractId, contract);
      generated.push(contract);
    }

    return generated;
  }

  /**
   * Places a custom player PvP bounty on a target player with locked gold escrow.
   */
  public placePlayerPvpBounty(
    posterPlayerId: string,
    targetPlayerId: string,
    targetPlayerName: string,
    goldBounty: number,
    nowMs: number = Date.now()
  ): BountyContract {
    if (posterPlayerId === targetPlayerId) {
      throw new Error('Cannot place a bounty on yourself');
    }

    if (goldBounty < 500) {
      throw new Error('Minimum player bounty is 500 Gold');
    }

    const contract: BountyContract = {
      contractId: `bounty_pvp_${targetPlayerId}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      targetName: targetPlayerName,
      targetId: targetPlayerId,
      category: 'WILDERNESS_RENEGADE_PVP',
      threatTier: goldBounty >= 10000 ? 'TIER_4_ELITE' : 'TIER_3_VETERAN',
      zoneLocation: 'WILDERNESS_REALM',
      modifiers: ['SWIFT_FOOTED'],
      rewards: {
        gold: goldBounty,
        renownRep: 100,
        hunterBadges: 3,
      },
      isPvpPlayerBounty: true,
      posterPlayerId,
      escrowGoldLocked: goldBounty,
      isCompleted: false,
    };

    this.contracts.set(contract.contractId, contract);
    return contract;
  }

  /**
   * Validates a verified killing blow against an active wanted contract or PvP target.
   */
  public validateTargetKill(
    contractId: string,
    killerPlayerId: string,
    killedTargetId: string,
    inWilderness: boolean = false,
    nowMs: number = Date.now()
  ): {
    success: boolean;
    contract?: BountyContract;
    payout?: { gold: number; renownRep: number; hunterBadges: number };
    error?: string;
  } {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      return { success: false, error: `Contract ${contractId} not found` };
    }

    if (contract.isCompleted) {
      return { success: false, error: 'Contract has already been completed' };
    }

    if (contract.targetId !== killedTargetId) {
      return { success: false, error: 'Killed target does not match contract' };
    }

    if (contract.isPvpPlayerBounty && !inWilderness) {
      return {
        success: false,
        error: 'PvP bounties must be claimed through wilderness combat or arena duels',
      };
    }

    contract.isCompleted = true;
    contract.completedByPlayerId = killerPlayerId;
    contract.completedAt = nowMs;

    return {
      success: true,
      contract,
      payout: { ...contract.rewards },
    };
  }

  /**
   * Returns all active, uncompleted bounty contracts.
   */
  public getActiveContracts(): BountyContract[] {
    return Array.from(this.contracts.values()).filter((c) => !c.isCompleted);
  }
}
