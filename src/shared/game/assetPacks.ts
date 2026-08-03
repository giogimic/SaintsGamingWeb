/**
 * Approved asset packs for Studio Asset Manager (bible 16 §7).
 * Prefer curated packs (Tuxemon / LPC / Studio registry) over raw uploads.
 */

export const ASSET_PACKS = ["tuxemon", "lpc", "studio"] as const;
export type AssetPackId = (typeof ASSET_PACKS)[number];

export const ASSET_PACK_LABELS: Record<AssetPackId, string> = {
  tuxemon: "Tuxemon",
  lpc: "LPC",
  studio: "Studio registry",
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
    lower.includes("lpc")
  ) {
    return "lpc";
  }

  if (
    lower.includes("/monster/") ||
    lower.includes("/creatures/") ||
    lower.includes("/world-monsters/") ||
    lower.includes("/tilesets/") ||
    lower.includes("tuxemon")
  ) {
    return "tuxemon";
  }

  return "studio";
}

/** Prisma/SQLite-friendly source substring matchers for a pack (pagination-safe). */
export function packSourceMatchers(pack: AssetPackId): string[] {
  switch (pack) {
    case "lpc":
      return ["/npc/"];
    case "tuxemon":
      return ["/monster/", "/creatures/", "/world-monsters/", "/tilesets/"];
    case "studio":
      return [];
    default:
      return [];
  }
}
