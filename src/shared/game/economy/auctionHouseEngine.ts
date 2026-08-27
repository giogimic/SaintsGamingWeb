/**
 * Saints Gaming — Master Realm Economy Auction House & Escrow Orderbook Matching Engine (Bible 02, 14, 21, 27, 33)
 * Manages asynchronous listings, instant buyouts, limit orderbook matching, 2% realm sales tax sink, and mailbox escrow delivery.
 */

export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';

export interface AuctionListing {
  listingId: string;
  sellerId: string;
  itemId: string;
  itemUid?: string;
  quantity: number;
  unitPriceGold: number;
  depositFeeGold: number;
  createdAt: number;
  expiresAt: number;
  status: ListingStatus;
}

export interface LimitBuyOrder {
  orderId: string;
  buyerId: string;
  itemId: string;
  quantity: number;
  maxUnitPriceGold: number;
  escrowLockedGold: number;
  createdAt: number;
  filledQuantity: number;
  status: 'ACTIVE' | 'FILLED' | 'CANCELLED';
}

export interface MailboxClaimItem {
  claimId: string;
  recipientId: string;
  item?: { itemId: string; itemUid?: string; quantity: number };
  gold?: number;
  reason: string;
  timestamp: number;
  isClaimed: boolean;
}

export class AuctionHouseEngine {
  private listings = new Map<string, AuctionListing>();
  private buyOrders = new Map<string, LimitBuyOrder>();
  private mailboxes: MailboxClaimItem[] = [];

  private readonly SALES_TAX_PCT = 0.02; // 2% sink
  private readonly DEPOSIT_PCT = 0.05; // 5% refundable on sale

  /**
   * Creates a new sell listing, calculating deposit fee and expiry.
   */
  public createSellListing(
    sellerId: string,
    itemId: string,
    quantity: number,
    unitPriceGold: number,
    durationHours: number = 24,
    itemUid?: string,
    nowMs: number = Date.now()
  ): { listing: AuctionListing; depositFee: number } {
    const totalPrice = unitPriceGold * quantity;
    const depositFee = Math.max(1, Math.round(totalPrice * this.DEPOSIT_PCT));

    const listing: AuctionListing = {
      listingId: `list_${sellerId}_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
      sellerId,
      itemId,
      itemUid,
      quantity,
      unitPriceGold,
      depositFeeGold: depositFee,
      createdAt: nowMs,
      expiresAt: nowMs + durationHours * 3600 * 1000,
      status: 'ACTIVE',
    };

    this.listings.set(listing.listingId, listing);

    // Auto-match against existing buy orders
    this.matchOrderbook(itemId);

    return { listing, depositFee };
  }

  /**
   * Creates a limit buy order with locked gold escrow and checks for instant orderbook matches.
   */
  public createLimitBuyOrder(
    buyerId: string,
    itemId: string,
    quantity: number,
    maxUnitPriceGold: number,
    nowMs: number = Date.now()
  ): { order: LimitBuyOrder; matchesExecuted: number } {
    const totalGoldEscrow = quantity * maxUnitPriceGold;

    const order: LimitBuyOrder = {
      orderId: `buy_${buyerId}_${nowMs}_${Math.random().toString(36).slice(2, 7)}`,
      buyerId,
      itemId,
      quantity,
      maxUnitPriceGold,
      escrowLockedGold: totalGoldEscrow,
      createdAt: nowMs,
      filledQuantity: 0,
      status: 'ACTIVE',
    };

    this.buyOrders.set(order.orderId, order);

    const matchesExecuted = this.matchOrderbook(itemId, nowMs);

    return { order, matchesExecuted };
  }

  /**
   * Executes an instant buyout for an active listing.
   */
  public executeInstantBuyout(
    buyerId: string,
    listingId: string,
    quantityToBuy?: number,
    nowMs: number = Date.now()
  ): {
    success: boolean;
    goldSpent: number;
    salesTaxSink: number;
    sellerProceeds: number;
    remainingListingQuantity: number;
    error?: string;
  } {
    const listing = this.listings.get(listingId);
    if (!listing || listing.status !== 'ACTIVE') {
      return {
        success: false,
        goldSpent: 0,
        salesTaxSink: 0,
        sellerProceeds: 0,
        remainingListingQuantity: 0,
        error: 'Listing is not active or available',
      };
    }

    if (nowMs > listing.expiresAt) {
      listing.status = 'EXPIRED';
      return {
        success: false,
        goldSpent: 0,
        salesTaxSink: 0,
        sellerProceeds: 0,
        remainingListingQuantity: 0,
        error: 'Listing has expired',
      };
    }

    const buyQty = Math.min(listing.quantity, quantityToBuy || listing.quantity);
    const goldSpent = buyQty * listing.unitPriceGold;
    const salesTaxSink = Math.round(goldSpent * this.SALES_TAX_PCT);
    const depositRefund =
      buyQty === listing.quantity
        ? listing.depositFeeGold
        : Math.round((buyQty / listing.quantity) * listing.depositFeeGold);

    const sellerProceeds = goldSpent - salesTaxSink + depositRefund;

    listing.quantity -= buyQty;
    if (listing.quantity === 0) {
      listing.status = 'SOLD';
    }

    // Deliver item to buyer's mailbox
    this.mailboxes.push({
      claimId: `claim_${buyerId}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId: buyerId,
      item: {
        itemId: listing.itemId,
        itemUid: listing.itemUid,
        quantity: buyQty,
      },
      reason: `Purchased from Auction House (${listing.itemId} x${buyQty})`,
      timestamp: nowMs,
      isClaimed: false,
    });

