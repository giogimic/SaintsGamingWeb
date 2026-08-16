/**
 * Saints Gaming — Cooking & Culinary Recipe Formulation Engine (Bible 22)
 * Evaluates fire/range cooking, burn rate decay formulas, food healing values, and cooking XP.
 */

export type CookingSource = 'FIRE' | 'RANGE' | 'CHEF_RANGE';

export interface CookingRecipe {
  rawItemId: string;
  name: string;
  cookedItemId: string;
  burntItemId: string;
  reqCookingLevel: number;
  stopBurnLevel: number;
  healAmount: number;
  xpAwarded: number;
}

export const CANONICAL_COOKING_RECIPES: Record<string, CookingRecipe> = {
  raw_shrimp: {
    rawItemId: 'raw_shrimp',
    name: 'Shrimp',
    cookedItemId: 'cooked_shrimp',
    burntItemId: 'burnt_shrimp',
    reqCookingLevel: 1,
    stopBurnLevel: 34,
    healAmount: 3,
    xpAwarded: 30,
  },
  raw_trout: {
    rawItemId: 'raw_trout',
    name: 'Trout',
    cookedItemId: 'cooked_trout',
    burntItemId: 'burnt_fish',
    reqCookingLevel: 15,
    stopBurnLevel: 50,
    healAmount: 7,
    xpAwarded: 70,
  },
  raw_salmon: {
    rawItemId: 'raw_salmon',
    name: 'Salmon',
    cookedItemId: 'cooked_salmon',
    burntItemId: 'burnt_fish',
    reqCookingLevel: 25,
    stopBurnLevel: 58,
    healAmount: 9,
    xpAwarded: 90,
  },
  raw_lobster: {
    rawItemId: 'raw_lobster',
    name: 'Lobster',
    cookedItemId: 'cooked_lobster',
    burntItemId: 'burnt_lobster',
    reqCookingLevel: 40,
    stopBurnLevel: 74,
    healAmount: 12,
    xpAwarded: 120,
  },
  raw_shark: {
    rawItemId: 'raw_shark',
    name: 'Shark',
    cookedItemId: 'cooked_shark',
    burntItemId: 'burnt_shark',
    reqCookingLevel: 80,
    stopBurnLevel: 99,
    healAmount: 20,
    xpAwarded: 210,
  },
};

/**
 * Calculates the probability (0.0 to 1.0) of burning the food during cooking.
 */
export function calculateBurnChance(
  playerCookingLevel: number,
  recipe: CookingRecipe,
  source: CookingSource = 'FIRE'
): number {
  if (playerCookingLevel < recipe.reqCookingLevel) return 1.0;
  if (playerCookingLevel >= recipe.stopBurnLevel) return 0.0;

  const levelSpan = recipe.stopBurnLevel - recipe.reqCookingLevel;
  const progress = (playerCookingLevel - recipe.reqCookingLevel) / levelSpan;

  // Base starting burn chance at minimum required level: Fire = 0.50, Range = 0.35, Chef Range = 0.20
  let baseBurnRate = 0.5;
  if (source === 'RANGE') baseBurnRate = 0.35;
  if (source === 'CHEF_RANGE') baseBurnRate = 0.2;

  const burnChance = baseBurnRate * (1 - progress);
  return Math.max(0, Math.min(1, burnChance));
}

/**
 * Attempts to cook a raw food item.
 */
export function cookFood(
  recipe: CookingRecipe,
  playerCookingLevel: number,
  source: CookingSource = 'FIRE',
  randomRoll: number = Math.random()
): {
  success: boolean;
  resultItemId: string;
  isBurnt: boolean;
  xpAwarded: number;
  healAmount: number;
  reason?: string;
} {
  if (playerCookingLevel < recipe.reqCookingLevel) {
    return {
      success: false,
      resultItemId: recipe.rawItemId,
      isBurnt: false,
      xpAwarded: 0,
      healAmount: 0,
      reason: `Requires Cooking level ${recipe.reqCookingLevel} (Current: ${playerCookingLevel})`,
    };
  }

  const burnChance = calculateBurnChance(playerCookingLevel, recipe, source);
  const isBurnt = randomRoll < burnChance;

  if (isBurnt) {
    return {
      success: true,
      resultItemId: recipe.burntItemId,
      isBurnt: true,
      xpAwarded: 0,
      healAmount: 0,
    };
  }

  return {
    success: true,
    resultItemId: recipe.cookedItemId,
    isBurnt: false,
    xpAwarded: recipe.xpAwarded,
    healAmount: recipe.healAmount,
  };
}
