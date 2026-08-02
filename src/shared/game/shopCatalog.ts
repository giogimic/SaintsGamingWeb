/**
 * NPC merchant catalog + craftable Standard Film (soul capture).
 * Server is authoritative; client uses this for display.
 */

export type ShopListing = {
  itemSlug: string;
  name: string;
  description: string;
  buyPrice: number;
  /** If false, not sold at NPC (craft-only). */
  forSale: boolean;
};

export const SHOP_CATALOG: ShopListing[] = [
  {
    itemSlug: "film_standard",
    name: "Standard Film",
    description: "Soul-sensitive film. Throw in turn-based battle to capture.",
    buyPrice: 100,
    forSale: true,
  },
  {
    itemSlug: "film_fine",
    name: "Fine Grain Film",
    description: "2× catch rate. Cleaner soul exposure.",
    buyPrice: 250,
    forSale: true,
  },
  {
    itemSlug: "soul_camera",
    name: "Soul Camera",
    description: "Tool for exposing capture film (flavor; film alone works in demo).",
    buyPrice: 50,
    forSale: true,
  },
  {
    itemSlug: "crystal_dust",
    name: "Crystal Dust",
    description: "Craft ingredient for Standard Film.",
    buyPrice: 25,
    forSale: true,
  },
  {
    itemSlug: "wood_log",
    name: "Wood Log",
    description: "Basic timber. Craft ingredient.",
    buyPrice: 5,
    forSale: true,
  },
  {
    itemSlug: "patch_kit",
    name: "Healing Salve",
    description: "Restores vitality out of battle.",
    buyPrice: 50,
    forSale: true,
  },
  // Legacy alias still buyable → maps to film in capture math
  {
    itemSlug: "binding_crystal",
    name: "Standard Film (legacy)",
    description: "Legacy slug — prefer film_standard.",
    buyPrice: 100,
    forSale: false,
  },
];

/** In-code fallback when Prisma recipe rows are not seeded yet. */
export const SHOP_CRAFT_RECIPES = [
  {
    slug: "craft_film_standard",
    outputItemSlug: "film_standard",
    outputQuantity: 1,
    skillSlug: "crafting",
    levelReq: 1,
    xpReward: 20,
    ingredients: [
      { itemSlug: "crystal_dust", qty: 2 },
      { itemSlug: "wood_log", qty: 1 },
    ],
    timeMs: 2000,
  },
  {
    slug: "craft_binding_crystal",
    outputItemSlug: "film_standard",
    outputQuantity: 1,
    skillSlug: "crafting",
    levelReq: 1,
    xpReward: 20,
    ingredients: [
      { itemSlug: "crystal_dust", qty: 2 },
      { itemSlug: "wood_log", qty: 1 },
    ],
    timeMs: 2000,
  },
] as const;

export function getShopListing(itemSlug: string): ShopListing | undefined {
  return SHOP_CATALOG.find((i) => i.itemSlug === itemSlug);
}

export function sellPrice(itemSlug: string): number {
  const listing = getShopListing(itemSlug);
  if (!listing) return 0;
  return Math.floor(listing.buyPrice * 0.5);
}
