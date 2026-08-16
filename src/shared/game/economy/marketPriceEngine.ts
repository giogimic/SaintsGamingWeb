/**
 * Saints Gaming — Historical Market Price Guide & Volume Analytics Engine (Bible 15)
 * Analyzes market trade history, daily volume, high/low spread, and moving average guide prices.
 */

export interface MarketTradeRecord {
  tradeId: string;
  itemId: string;
  unitPrice: number;
  quantity: number;
  timestamp: number;
}

export type PriceTrend = 'RISING' | 'FALLING' | 'STABLE';

export interface ItemPriceSummary {
  itemId: string;
  guidePrice: number;
  dayHigh: number;
  dayLow: number;
  totalVolume: number;
  weightedAveragePrice: number;
  priceTrend: PriceTrend;
  adjustedGuidePrice: number; // Daily guide adjustment (bounded by ±5% max daily swing)
}

/**
 * Calculates item price analytics and adjusted guide price based on recent trade history.
 */
export function calculateItemPriceSummary(
  tradeHistory: MarketTradeRecord[],
  itemId: string,
  currentGuidePrice: number
): ItemPriceSummary {
  const itemTrades = tradeHistory.filter((t) => t.itemId === itemId);

  if (itemTrades.length === 0) {
    return {
      itemId,
      guidePrice: currentGuidePrice,
      dayHigh: currentGuidePrice,
      dayLow: currentGuidePrice,
      totalVolume: 0,
      weightedAveragePrice: currentGuidePrice,
      priceTrend: 'STABLE',
      adjustedGuidePrice: currentGuidePrice,
    };
  }

  let totalCoins = 0;
  let totalVolume = 0;
  let dayHigh = Number.MIN_SAFE_INTEGER;
  let dayLow = Number.MAX_SAFE_INTEGER;

  for (const trade of itemTrades) {
    totalCoins += trade.unitPrice * trade.quantity;
    totalVolume += trade.quantity;
    if (trade.unitPrice > dayHigh) dayHigh = trade.unitPrice;
    if (trade.unitPrice < dayLow) dayLow = trade.unitPrice;
  }

  const weightedAverage = Math.round(totalCoins / totalVolume);

  // Price trend evaluation against existing guide price
  const percentDelta = (weightedAverage - currentGuidePrice) / currentGuidePrice;
  let priceTrend: PriceTrend = 'STABLE';
  if (percentDelta > 0.02) priceTrend = 'RISING';
  else if (percentDelta < -0.02) priceTrend = 'FALLING';

  // 5% daily swing guardrail for guide price updates
  const maxSwing = Math.round(currentGuidePrice * 0.05);
  const rawDelta = weightedAverage - currentGuidePrice;
  const clampedDelta = Math.max(-maxSwing, Math.min(maxSwing, rawDelta));
  const adjustedGuidePrice = Math.max(1, currentGuidePrice + clampedDelta);

  return {
    itemId,
    guidePrice: currentGuidePrice,
    dayHigh,
    dayLow,
    totalVolume,
    weightedAveragePrice: weightedAverage,
    priceTrend,
    adjustedGuidePrice,
  };
}
