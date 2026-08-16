/**
 * Saints Gaming — Grand Exchange Order Book & Matchmaking Engine (Bible 15)
 * Manages buy/sell limit orders, price-time priority matchmaking, 1% tax sink, and escrow custody.
 */

export type OrderType = 'BUY' | 'SELL';
export type OrderStatus = 'ACTIVE' | 'PARTIALLY_FILLED' | 'COMPLETED' | 'CANCELLED';

export interface ExchangeOrder {
  orderId: string;
  playerId: string;
  type: OrderType;
  itemId: string;
  unitPrice: number;
  totalQuantity: number;
  filledQuantity: number;
  status: OrderStatus;
  createdAt: number;
  escrowCoins: number;
  escrowItems: number;
  reclaimedCoins: number;
  reclaimedItems: number;
}

export interface OrderBook {
  buyOrders: ExchangeOrder[];
  sellOrders: ExchangeOrder[];
}

export function createOrderBook(): OrderBook {
  return {
    buyOrders: [],
    sellOrders: [],
  };
}

/**
 * Creates and submits a new Grand Exchange limit order.
 */
export function placeOrder(
  book: OrderBook,
  playerId: string,
  type: OrderType,
  itemId: string,
  unitPrice: number,
  quantity: number
): { success: boolean; order?: ExchangeOrder; reason?: string } {
  if (unitPrice <= 0 || quantity <= 0) {
    return { success: false, reason: 'Price and quantity must be positive integers.' };
  }

  const order: ExchangeOrder = {
    orderId: `ord_${type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    playerId,
    type,
    itemId,
    unitPrice,
    totalQuantity: quantity,
    filledQuantity: 0,
    status: 'ACTIVE',
    createdAt: Date.now(),
    escrowCoins: type === 'BUY' ? unitPrice * quantity : 0,
    escrowItems: type === 'SELL' ? quantity : 0,
    reclaimedCoins: 0,
    reclaimedItems: 0,
  };

  if (type === 'BUY') {
    book.buyOrders.push(order);
  } else {
    book.sellOrders.push(order);
  }

  return { success: true, order };
}

/**
 * Matches buy and sell orders for an item using price-time priority.
 */
export function matchOrders(
  book: OrderBook,
  itemId: string
): Array<{
  buyerId: string;
  sellerId: string;
  itemId: string;
  quantity: number;
  tradePrice: number;
  taxPaid: number;
}> {
  const matchedTrades: Array<{
    buyerId: string;
    sellerId: string;
    itemId: string;
    quantity: number;
    tradePrice: number;
    taxPaid: number;
  }> = [];

  // Filter active orders for this item
  const buys = book.buyOrders
    .filter((o) => o.itemId === itemId && (o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED'))
    .sort((a, b) => b.unitPrice - a.unitPrice || a.createdAt - b.createdAt); // Highest buy price first

  const sells = book.sellOrders
    .filter((o) => o.itemId === itemId && (o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED'))
    .sort((a, b) => a.unitPrice - b.unitPrice || a.createdAt - b.createdAt); // Lowest sell price first

  for (const buy of buys) {
    for (const sell of sells) {
      if (buy.status === 'COMPLETED' || sell.status === 'COMPLETED') continue;

      if (buy.unitPrice >= sell.unitPrice) {
        // Match! Trade at the price of the older order
        const tradePrice = buy.createdAt < sell.createdAt ? buy.unitPrice : sell.unitPrice;
        const buyRemaining = buy.totalQuantity - buy.filledQuantity;
        const sellRemaining = sell.totalQuantity - sell.filledQuantity;
        const tradeQty = Math.min(buyRemaining, sellRemaining);

        if (tradeQty <= 0) continue;

        // 1% GE tax on seller proceeds (coin sink)
        const grossCoins = tradePrice * tradeQty;
        const taxPaid = Math.floor(grossCoins * 0.01);
        const netCoinsToSeller = grossCoins - taxPaid;

        // Update Buy Order
        buy.filledQuantity += tradeQty;
        buy.reclaimedItems += tradeQty;
        const buyerSpent = tradePrice * tradeQty;
        const buyerRefund = (buy.unitPrice - tradePrice) * tradeQty; // Price difference refund
        buy.escrowCoins -= (buyerSpent + buyerRefund);
        buy.reclaimedCoins += buyerRefund;

        if (buy.filledQuantity >= buy.totalQuantity) {
          buy.status = 'COMPLETED';
        } else {
          buy.status = 'PARTIALLY_FILLED';
        }

        // Update Sell Order
        sell.filledQuantity += tradeQty;
        sell.escrowItems -= tradeQty;
        sell.reclaimedCoins += netCoinsToSeller;

        if (sell.filledQuantity >= sell.totalQuantity) {
          sell.status = 'COMPLETED';
        } else {
          sell.status = 'PARTIALLY_FILLED';
        }

        matchedTrades.push({
          buyerId: buy.playerId,
          sellerId: sell.playerId,
          itemId,
          quantity: tradeQty,
          tradePrice,
          taxPaid,
        });
      }
    }
  }

  return matchedTrades;
}

/**
 * Cancels an unfulfilled order and releases remaining escrow.
 */
export function cancelOrder(
  book: OrderBook,
  orderId: string,
  playerId: string
): { success: boolean; refundedCoins: number; refundedItems: number; reason?: string } {
  const allOrders = [...book.buyOrders, ...book.sellOrders];
  const order = allOrders.find((o) => o.orderId === orderId && o.playerId === playerId);

  if (!order) {
    return { success: false, refundedCoins: 0, refundedItems: 0, reason: 'Order not found.' };
  }

  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
    return { success: false, refundedCoins: 0, refundedItems: 0, reason: 'Order is no longer active.' };
  }

  const unfulfilledQty = order.totalQuantity - order.filledQuantity;
  let refundedCoins = 0;
  let refundedItems = 0;

  if (order.type === 'BUY') {
    refundedCoins = order.unitPrice * unfulfilledQty;
    order.escrowCoins = 0;
  } else {
    refundedItems = unfulfilledQty;
    order.escrowItems = 0;
  }

  order.status = 'CANCELLED';

  return { success: true, refundedCoins, refundedItems };
}
