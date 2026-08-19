/**
 * Approved asset packs for Studio Asset Manager (bible 16 §7).
 * Prefer curated packs (Tuxemon / LPC / Studio registry) over raw uploads.
 */

export const ASSET_PACKS = ["tuxemon", "lpc"] as const;
export type AssetPackId = (typeof ASSET_PACKS)[number];

export const ASSET_PACK_LABELS: Record<AssetPackId, string> = {
  tuxemon: "Tuxemon",
  lpc: "LPC",
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
    lower.includes("/monster/player/") ||
    lower.includes("/player/")
  ) {
    return "lpc";
  }

  // Everything else is treated as tuxemon (since all other assets in the system are Tuxemon/derived terrain/tilesets/creatures/items/objects)
  return "tuxemon";
}

/** Prisma/SQLite-friendly source substring matchers for a pack (pagination-safe). */
export function packSourceMatchers(pack: AssetPackId): string[] {
  switch (pack) {
    case "lpc":
      return ["/npc/", "/monster/player/", "/player/"];
    case "tuxemon":
      return ["/monster/", "/creatures/", "/world-monsters/", "/tilesets/", "/items/", "/objects/", "/ui/"];
    default:
      return [];
  }
}
