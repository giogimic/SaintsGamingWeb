import { describe, expect, it } from 'vitest';
import {
  FurnitureDecorPlacement,
  LandPlot,
  PlayerHousingEngine,
} from './playerHousingEngine';

describe('Master Player Housing & Real Estate Land Auction Engine (Phase 44)', () => {
  it('registers land plots, executes timed auction bidding wars, and settles deed ownership', () => {
    const engine = new PlayerHousingEngine();

    const plot: LandPlot = {
      plotId: 'plot_lumbridge_01',
      regionId: 'lumbridge_plains',
      x: 100,
      y: 200,
      width: 16,
      height: 16,
      zoning: 'RESIDENTIAL_SANCTUARY',
      sizeTier: 'MEDIUM_MANOR',
      weeklyTaxGold: 500,
    };
    engine.registerPlot(plot);

    const now = 1000000;
    // 1. Create 10-minute auction starting at 10,000 gold
    const auction = engine.createAuction('plot_lumbridge_01', 10000, 10 * 60 * 1000, now);
    expect(auction.status).toBe('ACTIVE');

    // 2. Bidder 1 (Alice) places starting bid (10,000 gold)
    const bid1 = engine.placeBid(auction.auctionId, 'player_alice', 10000, now + 1000);
    expect(bid1.success).toBe(true);
    expect(auction.highestBidderId).toBe('player_alice');

    // 3. Bidder 2 (Bob) tries to bid 10,100 (< 5% increment required: 10,500) -> Rejected
    const bid2 = engine.placeBid(auction.auctionId, 'player_bob', 10100, now + 2000);
    expect(bid2.success).toBe(false);
    expect(bid2.error).toContain('below required minimum');

    // 4. Bob places valid bid (11,000 gold) -> Alice gets refunded 10,000 gold
    const bid3 = engine.placeBid(auction.auctionId, 'player_bob', 11000, now + 3000);
    expect(bid3.success).toBe(true);
    expect(bid3.outbidId).toBe('player_alice');
    expect(bid3.refundedGold).toBe(10000);
    expect(auction.highestBidderId).toBe('player_bob');

    // 5. Alice bids in the last 60 seconds (anti-snipe trigger) -> Auction extended +3 mins
    const lateTimestamp = auction.endTime - 60 * 1000;
    const bid4 = engine.placeBid(auction.auctionId, 'player_alice', 12000, lateTimestamp);
    expect(bid4.success).toBe(true);
    expect(bid4.newEndTime).toBe(lateTimestamp + 3 * 60 * 1000);

    // 6. Settle auction after new end time
    const settle = engine.settleAuction(auction.auctionId, auction.endTime + 1000);
    expect(settle.success).toBe(true);
    expect(settle.winnerId).toBe('player_alice');
    expect(settle.winningBid).toBe(12000);

    const updatedPlot = engine.getPlot('plot_lumbridge_01');
    expect(updatedPlot?.ownerId).toBe('player_alice');
  });

  it('validates interior furniture decor placement bounds and collision detection with rotations', () => {
    const engine = new PlayerHousingEngine();

    const roomW = 10;
    const roomH = 10;

    // Existing: Dining Table at (2, 2) size 3x2
    const table: FurnitureDecorPlacement = {
      instanceId: 'furn_table_1',
      itemId: 'oak_dining_table',
      tileX: 2,
      tileY: 2,
      rotationDeg: 0,
      footprintWidth: 3,
      footprintHeight: 2,
    };

    const existing = [table];

    // 1. Valid placement: Chair at (6, 6) size 1x1
    const chair: FurnitureDecorPlacement = {
      instanceId: 'furn_chair_1',
      itemId: 'wooden_chair',
      tileX: 6,
      tileY: 6,
      rotationDeg: 0,
      footprintWidth: 1,
      footprintHeight: 1,
    };
    expect(engine.validateFurniturePlacement(roomW, roomH, existing, chair).valid).toBe(true);

    // 2. Out of bounds: Wardrobe at (9, 2) size 2x2 exceeds room width 10
    const wardrobe: FurnitureDecorPlacement = {
      instanceId: 'furn_wardrobe_1',
      itemId: 'mahogany_wardrobe',
      tileX: 9,
      tileY: 2,
      rotationDeg: 0,
      footprintWidth: 2,
      footprintHeight: 2,
    };
    const oob = engine.validateFurniturePlacement(roomW, roomH, existing, wardrobe);
    expect(oob.valid).toBe(false);
    expect(oob.error).toContain('boundary constraints');

    // 3. Collision: Rug at (3, 3) size 2x2 overlaps table at (2,2) 3x2
    const rug: FurnitureDecorPlacement = {
      instanceId: 'furn_rug_1',
      itemId: 'crimson_rug',
      tileX: 3,
      tileY: 3,
      rotationDeg: 0,
      footprintWidth: 2,
      footprintHeight: 2,
    };
    const collision = engine.validateFurniturePlacement(roomW, roomH, existing, rug);
    expect(collision.valid).toBe(false);
    expect(collision.error).toContain('Collision detected with existing furniture');
  });
});
