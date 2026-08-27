/**
 * Saints Gaming — Creator Attribution, Royalty Distributions & Asset Monetization Engine (Bible 30–33)
 * Manages creator attribution trees, automated royalty splits, creator balance ledgers, and payout withdrawal claims.
 */

export interface AssetAttributionProfile {
  assetId: string;
  originalAuthorId: string;
  remixerAuthorId?: string;
  originalAuthorSharePercent: number; // e.g. 70 or 95
  remixerSharePercent: number; // e.g. 25 or 0
  platformFeePercent: number; // default 5
}

export interface RoyaltySplitResult {
  grossAmount: number;
  platformFee: number;
  originalAuthorAmount: number;
  remixerAmount: number;
}

export interface CreatorAccount {
  creatorId: string;
  availableGoldBalance: number;
  escrowGoldBalance: number;
  totalEarnedAllTime: number;
}

export class CreatorRoyaltyEngine {
  private attributions = new Map<string, AssetAttributionProfile>();

  /**
   * Registers or updates an asset's attribution and revenue share profile.
   */
  public registerAttribution(profile: AssetAttributionProfile) {
    this.attributions.set(profile.assetId, { ...profile });
  }

  /**
   * Retrieves an asset attribution profile by ID.
   */
  public getAttribution(assetId: string): AssetAttributionProfile | null {
    return this.attributions.get(assetId) || null;
  }

  /**
   * Computes the mathematical revenue distribution for an asset sale.
   */
  public calculateSplit(assetId: string, grossPrice: number): RoyaltySplitResult {
    const profile = this.getAttribution(assetId);

    const platformFeePercent = profile?.platformFeePercent ?? 5;
    const platformFee = Math.floor((grossPrice * platformFeePercent) / 100);

    const netPool = grossPrice - platformFee;

    if (!profile) {
      // Default to 100% net pool to platform / unknown
      return {
        grossAmount: grossPrice,
        platformFee,
        originalAuthorAmount: netPool,
        remixerAmount: 0,
      };
    }

    if (profile.remixerAuthorId && profile.remixerSharePercent > 0) {
      const remixerAmount = Math.floor((grossPrice * profile.remixerSharePercent) / 100);
      const originalAuthorAmount = netPool - remixerAmount;
      return {
        grossAmount: grossPrice,
        platformFee,
        originalAuthorAmount,
        remixerAmount,
      };
    }

    return {
      grossAmount: grossPrice,
      platformFee,
      originalAuthorAmount: netPool,
      remixerAmount: 0,
    };
  }

  /**
   * Processes a marketplace purchase, distributing earnings into creator accounts.
   */
  public processSale(
    assetId: string,
    grossPrice: number,
    accounts: Map<string, CreatorAccount>
  ): RoyaltySplitResult {
    const split = this.calculateSplit(assetId, grossPrice);
    const profile = this.getAttribution(assetId);

    if (profile?.originalAuthorId && split.originalAuthorAmount > 0) {
      const authorAcc = accounts.get(profile.originalAuthorId) || {
        creatorId: profile.originalAuthorId,
        availableGoldBalance: 0,
        escrowGoldBalance: 0,
        totalEarnedAllTime: 0,
      };
      authorAcc.availableGoldBalance += split.originalAuthorAmount;
      authorAcc.totalEarnedAllTime += split.originalAuthorAmount;
      accounts.set(profile.originalAuthorId, authorAcc);
    }

    if (profile?.remixerAuthorId && split.remixerAmount > 0) {
      const remixerAcc = accounts.get(profile.remixerAuthorId) || {
        creatorId: profile.remixerAuthorId,
        availableGoldBalance: 0,
        escrowGoldBalance: 0,
        totalEarnedAllTime: 0,
      };
      remixerAcc.availableGoldBalance += split.remixerAmount;
      remixerAcc.totalEarnedAllTime += split.remixerAmount;
      accounts.set(profile.remixerAuthorId, remixerAcc);
    }

    return split;
  }

  /**
   * Validates and executes a creator payout withdrawal claim.
   */
  public claimPayout(
    account: CreatorAccount,
    claimAmount: number,
    minThreshold: number = 10000
  ): { success: boolean; claimed: number; remaining: number; reason?: string } {
    if (claimAmount <= 0) {
      return { success: false, claimed: 0, remaining: account.availableGoldBalance, reason: 'Invalid claim amount' };
    }

    if (claimAmount < minThreshold) {
      return {
        success: false,
        claimed: 0,
        remaining: account.availableGoldBalance,
        reason: `Claim amount below minimum threshold (${minThreshold} Gold)`,
      };
    }

    if (account.availableGoldBalance < claimAmount) {
      return {
        success: false,
        claimed: 0,
        remaining: account.availableGoldBalance,
        reason: 'Insufficient available creator balance',
      };
    }

    account.availableGoldBalance -= claimAmount;

    return {
      success: true,
      claimed: claimAmount,
      remaining: account.availableGoldBalance,
    };
  }
}
