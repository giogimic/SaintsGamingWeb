import { describe, it, expect } from 'vitest';
import {
  createOrderBook,
  placeOrder,
  matchOrders,
  cancelOrder,
} from './exchangeEngine';

describe('Grand Exchange Order Book & Matchmaking Engine (Bible 15)', () => {
  it('places buy and sell limit orders and matches them with price-time priority and 1% tax sink', () => {
    const book = createOrderBook();

    // Seller offers 10x Shark at 800 coins each
    const sell = placeOrder(book, 'player_seller', 'SELL', 'raw_shark', 800, 10);
    expect(sell.success).toBe(true);
    expect(sell.order?.escrowItems).toBe(10);

    // Buyer bids for 5x Shark at 900 coins each (willing to pay more)
    const buy = placeOrder(book, 'player_buyer', 'BUY', 'raw_shark', 900, 5);
    expect(buy.success).toBe(true);
    expect(buy.order?.escrowCoins).toBe(4500);

    // Match orders!
    const trades = matchOrders(book, 'raw_shark');
    expect(trades.length).toBe(1);
    expect(trades[0].quantity).toBe(5);
    expect(trades[0].tradePrice).toBe(800); // Traded at earlier sell order price (800)
    expect(trades[0].taxPaid).toBe(40); // 1% of 4000 = 40 coins sink

    // Buyer received 5 items, spent 4000 coins, refunded 500 excess coins
    expect(buy.order?.status).toBe('COMPLETED');
    expect(buy.order?.reclaimedItems).toBe(5);
    expect(buy.order?.reclaimedCoins).toBe(500);

    // Seller has partially filled order (5 remaining)
    expect(sell.order?.status).toBe('PARTIALLY_FILLED');
    expect(sell.order?.filledQuantity).toBe(5);
    expect(sell.order?.reclaimedCoins).toBe(3960); // 4000 - 40 tax
  });

  it('cancels unfulfilled orders and refunds remaining escrow', () => {
    const book = createOrderBook();
    const buy = placeOrder(book, 'player_buyer', 'BUY', 'rune_death', 200, 50);

    const cancel = cancelOrder(book, buy.order!.orderId, 'player_buyer');
    expect(cancel.success).toBe(true);
    expect(cancel.refundedCoins).toBe(10000); // 200 * 50
    expect(buy.order?.status).toBe('CANCELLED');
  });
});
