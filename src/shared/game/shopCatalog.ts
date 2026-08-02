/**
 * NPC merchant catalog + craftable Binding Crystal (bible economy: buy or craft).
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
    itemSlug: "binding_crystal",
    name: "Binding Crystal",
    description: "Capture item for turn-based creature battles.",
    buyPrice: 100,
    forSale: true,
  },
  {
    itemSlug: "crystal_dust",
    name: "Crystal Dust",
    description: "Raw dust used to craft Binding Crystals.",
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
];

/** In-code fallback when Prisma recipe rows are not seeded yet. */
export const SHOP_CRAFT_RECIPES = [
  {
    slug: "craft_binding_crystal",
    outputItemSlug: "binding_crystal",
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