    // Deliver gold to seller's mailbox
    this.mailboxes.push({
      claimId: `claim_${listing.sellerId}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      recipientId: listing.sellerId,
      gold: sellerProceeds,
      reason: `Sale Proceeds (${listing.itemId} x${buyQty}) - Tax ${salesTaxSink}g`,
      timestamp: nowMs,
      isClaimed: false,
    });

    return {
      success: true,
      goldSpent,
      salesTaxSink,
      sellerProceeds,
      remainingListingQuantity: listing.quantity,
    };
  }

  /**
   * Continuous double-auction orderbook matcher.
   */
  private matchOrderbook(itemId: string, nowMs: number = Date.now()): number {
    let matchCount = 0;

    const activeListings = Array.from(this.listings.values())
      .filter((l) => l.itemId === itemId && l.status === 'ACTIVE' && l.expiresAt > nowMs)
      .sort((a, b) => a.unitPriceGold - b.unitPriceGold); // Lowest ask first

    const activeBuyOrders = Array.from(this.buyOrders.values())
      .filter((b) => b.itemId === itemId && b.status === 'ACTIVE')
      .sort((a, b) => b.maxUnitPriceGold - a.maxUnitPriceGold); // Highest bid first

    for (const buy of activeBuyOrders) {
      for (const sell of activeListings) {
        if (buy.status !== 'ACTIVE' || sell.status !== 'ACTIVE') continue;

        if (buy.maxUnitPriceGold >= sell.unitPriceGold) {
          const needed = buy.quantity - buy.filledQuantity;
          const fillQty = Math.min(needed, sell.quantity);

          if (fillQty > 0) {
            this.executeInstantBuyout(buy.buyerId, sell.listingId, fillQty, nowMs);
            buy.filledQuantity += fillQty;
            matchCount++;

            if (buy.filledQuantity >= buy.quantity) {
              buy.status = 'FILLED';
            }
          }
        }
      }
    }

    return matchCount;
  }

  /**
   * Retrieves player's mailbox claim items.
   */
  public getMailbox(recipientId: string): MailboxClaimItem[] {
    return this.mailboxes.filter((m) => m.recipientId === recipientId && !m.isClaimed);
  }

  /**
   * Claims all pending items and gold in player's mailbox.
   */
  public claimMailbox(recipientId: string): {
    claimedGold: number;
    claimedItems: Array<{ itemId: string; itemUid?: string; quantity: number }>;
  } {
    let claimedGold = 0;
    const claimedItems: Array<{ itemId: string; itemUid?: string; quantity: number }> = [];

    for (const mail of this.mailboxes) {
      if (mail.recipientId === recipientId && !mail.isClaimed) {
        mail.isClaimed = true;
        if (mail.gold) claimedGold += mail.gold;
        if (mail.item) claimedItems.push({ ...mail.item });
      }
    }

    return { claimedGold, claimedItems };
  }
}
