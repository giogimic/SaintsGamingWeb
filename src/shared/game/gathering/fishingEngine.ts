/**
 * Saints Gaming — Fishing Net & Harpoon Catch Probability Engine (Bible 08)
 * Evaluates fishing methods (Net, Rod, Harpoon, Pot), bait consumption, level scaling, and treasure caskets.
 */

export type FishingMethod =
  | 'SMALL_NET'
  | 'BAIT_ROD'
  | 'FLY_ROD'
  | 'HARPOON'
  | 'LOBSTER_POT';

export interface FishCatchOption {
  itemId: string;
  name: string;
  reqFishingLevel: number;
  xpAwarded: number;
  catchWeight: number; // For multi-catch spots (e.g. trout vs salmon)
}

export interface FishingSpotDefinition {
  method: FishingMethod;
  name: string;
  reqToolItemId: string;
  reqBaitItemId?: string;
  possibleCatches: FishCatchOption[];
  casketChance: number; // e.g. 1/128
}

export const CANONICAL_FISHING_SPOTS: Record<FishingMethod, FishingSpotDefinition> = {
  SMALL_NET: {
    method: 'SMALL_NET',
    name: 'Net Fishing Spot',
    reqToolItemId: 'tool_small_net',
    possibleCatches: [
      {
        itemId: 'raw_shrimp',
        name: 'Raw Shrimp',
        reqFishingLevel: 1,
        xpAwarded: 10,
        catchWeight: 70,
      },
      {
        itemId: 'raw_anchovies',
        name: 'Raw Anchovies',
        reqFishingLevel: 15,
        xpAwarded: 40,
        catchWeight: 30,
      },
    ],
    casketChance: 0.005,
  },
  BAIT_ROD: {
    method: 'BAIT_ROD',
    name: 'Bait Fishing Spot',
    reqToolItemId: 'tool_fishing_rod',
    reqBaitItemId: 'item_fishing_bait',
    possibleCatches: [
      {
        itemId: 'raw_sardine',
        name: 'Raw Sardine',
        reqFishingLevel: 5,
        xpAwarded: 20,
        catchWeight: 100,
      },
    ],
    casketChance: 0.008,
  },
  FLY_ROD: {
    method: 'FLY_ROD',
    name: 'Lure Fishing Spot',
    reqToolItemId: 'tool_fly_fishing_rod',
    reqBaitItemId: 'item_feather',
    possibleCatches: [
      {
        itemId: 'raw_trout',
        name: 'Raw Trout',
        reqFishingLevel: 20,
        xpAwarded: 50,
        catchWeight: 60,
      },
      {
        itemId: 'raw_salmon',
        name: 'Raw Salmon',
        reqFishingLevel: 30,
        xpAwarded: 70,
        catchWeight: 40,
      },
    ],
    casketChance: 0.008,
  },
  LOBSTER_POT: {
    method: 'LOBSTER_POT',
    name: 'Cage Fishing Spot',
    reqToolItemId: 'tool_lobster_pot',
    possibleCatches: [
      {
        itemId: 'raw_lobster',
        name: 'Raw Lobster',
        reqFishingLevel: 40,
        xpAwarded: 90,
        catchWeight: 100,
      },
    ],
    casketChance: 0.01,
  },
  HARPOON: {
    method: 'HARPOON',
    name: 'Harpoon Fishing Spot',
    reqToolItemId: 'tool_harpoon',
    possibleCatches: [
      {
        itemId: 'raw_shark',
        name: 'Raw Shark',
        reqFishingLevel: 76,
        xpAwarded: 110,
        catchWeight: 100,
      },
    ],
    casketChance: 0.015,
  },
};

/**
 * Attempts to catch fish on a fishing tick.
 */
export function attemptCatchFish(
  method: FishingMethod,
  playerFishingLevel: number,
  hasTool: boolean,
  baitCount: number = 0,
  randomSuccessRoll: number = Math.random(),
  randomCasketRoll: number = Math.random()
): {
  success: boolean;
  caughtFish?: { itemId: string; name: string };
  xpAwarded: number;
  consumedBait: boolean;
  foundCasketItemId?: string;
  reason?: string;
} {
  const spot = CANONICAL_FISHING_SPOTS[method];
  if (!spot) {
    return { success: false, xpAwarded: 0, consumedBait: false, reason: 'Invalid fishing spot.' };
  }

  if (!hasTool) {
    return {
      success: false,
      xpAwarded: 0,
      consumedBait: false,
      reason: `You need a ${spot.reqToolItemId.replace('tool_', '').replace('_', ' ')} to fish here.`,
    };
  }

  if (spot.reqBaitItemId && baitCount <= 0) {
    return {
      success: false,
      xpAwarded: 0,
      consumedBait: false,
      reason: `You have run out of ${spot.reqBaitItemId.replace('item_', '').replace('_', ' ')}.`,
    };
  }

  // Filter available catches for player's level
  const unlockedCatches = spot.possibleCatches.filter(
    (c) => playerFishingLevel >= c.reqFishingLevel
  );

  if (unlockedCatches.length === 0) {
    const minLevel = Math.min(...spot.possibleCatches.map((c) => c.reqFishingLevel));
    return {
      success: false,
      xpAwarded: 0,
      consumedBait: false,
      reason: `Requires Fishing level ${minLevel} (Current: ${playerFishingLevel})`,
    };
  }

  // Calculate success probability: 0.4 + (level / 150)
  const successChance = Math.min(0.9, 0.4 + playerFishingLevel / 150);

  if (randomSuccessRoll > successChance) {
    return {
      success: false,
      xpAwarded: 0,
      consumedBait: false,
      reason: 'You fail to catch anything this swing.',
    };
  }

  // Pick catch from unlockedCatches based on weight
  const totalWeight = unlockedCatches.reduce((acc, c) => acc + c.catchWeight, 0);
  let roll = Math.random() * totalWeight;
  let selected = unlockedCatches[0];

  for (const item of unlockedCatches) {
    if (roll < item.catchWeight) {
      selected = item;
      break;
    }
    roll -= item.catchWeight;
  }

  let foundCasketItemId: string | undefined = undefined;
  if (randomCasketRoll < spot.casketChance) {
    foundCasketItemId = 'item_casket_sea';
  }

  return {
    success: true,
    caughtFish: { itemId: selected.itemId, name: selected.name },
    xpAwarded: selected.xpAwarded,
    consumedBait: !!spot.reqBaitItemId,
    foundCasketItemId,
  };
}
