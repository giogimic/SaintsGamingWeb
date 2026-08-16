/**
 * Saints Gaming — Forge & Anvil Smithing Matrix Engine (Bible 14)
 * Manages ore smelting at furnaces, bar forging at anvils, hammer checks, and smithing XP formulas.
 */

export type MetalTier =
  | 'BRONZE'
  | 'IRON'
  | 'STEEL'
  | 'MITHRIL'
  | 'ADAMANT'
  | 'RUNE'
  | 'SAINTS_GOLD';

export interface SmeltingRecipe {
  barItemId: string;
  name: string;
  reqSmithingLevel: number;
  oresRequired: Record<string, number>; // e.g. { ore_copper: 1, ore_tin: 1 }
  xpAwarded: number;
}

export interface ForgingRecipe {
  productId: string;
  name: string;
  metalTier: MetalTier;
  barsRequired: number;
  reqSmithingLevel: number;
  xpAwarded: number;
}

export const CANONICAL_SMELTING_RECIPES: Record<string, SmeltingRecipe> = {
  bar_bronze: {
    barItemId: 'bar_bronze',
    name: 'Bronze Bar',
    reqSmithingLevel: 1,
    oresRequired: { ore_copper: 1, ore_tin: 1 },
    xpAwarded: 6.25,
  },
  bar_iron: {
    barItemId: 'bar_iron',
    name: 'Iron Bar',
    reqSmithingLevel: 15,
    oresRequired: { ore_iron: 1 },
    xpAwarded: 12.5,
  },
  bar_steel: {
    barItemId: 'bar_steel',
    name: 'Steel Bar',
    reqSmithingLevel: 30,
    oresRequired: { ore_iron: 1, ore_coal: 2 },
    xpAwarded: 17.5,
  },
  bar_mithril: {
    barItemId: 'bar_mithril',
    name: 'Mithril Bar',
    reqSmithingLevel: 50,
    oresRequired: { ore_mithril: 1, ore_coal: 4 },
    xpAwarded: 30,
  },
  bar_adamant: {
    barItemId: 'bar_adamant',
    name: 'Adamantite Bar',
    reqSmithingLevel: 70,
    oresRequired: { ore_adamantite: 1, ore_coal: 6 },
    xpAwarded: 37.5,
  },
  bar_rune: {
    barItemId: 'bar_rune',
    name: 'Runite Bar',
    reqSmithingLevel: 85,
    oresRequired: { ore_runite: 1, ore_coal: 8 },
    xpAwarded: 50,
  },
  bar_saints_gold: {
    barItemId: 'bar_saints_gold',
    name: "Saint's Gold Bar",
    reqSmithingLevel: 95,
    oresRequired: { ore_saints_gold: 1, ore_coal: 10 },
    xpAwarded: 75,
  },
};

export const CANONICAL_FORGING_RECIPES: Record<string, ForgingRecipe> = {
  bronze_dagger: {
    productId: 'bronze_dagger',
    name: 'Bronze Dagger',
    metalTier: 'BRONZE',
    barsRequired: 1,
    reqSmithingLevel: 1,
    xpAwarded: 12.5,
  },
  bronze_sword: {
    productId: 'bronze_sword',
    name: 'Bronze Sword',
    metalTier: 'BRONZE',
    barsRequired: 1,
    reqSmithingLevel: 4,
    xpAwarded: 12.5,
  },
  bronze_platebody: {
    productId: 'bronze_platebody',
    name: 'Bronze Platebody',
    metalTier: 'BRONZE',
    barsRequired: 5,
    reqSmithingLevel: 18,
    xpAwarded: 62.5,
  },
  steel_scimitar: {
    productId: 'steel_scimitar',
    name: 'Steel Scimitar',
    metalTier: 'STEEL',
    barsRequired: 2,
    reqSmithingLevel: 35,
    xpAwarded: 75,
  },
  rune_platebody: {
    productId: 'rune_platebody',
    name: 'Rune Platebody',
    metalTier: 'RUNE',
    barsRequired: 5,
    reqSmithingLevel: 99,
    xpAwarded: 375,
  },
};

/**
 * Smelts raw ores into a refined metal bar at a furnace.
 */
export function smeltOre(
  barId: string,
  playerSmithingLevel: number,
  inventoryOres: Record<string, number>
): {
  success: boolean;
  barItemId?: string;
  xpAwarded: number;
  consumedOres?: Record<string, number>;
  reason?: string;
} {
  const recipe = CANONICAL_SMELTING_RECIPES[barId];
  if (!recipe) {
    return { success: false, xpAwarded: 0, reason: 'Unknown smelting recipe.' };
  }

  if (playerSmithingLevel < recipe.reqSmithingLevel) {
    return {
      success: false,
      xpAwarded: 0,
      reason: `Requires Smithing level ${recipe.reqSmithingLevel} (Current: ${playerSmithingLevel})`,
    };
  }

  // Check required ores
  for (const [oreId, count] of Object.entries(recipe.oresRequired)) {
    if ((inventoryOres[oreId] ?? 0) < count) {
      return {
        success: false,
        xpAwarded: 0,
        reason: `Missing required ores: need ${count}x ${oreId}`,
      };
    }
  }

  return {
    success: true,
    barItemId: recipe.barItemId,
    xpAwarded: recipe.xpAwarded,
    consumedOres: { ...recipe.oresRequired },
  };
}

/**
 * Forges metal bars into equipment at an anvil.
 */
export function forgeItem(
  productId: string,
  playerSmithingLevel: number,
  barsAvailable: number,
  hasHammer: boolean
): {
  success: boolean;
  productId?: string;
  barsConsumed: number;
  xpAwarded: number;
  reason?: string;
} {
  if (!hasHammer) {
    return { success: false, barsConsumed: 0, xpAwarded: 0, reason: 'You need a hammer to work on an anvil.' };
  }

  const recipe = CANONICAL_FORGING_RECIPES[productId];
  if (!recipe) {
    return { success: false, barsConsumed: 0, xpAwarded: 0, reason: 'Unknown forging recipe.' };
  }

  if (playerSmithingLevel < recipe.reqSmithingLevel) {
    return {
      success: false,
      barsConsumed: 0,
      xpAwarded: 0,
      reason: `Requires Smithing level ${recipe.reqSmithingLevel}`,
    };
  }

  if (barsAvailable < recipe.barsRequired) {
    return {
      success: false,
      barsConsumed: 0,
      xpAwarded: 0,
      reason: `You need ${recipe.barsRequired} ${recipe.metalTier} bars (Have: ${barsAvailable})`,
    };
  }

  return {
    success: true,
    productId: recipe.productId,
    barsConsumed: recipe.barsRequired,
    xpAwarded: recipe.xpAwarded,
  };
}
