import { describe, expect, it } from 'vitest';
import { AuctionHouseEngine } from './auctionHouseEngine';

describe('Master Realm Economy Auction House & Orderbook Engine (Phase 49)', () => {
  it('creates sell listings, processes instant buyouts, and deducts 2% sales tax sink', () => {
    const engine = new AuctionHouseEngine();

    const now = 1000000;
    // 1. Seller Alice lists 10 Magic Logs at 100g each (total 1000g, 5% deposit = 50g)
    const { listing, depositFee } = engine.createSellListing(
      'player_alice',
      'magic_logs',
      10,
      100,
      24,
      undefined,
      now
    );

    expect(depositFee).toBe(50);
    expect(listing.status).toBe('ACTIVE');

    // 2. Buyer Bob buys 5 Magic Logs (cost 500g, 2% tax = 10g, deposit refund 25g, proceeds = 500 - 10 + 25 = 515g)
    const buyout = engine.executeInstantBuyout('player_bob', listing.listingId, 5, now + 1000);
    expect(buyout.success).toBe(true);
    expect(buyout.goldSpent).toBe(500);
    expect(buyout.salesTaxSink).toBe(10);
    expect(buyout.sellerProceeds).toBe(515);
    expect(buyout.remainingListingQuantity).toBe(5);

    // 3. Check Mailboxes
    const bobMail = engine.getMailbox('player_bob');
    expect(bobMail).toHaveLength(1);
    expect(bobMail[0].item?.itemId).toBe('magic_logs');
    expect(bobMail[0].item?.quantity).toBe(5);

    const aliceMail = engine.getMailbox('player_alice');
    expect(aliceMail).toHaveLength(1);
    expect(aliceMail[0].gold).toBe(515);

    // 4. Bob claims his mailbox
    const bobClaim = engine.claimMailbox('player_bob');
    expect(bobClaim.claimedItems).toHaveLength(1);
    expect(bobClaim.claimedItems[0].quantity).toBe(5);
    expect(engine.getMailbox('player_bob')).toHaveLength(0);
  });

  it('matches limit buy orders against active sell listings in the orderbook', () => {
    const engine = new AuctionHouseEngine();

    const now = 2000000;
    // 1. Seller Charlie lists 20 Runite Ore at 250g each
    engine.createSellListing('player_charlie', 'runite_ore', 20, 250, 24, undefined, now);

    // 2. Buyer David submits a Limit Buy Order for 15 Runite Ore at up to 260g each
    const { order, matchesExecuted } = engine.createLimitBuyOrder(
      'player_david',
      'runite_ore',
      15,
      260,
      now + 1000
    );

    expect(matchesExecuted).toBe(1);
    expect(order.status).toBe('FILLED');
    expect(order.filledQuantity).toBe(15);

    // 3. Verify David received 15 Runite Ore in his mailbox
    const davidMail = engine.getMailbox('player_david');
    expect(davidMail).toHaveLength(1);
    expect(davidMail[0].item?.quantity).toBe(15);
  });
});
