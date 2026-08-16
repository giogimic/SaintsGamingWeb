/**
 * Saints Gaming — Enchantment Matrix & Jewel Infusion Engine (Bible 14)
 * Manages jewelry enchantment spells (Lvl 1-6), rune requirements, item conversion, and Magic XP.
 */

export type EnchantLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type JewelType = 'SAPPHIRE' | 'EMERALD' | 'RUBY' | 'DIAMOND' | 'DRAGONSTONE' | 'ONYX';

export interface EnchantRecipe {
  enchantLevel: EnchantLevel;
  name: string;
  jewel: JewelType;
  reqMagicLevel: number;
  runesRequired: Record<string, number>;
  baseItemId: string;
  enchantedItemId: string;
  xpAwarded: number;
  initialCharges?: number;
}

export const CANONICAL_ENCHANT_RECIPES: Record<string, EnchantRecipe> = {
  ring_sapphire: {
    enchantLevel: 1,
    name: 'Lvl-1 Enchant (Sapphire)',
    jewel: 'SAPPHIRE',
    reqMagicLevel: 7,
    runesRequired: { rune_water: 1, rune_cosmic: 1 },
    baseItemId: 'ring_sapphire',
    enchantedItemId: 'ring_of_recoil',
    xpAwarded: 17.5,
  },
  ring_emerald: {
    enchantLevel: 2,
    name: 'Lvl-2 Enchant (Emerald)',
    jewel: 'EMERALD',
    reqMagicLevel: 27,
    runesRequired: { rune_air: 3, rune_cosmic: 1 },
    baseItemId: 'ring_emerald',
    enchantedItemId: 'ring_of_dueling_8',
    xpAwarded: 37,
    initialCharges: 8,
  },
  amulet_ruby: {
    enchantLevel: 3,
    name: 'Lvl-3 Enchant (Ruby)',
    jewel: 'RUBY',
    reqMagicLevel: 49,
    runesRequired: { rune_fire: 5, rune_cosmic: 1 },
    baseItemId: 'amulet_ruby',
    enchantedItemId: 'amulet_of_strength',
    xpAwarded: 59,
  },
  amulet_diamond: {
    enchantLevel: 4,
    name: 'Lvl-4 Enchant (Diamond)',
    jewel: 'DIAMOND',
    reqMagicLevel: 57,
    runesRequired: { rune_earth: 10, rune_cosmic: 1 },
    baseItemId: 'amulet_diamond',
    enchantedItemId: 'amulet_of_power',
    xpAwarded: 67,
  },
  amulet_dragonstone: {
    enchantLevel: 5,
    name: 'Lvl-5 Enchant (Dragonstone)',
    jewel: 'DRAGONSTONE',
    reqMagicLevel: 68,
    runesRequired: { rune_water: 15, rune_earth: 15, rune_cosmic: 1 },
    baseItemId: 'amulet_dragonstone',
    enchantedItemId: 'amulet_of_glory_4',
    xpAwarded: 78,
    initialCharges: 4,
  },
  amulet_onyx: {
    enchantLevel: 6,
    name: 'Lvl-6 Enchant (Onyx)',
    jewel: 'ONYX',
    reqMagicLevel: 87,
    runesRequired: { rune_fire: 20, rune_earth: 20, rune_cosmic: 1 },
    baseItemId: 'amulet_onyx',
    enchantedItemId: 'amulet_of_fury',
    xpAwarded: 97,
  },
};

/**
 * Attempts to enchant a piece of unenchanted jewelry into a magical item.
 */
export function enchantJewelry(
  baseItemId: string,
  playerMagicLevel: number,
  runeInventory: Record<string, number>,
  equippedStaffInfiniteRune?: string
): {
  success: boolean;
  enchantedItemId?: string;
  consumedRunes: Record<string, number>;
  xpAwarded: number;
  charges?: number;
  reason?: string;
} {
  const recipe = CANONICAL_ENCHANT_RECIPES[baseItemId];
  if (!recipe) {
    return {
      success: false,
      consumedRunes: {},
      xpAwarded: 0,
      reason: 'This item cannot be enchanted.',
    };
  }

  if (playerMagicLevel < recipe.reqMagicLevel) {
    return {
      success: false,
      consumedRunes: {},
      xpAwarded: 0,
      reason: `Requires Magic level ${recipe.reqMagicLevel} (Current: ${playerMagicLevel})`,
    };
  }

  const consumedRunes: Record<string, number> = {};
  for (const [runeId, count] of Object.entries(recipe.runesRequired)) {
    if (equippedStaffInfiniteRune === runeId) {
      continue; // Staff provides infinite supply
    }
    if ((runeInventory[runeId] ?? 0) < count) {
      return {
        success: false,
        consumedRunes: {},
        xpAwarded: 0,
        reason: `Missing required runes: need ${count}x ${runeId}`,
      };
    }
    consumedRunes[runeId] = count;
  }

  return {
    success: true,
    enchantedItemId: recipe.enchantedItemId,
    consumedRunes,
    xpAwarded: recipe.xpAwarded,
    charges: recipe.initialCharges,
  };
}
