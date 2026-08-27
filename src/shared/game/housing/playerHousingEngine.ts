/**
 * Saints Gaming — Master Player Housing & Real Estate Land Auction Bidding Engine (Bible 17, 21, 27)
 * Manages land plot zoning, timed auction bidding with escrow locking and anti-snipe extensions, and furniture grid placement validation.
 */

export type LandPlotZoning =
  | 'RESIDENTIAL_SANCTUARY'
  | 'GUILD_ESTATE'
  | 'COMMERCIAL_SHOPFRONT'
  | 'WILDERNESS_OUTPOST';

export type PlotSizeTier = 'SMALL_COTTAGE' | 'MEDIUM_MANOR' | 'GRAND_ESTATE';

export interface LandPlot {
  plotId: string;
  regionId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zoning: LandPlotZoning;
  sizeTier: PlotSizeTier;
  ownerId?: string;
  weeklyTaxGold: number;
  lastTaxPaidTimestamp?: number;
}

export interface LandAuction {
  auctionId: string;
  plotId: string;
  startingBidGold: number;
  highestBidGold: number;
  highestBidderId?: string;
  startTime: number;
  endTime: number;
  status: 'ACTIVE' | 'SETTLED' | 'CANCELLED';
  escrows: Map<string, number>;
}

export interface FurnitureDecorPlacement {
  instanceId: string;
  itemId: string;
  tileX: number;
  tileY: number;
  rotationDeg: 0 | 90 | 180 | 270;
  footprintWidth: number;
  footprintHeight: number;
}

export class PlayerHousingEngine {
  private plots = new Map<string, LandPlot>();
  private auctions = new Map<string, LandAuction>();

  /**
   * Registers a land plot in the real estate atlas.
   */
  public registerPlot(plot: LandPlot) {
    this.plots.set(plot.plotId, { ...plot });
  }

  /**
   * Retrieves a land plot by ID.
   */
  public getPlot(plotId: string): LandPlot | null {
    return this.plots.get(plotId) || null;
  }

  /**
   * Starts a timed land auction for a plot.
   */
  public createAuction(
    plotId: string,
    startingBidGold: number,
    durationMs: number,
    nowMs: number = Date.now()
  ): LandAuction {
    const plot = this.getPlot(plotId);
    if (!plot) throw new Error(`Plot ${plotId} not found`);

    const auction: LandAuction = {
      auctionId: `auc_${plotId}_${nowMs}`,
      plotId,
      startingBidGold,
      highestBidGold: 0,
      startTime: nowMs,
      endTime: nowMs + durationMs,
      status: 'ACTIVE',
      escrows: new Map<string, number>(),
    };

    this.auctions.set(auction.auctionId, auction);
    return auction;
  }

  /**
   * Places a bid with escrow locking, minimum 5% increment, and anti-snipe 3-minute extension.
   */
  public placeBid(
    auctionId: string,
    bidderId: string,
    bidAmount: number,
    nowMs: number = Date.now()
  ): {
    success: boolean;
    outbidId?: string;
    refundedGold?: number;
    newEndTime?: number;
    error?: string;
  } {
    const auction = this.auctions.get(auctionId);
    if (!auction || auction.status !== 'ACTIVE') {
      return { success: false, error: 'Auction is not active' };
    }

    if (nowMs > auction.endTime) {
      return { success: false, error: 'Auction has ended' };
    }

    const minBid =
      auction.highestBidGold === 0
        ? auction.startingBidGold
        : Math.ceil(auction.highestBidGold * 1.05);

    if (bidAmount < minBid) {
      return {
        success: false,
        error: `Bid amount ${bidAmount} is below required minimum ${minBid} gold`,
      };
    }

    const previousHighestBidder = auction.highestBidderId;
    const previousHighestBid = auction.highestBidGold;

    // Refund previous bidder escrow
    let refundedGold: number | undefined;
    if (previousHighestBidder && previousHighestBid > 0) {
      auction.escrows.delete(previousHighestBidder);
      refundedGold = previousHighestBid;
    }

    // Lock new bidder escrow
    auction.highestBidderId = bidderId;
    auction.highestBidGold = bidAmount;
    auction.escrows.set(bidderId, bidAmount);

    // Anti-snipe extension: if bid placed in last 2 minutes, extend by 3 minutes
    let newEndTime: number | undefined;
    const timeLeft = auction.endTime - nowMs;
    if (timeLeft <= 2 * 60 * 1000) {
      auction.endTime = nowMs + 3 * 60 * 1000;
      newEndTime = auction.endTime;
    }

    return {
      success: true,
      outbidId: previousHighestBidder,
      refundedGold,
      newEndTime,
    };
  }

