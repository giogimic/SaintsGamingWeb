import { prisma } from './src/web/lib/prisma';
import { syncCanonicalGameAssets } from './src/server/assets/canonicalAssetsSync';

async function main() {
  console.log("Running canonical asset sync locally...");
  const synced = await syncCanonicalGameAssets(prisma);
  console.log("Synced count:", synced);
}
main().catch(console.error).finally(() => prisma.$disconnect());
