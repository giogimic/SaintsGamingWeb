/**
 * Approved asset packs for Studio Asset Manager (bible 16 §7).
 * Prefer curated packs (Saints / Modular / Studio registry) over raw uploads.
 */

export const ASSET_PACKS = ["legacy", "modular"] as const;
export type AssetPackId = (typeof ASSET_PACKS)[number];

export const ASSET_PACK_LABELS: Record<AssetPackId, string> = {
  legacy: "Legacy",
  modular: "Modular",
};

export function packTag(pack: AssetPackId): string {
  return `pack:${pack}`;
}

/** Infer pack from a `/game-assets/...` path or relative path under public/game-assets. */
export function inferAssetPack(sourceOrRel: string): AssetPackId {
  const lower = sourceOrRel.toLowerCase().replace(/\\/g, "/");

  if (
    lower.includes("/npc/") ||
    lower.startsWith("npc/") ||
    /(^|\/)\d+_(male|female)/.test(lower) ||
    lower.includes("lpc") ||
    lower.includes("modular") ||
    lower.includes("/monster/player/") ||
    lower.includes("/player/")
  ) {
    return "modular";
  }

  // Everything else is treated as legacy (since all other assets in the system are derived terrain/tilesets/creatures/items/objects)
  return "legacy";
}

/** Prisma/SQLite-friendly source substring matchers for a pack (pagination-safe). */
export function packSourceMatchers(pack: AssetPackId | "lpc"): string[] {
  switch (pack) {
    case "modular":
    case "lpc":
      return ["/npc/", "/monster/player/", "/player/"];
    case "legacy":
      return ["/monster/", "/creatures/", "/world-monsters/", "/tilesets/", "/items/", "/objects/", "/ui/"];
    default:
      return [];
  }
}

