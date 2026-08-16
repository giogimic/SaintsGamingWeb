import { describe, it, expect } from 'vitest';
import {
  calculateItemPriceSummary,
  MarketTradeRecord,
} from './marketPriceEngine';

describe('Historical Market Price Guide & Volume Analytics Engine (Bible 15)', () => {
  it('returns current guide price when no trade history exists', () => {
    const summary = calculateItemPriceSummary([], 'equip_abyssal_whip', 1500000);
    expect(summary.guidePrice).toBe(1500000);
    expect(summary.totalVolume).toBe(0);
    expect(summary.priceTrend).toBe('STABLE');
    expect(summary.adjustedGuidePrice).toBe(1500000);
  });

  it('aggregates trade volume, calculates weighted average, and flags rising trends', () => {
    const history: MarketTradeRecord[] = [
      { tradeId: 't1', itemId: 'ore_runite', unitPrice: 11000, quantity: 10, timestamp: Date.now() },
      { tradeId: 't2', itemId: 'ore_runite', unitPrice: 12000, quantity: 10, timestamp: Date.now() },
    ];

    // Benchmark was 10000, weighted average is 11500 (+15% change -> RISING)
    const summary = calculateItemPriceSummary(history, 'ore_runite', 10000);

    expect(summary.totalVolume).toBe(20);
    expect(summary.dayHigh).toBe(12000);
    expect(summary.dayLow).toBe(11000);
    expect(summary.weightedAveragePrice).toBe(11500);
    expect(summary.priceTrend).toBe('RISING');

    // 5% daily swing guardrail limits adjustment from 10000 to 10500 (max +500)
    expect(summary.adjustedGuidePrice).toBe(10500);
  });

  it('flags falling trend when prices drop below 2%', () => {
    const history: MarketTradeRecord[] = [
      { tradeId: 't3', itemId: 'raw_shark', unitPrice: 700, quantity: 50, timestamp: Date.now() },
    ];

    // Benchmark was 800, weighted average is 700 (-12.5% change -> FALLING)
    const summary = calculateItemPriceSummary(history, 'raw_shark', 800);
    expect(summary.priceTrend).toBe('FALLING');
    expect(summary.adjustedGuidePrice).toBe(760); // 800 - (800 * 0.05 = 40) = 760
  });
});
