import { describe, expect, it } from 'vitest';
import { EconomyStabilizerEngine } from './economyStabilizerEngine';

describe('Economy Inflation Control, Sinks & Dynamic Market Stabilization Engine (Phase 27)', () => {
  it('tracks macro-economic faucets, sinks, and GE buyback funds accurately', () => {
    const engine = new EconomyStabilizerEngine();
    const state = engine.initMacroEconomyState(1000000); // 1M circulating

    // 1. Monster drop faucet: +500,000 gold
    engine.recordFaucet(state, 'MONSTER_DROP', 500000);
    expect(state.totalGoldGenerated).toBe(1500000);
    expect(state.activeCirculatingSupply).toBe(1500000);

    // 2. GE Tax Sink: 50,000 gold destroyed
    engine.recordSink(state, 'GE_TRANSACTION_TAX', 50000);
    expect(state.totalGoldDestroyed).toBe(50000);
    expect(state.activeCirculatingSupply).toBe(1450000);
    expect(state.geTaxSinkFund).toBe(50000);
  });

  it('computes inflation indices and adjusts economic fee multipliers dynamically', () => {
    const engine = new EconomyStabilizerEngine();

    // 1. Inflationary state: 3,000,000 generated vs 500,000 destroyed (6.0 ratio > 2.5)
    const infState = {
      totalGoldGenerated: 3000000,
      totalGoldDestroyed: 500000,
      activeCirculatingSupply: 2500000,
      geTaxSinkFund: 0,
      itemsDeletedCount: 0,
    };
    const infRes = engine.calculateInflationIndex(infState);
    expect(infRes.status).toBe('INFLATIONARY');
    expect(infRes.feeMultiplier).toBeGreaterThan(1.0);

    // 2. Balanced / Healthy state: 1,500,000 generated vs 1,000,000 destroyed (1.5 ratio)
    const healthyState = {
      totalGoldGenerated: 1500000,
      totalGoldDestroyed: 1000000,
      activeCirculatingSupply: 500000,
      geTaxSinkFund: 0,
      itemsDeletedCount: 0,
    };
    const healthyRes = engine.calculateInflationIndex(healthyState);
    expect(healthyRes.status).toBe('HEALTHY');
    expect(healthyRes.feeMultiplier).toBe(1.0);
  });

  it('executes automated Grand Exchange buybacks and deletes excess market supply', () => {
    const engine = new EconomyStabilizerEngine();
    const state = {
      totalGoldGenerated: 5000000,
      totalGoldDestroyed: 1000000,
      activeCirculatingSupply: 4000000,
      geTaxSinkFund: 300000, // 300k available in fund
      itemsDeletedCount: 0,
    };

    // Item costs 100k, 5 available on market -> engine buys 3 and deletes them
    const res = engine.executeGeItemBuyback(state, {
      itemId: 'weapon_abyssal_blade',
      itemName: 'Abyssal Blade',
      marketPrice: 100000,
      availableMarketSupply: 5,
    });

    expect(res.success).toBe(true);
    expect(res.itemsBoughtAndDeleted).toBe(3);
    expect(res.goldSpent).toBe(300000);
    expect(state.geTaxSinkFund).toBe(0);
    expect(state.itemsDeletedCount).toBe(3);
  });

  it('calculates death reclamation fees and degradation repair costs with fee multipliers', () => {
    const engine = new EconomyStabilizerEngine();

    // 1. Death reclaim: 100,000 lost value * 5% base = 5,000 (with 1.2x inflation fee = 6,000)
    const reclaimFee = engine.calculateDeathReclaimFee(100000, 1.2);
    expect(reclaimFee).toBe(6000);

    // 2. Equipment repair: 50,000 base cost, 50% degraded = 25,000 (with 1.2x inflation fee = 30,000)
    const repairCost = engine.calculateRepairCost(50000, 50, 1.2);
    expect(repairCost).toBe(30000);
  });
});