  /**
   * Settles a finished auction, transferring deed ownership to the winning bidder.
   */
  public settleAuction(
    auctionId: string,
    nowMs: number = Date.now()
  ): {
    success: boolean;
    winnerId?: string;
    winningBid?: number;
    plot?: LandPlot;
    error?: string;
  } {
    const auction = this.auctions.get(auctionId);
    if (!auction || auction.status !== 'ACTIVE') {
      return { success: false, error: 'Auction is not active' };
    }

    if (nowMs < auction.endTime) {
      return { success: false, error: 'Auction time has not yet expired' };
    }

    if (!auction.highestBidderId) {
      auction.status = 'CANCELLED';
      return { success: false, error: 'Auction ended with no bids' };
    }

    const plot = this.getPlot(auction.plotId);
    if (!plot) return { success: false, error: 'Plot not found' };

    plot.ownerId = auction.highestBidderId;
    plot.lastTaxPaidTimestamp = nowMs;
    auction.status = 'SETTLED';

    return {
      success: true,
      winnerId: auction.highestBidderId,
      winningBid: auction.highestBidGold,
      plot,
    };
  }

  /**
   * Validates interior furniture decor item placement within room bounds and checks for collisions.
   */
  public validateFurniturePlacement(
    roomWidth: number,
    roomHeight: number,
    existingFurniture: FurnitureDecorPlacement[],
    newPlacement: FurnitureDecorPlacement
  ): { valid: boolean; error?: string } {
    // Determine effective footprint considering rotation
    const isRotated = newPlacement.rotationDeg === 90 || newPlacement.rotationDeg === 270;
    const effectiveW = isRotated ? newPlacement.footprintHeight : newPlacement.footprintWidth;
    const effectiveH = isRotated ? newPlacement.footprintWidth : newPlacement.footprintHeight;

    // Check room bounds
    if (
      newPlacement.tileX < 0 ||
      newPlacement.tileY < 0 ||
      newPlacement.tileX + effectiveW > roomWidth ||
      newPlacement.tileY + effectiveH > roomHeight
    ) {
      return { valid: false, error: 'Furniture exceeds room boundary constraints' };
    }

    // Check collision against other furniture
    const newLeft = newPlacement.tileX;
    const newRight = newPlacement.tileX + effectiveW;
    const newTop = newPlacement.tileY;
    const newBottom = newPlacement.tileY + effectiveH;

    for (const item of existingFurniture) {
      if (item.instanceId === newPlacement.instanceId) continue;

      const itemRotated = item.rotationDeg === 90 || item.rotationDeg === 270;
      const itemW = itemRotated ? item.footprintHeight : item.footprintWidth;
      const itemH = itemRotated ? item.footprintWidth : item.footprintHeight;

      const itemLeft = item.tileX;
      const itemRight = item.tileX + itemW;
      const itemTop = item.tileY;
      const itemBottom = item.tileY + itemH;

      const overlaps =
        newLeft < itemRight &&
        newRight > itemLeft &&
        newTop < itemBottom &&
        newBottom > itemTop;

      if (overlaps) {
        return {
          valid: false,
          error: `Collision detected with existing furniture ${item.itemId}`,
        };
      }
    }

    return { valid: true };
  }
}
