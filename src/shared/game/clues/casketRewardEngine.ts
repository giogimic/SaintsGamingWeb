/**
 * Saints Gaming — Reward Casket Loot Generator & Mega-Rare Table Engine (Bible 18 & 25)
 * Manages reward casket generation (3-6 loot rolls), unique trimmed items, and mega-rare jackpot tables.
 */

export type CasketTier = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE' | 'MASTER';

export interface CasketRewardItem {
  itemId: string;
  name: string;
  minQuantity: number;
  maxQuantity: number;
  weight: number; // Relative weight in table
  isUnique?: boolean;
  isMegaRare?: boolean;
}

export const CASKET_TABLES: Record<CasketTier, { minRolls: number; maxRolls: number; items: CasketRewardItem[] }> = {
  EASY: {
    minRolls: 2,
    maxRolls: 4,
    items: [
      { itemId: 'coins', name: 'Coins', minQuantity: 50, maxQuantity: 500, weight: 100 },
      { itemId: 'rune_air', name: 'Air Rune', minQuantity: 10, maxQuantity: 50, weight: 80 },
      { itemId: 'logs_willow', name: 'Willow Logs', minQuantity: 5, maxQuantity: 15, weight: 60 },
      { itemId: 'equip_black_platebody_g', name: 'Black Platebody (g)', minQuantity: 1, maxQuantity: 1, weight: 5, isUnique: true },
      { itemId: 'equip_wizard_robe_t', name: 'Wizard Robe (t)', minQuantity: 1, maxQuantity: 1, weight: 5, isUnique: true },
    ],
  },
  MEDIUM: {
    minRolls: 3,
    maxRolls: 5,
    items: [
      { itemId: 'coins', name: 'Coins', minQuantity: 200, maxQuantity: 2000, weight: 100 },
      { itemId: 'raw_lobster', name: 'Raw Lobster', minQuantity: 10, maxQuantity: 30, weight: 70 },
      { itemId: 'rune_chaos', name: 'Chaos Rune', minQuantity: 20, maxQuantity: 60, weight: 70 },
      { itemId: 'equip_adamant_platebody_t', name: 'Adamant Platebody (t)', minQuantity: 1, maxQuantity: 1, weight: 4, isUnique: true },
      { itemId: 'equip_ranger_boots', name: 'Ranger Boots', minQuantity: 1, maxQuantity: 1, weight: 1, isUnique: true, isMegaRare: true },
    ],
  },
  HARD: {
    minRolls: 3,
    maxRolls: 6,
    items: [
      { itemId: 'coins', name: 'Coins', minQuantity: 1000, maxQuantity: 10000, weight: 100 },
      { itemId: 'raw_shark', name: 'Raw Shark', minQuantity: 15, maxQuantity: 40, weight: 60 },
      { itemId: 'rune_death', name: 'Death Rune', minQuantity: 30, maxQuantity: 100, weight: 60 },
      { itemId: 'equip_rune_platebody_g', name: 'Rune Platebody (g)', minQuantity: 1, maxQuantity: 1, weight: 3, isUnique: true },
      { itemId: 'equip_robin_hood_hat', name: 'Robin Hood Hat', minQuantity: 1, maxQuantity: 1, weight: 1, isUnique: true },
      { itemId: 'equip_3rd_age_mage_hat', name: '3rd Age Mage Hat', minQuantity: 1, maxQuantity: 1, weight: 0.1, isUnique: true, isMegaRare: true },
    ],
  },
  ELITE: {
    minRolls: 4,
    maxRolls: 6,
    items: [
      { itemId: 'coins', name: 'Coins', minQuantity: 5000, maxQuantity: 30000, weight: 100 },
      { itemId: 'rune_blood', name: 'Blood Rune', minQuantity: 50, maxQuantity: 200, weight: 60 },
      { itemId: 'equip_royal_tunic', name: 'Royal Tunic', minQuantity: 1, maxQuantity: 1, weight: 2, isUnique: true },
      { itemId: 'equip_3rd_age_platebody', name: '3rd Age Platebody', minQuantity: 1, maxQuantity: 1, weight: 0.05, isUnique: true, isMegaRare: true },
    ],
  },
  MASTER: {
    minRolls: 5,
    maxRolls: 7,
    items: [
      { itemId: 'coins', name: 'Coins', minQuantity: 20000, maxQuantity: 100000, weight: 100 },
      { itemId: 'rune_blood', name: 'Blood Rune', minQuantity: 100, maxQuantity: 500, weight: 60 },
      { itemId: 'equip_saints_holy_crown', name: "Saint's Holy Crown", minQuantity: 1, maxQuantity: 1, weight: 1, isUnique: true },
      { itemId: 'equip_3rd_age_pickaxe', name: '3rd Age Pickaxe', minQuantity: 1, maxQuantity: 1, weight: 0.02, isUnique: true, isMegaRare: true },
    ],
  },
};

export interface CasketRewardResult {
  tier: CasketTier;
  loot: Array<{
    itemId: string;
    name: string;
    quantity: number;
    isUnique?: boolean;
    isMegaRare?: boolean;
  }>;
  totalUniqueCount: number;
  hasMegaRare: boolean;
}

/**
 * Opens a reward casket and rolls loot items.
 */
export function openRewardCasket(
  tier: CasketTier,
  rollsCountOverride?: number,
  randomFloatFn: () => number = Math.random
): CasketRewardResult {
  const table = CASKET_TABLES[tier];
  if (!table) {
    throw new Error(`Unknown casket tier: ${tier}`);
  }

  const numRolls =
    rollsCountOverride ??
    Math.floor(randomFloatFn() * (table.maxRolls - table.minRolls + 1)) + table.minRolls;

  const loot: CasketRewardResult['loot'] = [];
  const totalWeight = table.items.reduce((acc, item) => acc + item.weight, 0);

  for (let r = 0; r < numRolls; r++) {
    let roll = randomFloatFn() * totalWeight;
    let selected = table.items[0];

    for (const item of table.items) {
      if (roll < item.weight) {
        selected = item;
        break;
      }
      roll -= item.weight;
    }

    const qty =
      Math.floor(randomFloatFn() * (selected.maxQuantity - selected.minQuantity + 1)) +
      selected.minQuantity;

    loot.push({
      itemId: selected.itemId,
      name: selected.name,
      quantity: qty,
      isUnique: selected.isUnique,
      isMegaRare: selected.isMegaRare,
    });
  }

  const totalUniqueCount = loot.filter((item) => item.isUnique).length;
  const hasMegaRare = loot.some((item) => item.isMegaRare);

  return {
    tier,
    loot,
    totalUniqueCount,
    hasMegaRare,
  };
}
