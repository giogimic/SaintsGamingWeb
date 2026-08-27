/**
 * Saints Gaming — Seasonal Battle Pass, Seasonal Challenges & Progression Engine (Bible 04 & 16)
 * Manages dual-track season tiers, daily/weekly challenges, tier reward claims, and prestige cache overflows.
 */

export type PassRewardType =
  | 'ITEM'
  | 'COSMETIC_TITLE'
  | 'CURRENCY_GOLD'
  | 'EMOTE'
  | 'BEAST_SKIN';

export interface PassReward {
  type: PassRewardType;
  rewardId: string;
  name: string;
  quantity?: number;
}

export interface BattlePassTier {
  tier: number; // 1 to 50
  freeReward: PassReward | null;
  premiumReward: PassReward | null;
}

export type ChallengePeriod = 'DAILY' | 'WEEKLY' | 'SEASONAL';

export interface SeasonalChallenge {
  id: string;
  title: string;
  description: string;
  period: ChallengePeriod;
  targetCount: number;
  xpReward: number;
}

export interface PlayerPassProgress {
  characterId: string;
  seasonId: string;
  hasPremium: boolean;
  totalXp: number;
  claimedFreeTiers: Set<number>;
  claimedPremiumTiers: Set<number>;
  claimedPrestigeCaches: number;
  challengeProgress: Map<string, number>;
}

export const XP_PER_TIER = 1000;
export const MAX_SEASON_TIER = 50;
export const PRESTIGE_XP_PER_CACHE = 1500;

export class SeasonPassEngine {
  private tiers = new Map<number, BattlePassTier>();
  private challenges = new Map<string, SeasonalChallenge>();

  /**
   * Registers battle pass tier reward definitions.
   */
  public registerTier(tier: BattlePassTier) {
    this.tiers.set(tier.tier, { ...tier });
  }

  /**
   * Registers a seasonal challenge task.
   */
  public registerChallenge(challenge: SeasonalChallenge) {
    this.challenges.set(challenge.id, { ...challenge });
  }

  /**
   * Initializes player progress for a season.
   */
  public initPlayerProgress(
    characterId: string,
    seasonId: string,
    hasPremium: boolean = false
  ): PlayerPassProgress {
    return {
      characterId,
      seasonId,
      hasPremium,
      totalXp: 0,
      claimedFreeTiers: new Set<number>(),
      claimedPremiumTiers: new Set<number>(),
      claimedPrestigeCaches: 0,
      challengeProgress: new Map<string, number>(),
    };
  }

  /**
   * Calculates player's current tier and prestige cache status based on total XP.
   */
  public calculateTierStatus(totalXp: number): {
    currentTier: number;
    xpInTier: number;
    isMaxTier: boolean;
    totalPrestigeCachesEarned: number;
  } {
    const maxBaseXp = MAX_SEASON_TIER * XP_PER_TIER;

    if (totalXp < maxBaseXp) {
      const currentTier = Math.floor(totalXp / XP_PER_TIER) + 1;
      const xpInTier = totalXp % XP_PER_TIER;
      return {
        currentTier: Math.min(MAX_SEASON_TIER, currentTier),
        xpInTier,
        isMaxTier: false,
        totalPrestigeCachesEarned: 0,
      };
    }

    const excessXp = totalXp - maxBaseXp;
    const cachesEarned = Math.floor(excessXp / PRESTIGE_XP_PER_CACHE);

    return {
      currentTier: MAX_SEASON_TIER,
      xpInTier: XP_PER_TIER,
      isMaxTier: true,
      totalPrestigeCachesEarned: cachesEarned,
    };
  }

  /**
   * Adds seasonal Battle Pass XP and calculates tier ups.
   */
  public addPassXp(
    progress: PlayerPassProgress,
    amount: number
  ): {
    newXp: number;
    oldTier: number;
    newTier: number;
    tiersUnlocked: number;
  } {
    const oldStatus = this.calculateTierStatus(progress.totalXp);
    progress.totalXp += Math.max(0, Math.floor(amount));
    const newStatus = this.calculateTierStatus(progress.totalXp);

    return {
      newXp: progress.totalXp,
      oldTier: oldStatus.currentTier,
      newTier: newStatus.currentTier,
      tiersUnlocked: Math.max(0, newStatus.currentTier - oldStatus.currentTier),
    };
  }

  /**
   * Claims a reward from a specific tier (Free or Premium).
   */
  public claimTierReward(
    progress: PlayerPassProgress,
    tierNumber: number,
    track: 'FREE' | 'PREMIUM'
  ): { success: boolean; reward?: PassReward; reason?: string } {
    const status = this.calculateTierStatus(progress.totalXp);
    if (tierNumber > status.currentTier) {
      return { success: false, reason: `Tier ${tierNumber} not yet reached (Current: ${status.currentTier})` };
    }

    const tierDef = this.tiers.get(tierNumber);
    if (!tierDef) {
      return { success: false, reason: `Tier ${tierNumber} definition not registered` };
    }

    if (track === 'PREMIUM' && !progress.hasPremium) {
      return { success: false, reason: 'Requires Premium Battle Pass' };
    }

    if (track === 'FREE') {
      if (progress.claimedFreeTiers.has(tierNumber)) {
        return { success: false, reason: `Free Tier ${tierNumber} already claimed` };
      }
      if (!tierDef.freeReward) {
        return { success: false, reason: `No free reward at Tier ${tierNumber}` };
      }
      progress.claimedFreeTiers.add(tierNumber);
      return { success: true, reward: tierDef.freeReward };
    } else {
      if (progress.claimedPremiumTiers.has(tierNumber)) {
        return { success: false, reason: `Premium Tier ${tierNumber} already claimed` };
      }
      if (!tierDef.premiumReward) {
        return { success: false, reason: `No premium reward at Tier ${tierNumber}` };
      }
      progress.claimedPremiumTiers.add(tierNumber);
      return { success: true, reward: tierDef.premiumReward };
    }
  }

  /**
   * Claims an available post-Tier 50 prestige overflow cache.
   */
  public claimPrestigeCache(progress: PlayerPassProgress): {
    success: boolean;
    cacheNumber?: number;
    reason?: string;
  } {
    const status = this.calculateTierStatus(progress.totalXp);
    if (!status.isMaxTier || status.totalPrestigeCachesEarned <= progress.claimedPrestigeCaches) {
      return { success: false, reason: 'No unclaimed prestige caches available' };
    }

    progress.claimedPrestigeCaches++;
    return { success: true, cacheNumber: progress.claimedPrestigeCaches };
  }

  /**
   * Progresses a seasonal challenge and automatically awards Battle Pass XP upon completion.
   */
  public progressChallenge(
    progress: PlayerPassProgress,
    challengeId: string,
    increment: number = 1
  ): { completed: boolean; currentCount: number; targetCount: number; xpAwarded: number } {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge '${challengeId}' not found`);

    const current = progress.challengeProgress.get(challengeId) || 0;
    if (current >= challenge.targetCount) {
      return { completed: true, currentCount: current, targetCount: challenge.targetCount, xpAwarded: 0 };
    }

    const updated = Math.min(challenge.targetCount, current + increment);
    progress.challengeProgress.set(challengeId, updated);

    let xpAwarded = 0;
    const completed = updated >= challenge.targetCount;
    if (completed) {
      xpAwarded = challenge.xpReward;
      this.addPassXp(progress, xpAwarded);
    }

    return {
      completed,
      currentCount: updated,
      targetCount: challenge.targetCount,
      xpAwarded,
    };
  }
}
