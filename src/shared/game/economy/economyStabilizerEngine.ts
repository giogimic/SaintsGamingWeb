/**
 * Saints Gaming — Economy Inflation Control, Sinks, Gold Velocity & Dynamic Market Stabilization Engine (Bible 07 & 21)
 * Manages realm macro-economy faucet/sink tracking, inflation index, GE buyback item destruction, and dynamic fee multipliers.
 */

export type FaucetType =
  | 'MONSTER_DROP'
  | 'HIGH_ALCHEMY'
  | 'QUEST_REWARD'
  | 'EXCHANGE_REFUND'
  | 'ADMIN_GRANT';

export type SinkType =
  | 'GE_TRANSACTION_TAX'
  | 'EQUIPMENT_REPAIR'
  | 'DEATH_RECLAIM'
  | 'HOUSE_CONSTRUCTION'
  | 'FAST_TRAVEL_FEE';

export interface MacroEconomyState {
  totalGoldGenerated: number;
  totalGoldDestroyed: number;
  activeCirculatingSupply: number;
  geTaxSinkFund: number; // Allocated fund from 1% GE tax for item buybacks
  itemsDeletedCount: number;
}

export type EconomicStatus = 'HEALTHY' | 'INFLATIONARY' | 'DEFLATIONARY';

export class EconomyStabilizerEngine {
  /**
   * Initializes default macro-economic state.
   */
  public initMacroEconomyState(initialCirculatingGold: number = 10000000): MacroEconomyState {
    return {
      totalGoldGenerated: initialCirculatingGold,
      totalGoldDestroyed: 0,
      activeCirculatingSupply: initialCirculatingGold,
      geTaxSinkFund: 0,
      itemsDeletedCount: 0,
    };
  }

  /**
   * Records newly generated gold into the economy.
   */
  public recordFaucet(
    state: MacroEconomyState,
    _type: FaucetType,
    amount: number
  ): MacroEconomyState {
    const cleanAmount = Math.max(0, Math.floor(amount));
    state.totalGoldGenerated += cleanAmount;
    state.activeCirculatingSupply += cleanAmount;
    return state;
  }

  /**
   * Records gold destroyed via permanent economy sinks.
   */
  public recordSink(
    state: MacroEconomyState,
    type: SinkType,
    amount: number
  ): MacroEconomyState {
    const cleanAmount = Math.max(0, Math.floor(amount));
    state.totalGoldDestroyed += cleanAmount;
    state.activeCirculatingSupply = Math.max(0, state.activeCirculatingSupply - cleanAmount);

    if (type === 'GE_TRANSACTION_TAX') {
      // 100% of GE tax is allocated into the Item Buyback Sink Fund
      state.geTaxSinkFund += cleanAmount;
    }

    return state;
  }

  /**
   * Computes the realm's Inflation Index and dynamic fee multiplier.
   */
  public calculateInflationIndex(state: MacroEconomyState): {
    inflationIndex: number;
    status: EconomicStatus;
    feeMultiplier: number;
  } {
    // Ratio of generated gold vs destroyed gold
    const totalDestroyed = Math.max(1, state.totalGoldDestroyed);
    const ratio = state.totalGoldGenerated / totalDestroyed;

    let status: EconomicStatus = 'HEALTHY';
    let feeMultiplier = 1.0;

    if (ratio > 2.5) {
      status = 'INFLATIONARY';
      // Scale fees up to +50% under severe inflationary pressure to burn excess gold
      feeMultiplier = Number(Math.min(1.5, 1.0 + (ratio - 2.5) * 0.1).toFixed(2));
    } else if (ratio < 1.0) {
      status = 'DEFLATIONARY';
      // Scale fees down to 0.75x to prevent economic stagnation
      feeMultiplier = Number(Math.max(0.75, 1.0 - (1.0 - ratio) * 0.25).toFixed(2));
    }

    return {
      inflationIndex: Number(ratio.toFixed(2)),
      status,
      feeMultiplier,
    };
  }

  /**
   * Executes automated Grand Exchange buybacks, deleting item supply from the game economy.
   */
  public executeGeItemBuyback(
    state: MacroEconomyState,
    targetItem: { itemId: string; itemName: string; marketPrice: number; availableMarketSupply: number }
  ): { success: boolean; itemsBoughtAndDeleted: number; goldSpent: number; state: MacroEconomyState } {
    if (state.geTaxSinkFund < targetItem.marketPrice || targetItem.availableMarketSupply <= 0) {
      return { success: false, itemsBoughtAndDeleted: 0, goldSpent: 0, state };
    }

    const maxCanAfford = Math.floor(state.geTaxSinkFund / targetItem.marketPrice);
    const toBuy = Math.min(targetItem.availableMarketSupply, maxCanAfford);
    const goldSpent = toBuy * targetItem.marketPrice;

    state.geTaxSinkFund -= goldSpent;
    state.itemsDeletedCount += toBuy;

    return {
      success: true,
      itemsBoughtAndDeleted: toBuy,
      goldSpent,
      state,
    };
  }

  /**
   * Calculates dynamic gravestone / death reclamation fee.
   */
  public calculateDeathReclaimFee(totalLostValue: number, inflationFeeMultiplier: number = 1.0): number {
    // Base 5% of item value
    const baseFee = Math.floor(totalLostValue * 0.05);
    return Math.floor(baseFee * inflationFeeMultiplier);
  }

  /**
   * Calculates equipment repair fees based on degradation level and economic fee multiplier.
   */
  public calculateRepairCost(
    baseRepairCost: number,
    itemDegradePercent: number, // 0 to 100
    inflationFeeMultiplier: number = 1.0
  ): number {
    const degradeRatio = Math.max(0, Math.min(100, itemDegradePercent)) / 100;
    const baseCost = baseRepairCost * degradeRatio;
    return Math.floor(baseCost * inflationFeeMultiplier);
  }
}
