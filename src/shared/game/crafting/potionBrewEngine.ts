/**
 * Saints Gaming — Alchemy & Herbology Potion Brew Engine (Bible 14 & 22)
 * Manages potion brewing from herbs & secondary reagents, 1-4 dose decanting, and combat boost calculations.
 */

export interface StatBoostFormula {
  stat: 'attack' | 'strength' | 'defence' | 'ranged' | 'magic' | 'hitpoints' | 'prayer';
  flatBoost: number;
  percentBoost: number; // e.g. 0.10 for +10%
}

export interface PotionRecipe {
  potionId: string;
  name: string;
  unfinishedPotionId: string;
  secondaryItemId: string;
  reqHerbloreLevel: number;
  xpAwarded: number;
  durationSeconds: number;
  boost: StatBoostFormula;
}

export const CANONICAL_POTION_RECIPES: Record<string, PotionRecipe> = {
  potion_attack: {
    potionId: 'potion_attack',
    name: 'Attack Potion',
    unfinishedPotionId: 'unf_guam',
    secondaryItemId: 'item_eye_of_newt',
    reqHerbloreLevel: 3,
    xpAwarded: 25,
    durationSeconds: 300,
    boost: { stat: 'attack', flatBoost: 3, percentBoost: 0.1 },
  },
  potion_strength: {
    potionId: 'potion_strength',
    name: 'Strength Potion',
    unfinishedPotionId: 'unf_tarromin',
    secondaryItemId: 'item_limpwurt_root',
    reqHerbloreLevel: 12,
    xpAwarded: 50,
    durationSeconds: 300,
    boost: { stat: 'strength', flatBoost: 3, percentBoost: 0.1 },
  },
  potion_defence: {
    potionId: 'potion_defence',
    name: 'Defence Potion',
    unfinishedPotionId: 'unf_ranarr',
    secondaryItemId: 'item_white_berries',
    reqHerbloreLevel: 30,
    xpAwarded: 87.5,
    durationSeconds: 300,
    boost: { stat: 'defence', flatBoost: 5, percentBoost: 0.15 },
  },
  potion_super_strength: {
    potionId: 'potion_super_strength',
    name: 'Super Strength Potion',
    unfinishedPotionId: 'unf_kwuarm',
    secondaryItemId: 'item_limpwurt_root',
    reqHerbloreLevel: 55,
    xpAwarded: 125,
    durationSeconds: 300,
    boost: { stat: 'strength', flatBoost: 5, percentBoost: 0.15 },
  },
  potion_saints_overload: {
    potionId: 'potion_saints_overload',
    name: "Saint's Overload Potion",
    unfinishedPotionId: 'unf_torstol',
    secondaryItemId: 'item_dragon_scale_dust',
    reqHerbloreLevel: 96,
    xpAwarded: 250,
    durationSeconds: 300,
    boost: { stat: 'strength', flatBoost: 6, percentBoost: 0.16 },
  },
};

/**
 * Calculates the exact boosted stat value given a base level.
 */
export function calculatePotionBoost(
  baseLevel: number,
  boostFormula: StatBoostFormula
): number {
  const boostAmount = Math.floor(
    boostFormula.flatBoost + baseLevel * boostFormula.percentBoost
  );
  return baseLevel + boostAmount;
}

/**
 * Brews a 3-dose or 4-dose potion from an unfinished vial and secondary ingredient.
 */
export function brewPotion(
  recipe: PotionRecipe,
  playerHerbloreLevel: number,
  hasUnfinished: boolean,
  hasSecondary: boolean
): {
  success: boolean;
  potionId?: string;
  doses: number;
  xpAwarded: number;
  reason?: string;
} {
  if (playerHerbloreLevel < recipe.reqHerbloreLevel) {
    return {
      success: false,
      doses: 0,
      xpAwarded: 0,
      reason: `Requires Herblore level ${recipe.reqHerbloreLevel} (Current: ${playerHerbloreLevel})`,
    };
  }

  if (!hasUnfinished || !hasSecondary) {
    return {
      success: false,
      doses: 0,
      xpAwarded: 0,
      reason: 'Missing required unfinished potion or secondary reagent.',
    };
  }

  return {
    success: true,
    potionId: recipe.potionId,
    doses: 3, // Standard brew yields 3 doses
    xpAwarded: recipe.xpAwarded,
  };
}

/**
 * Decants a collection of partial potion doses into full 4-dose flasks + remainder.
 */
export function decantPotions(dosesArray: number[]): {
  fullFourDoseCount: number;
  remainderDose: number;
  emptyVialsReturned: number;
} {
  const totalDoses = dosesArray.reduce((acc, d) => acc + Math.max(0, Math.min(4, d)), 0);
  const initialVials = dosesArray.length;

  const fullFourDoseCount = Math.floor(totalDoses / 4);
  const remainderDose = totalDoses % 4;

  const filledVials = fullFourDoseCount + (remainderDose > 0 ? 1 : 0);
  const emptyVialsReturned = Math.max(0, initialVials - filledVials);

  return {
    fullFourDoseCount,
    remainderDose,
    emptyVialsReturned,
  };
}
