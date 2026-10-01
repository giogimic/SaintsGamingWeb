/**
 * Saints Gaming — Sync Canonical 3D Assets CLI
 * Usage: npx tsx scripts/sync-canonical-assets.ts
 */
import { syncCanonicalGameAssets } from "../src/server/assets/canonicalAssetsSync";
import { prisma } from "../src/web/lib/prisma";

async function main() {
  console.log("=== SYNCING CANONICAL 3D ASSETS ===");
  const count = await syncCanonicalGameAssets(prisma);
  console.log(`[✓] Synced ${count} canonical assets into database.`);

  const models = await prisma.gameAsset.findMany({
    where: { id: { startsWith: "builtin-model-" } },
    select: { id: true, source: true },
  });
  console.log("Registered builtin models in GameAsset table:", models);

  const profiles = await prisma.characterModelProfile.findMany({
    select: { id: true, slug: true, name: true, skeletonType: true },
  });
  console.log("Registered profiles in CharacterModelProfile table:", profiles);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
