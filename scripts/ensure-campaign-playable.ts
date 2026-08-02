/**
 * Ensure Tuxemon campaign maps are reachable for Spyder playtests.
 *
 * - Lists WorldMap rows with gameId=tuxemon
 * - Attaches a basic encountersData list from wild CreatureDefs when empty
 * - Prints lobby warp hints
 *
 * Usage: npx tsx scripts/ensure-campaign-playable.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const maps = await prisma.worldMap.findMany({
    where: { gameId: "tuxemon" },
    select: { id: true, name: true, encountersData: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${maps.length} tuxemon WorldMap rows.`);

  const wilds = await prisma.creatureDef.findMany({
    where: { isActive: true, isWildSpawn: true },
    select: { slug: true },
    take: 12,
  });
  const encounterPayload = JSON.stringify(
    (wilds.length ? wilds : [{ slug: "rockitten" }]).map((w) => ({
      slug: w.slug,
      weight: 1,
    }))
  );

  let patched = 0;
  for (const map of maps) {
    let empty = true;
    try {
      const parsed = JSON.parse(map.encountersData || "[]");
      empty = !Array.isArray(parsed) || parsed.length === 0;
    } catch {
      empty = true;
    }
    if (empty) {
      await prisma.worldMap.update({
        where: { id: map.id },
        data: { encountersData: encounterPayload },
      });
      patched++;
      console.log(`  patched encounters → ${map.id}`);
    } else {
      console.log(`  ok ${map.id} (${map.name})`);
    }
  }

  const demo = await prisma.worldMap.findUnique({
    where: { id: "DEMO_SANDBOX" },
    select: { id: true },
  });

  console.log(`\nPatched ${patched} maps.`);
  console.log("Play path:");
  console.log("  1. npm run dev");
  console.log("  2. Create a character (any of 5 classes)");
  console.log("  3. Claim starter in lab → tall grass for shinies");
  const azure = maps.find((m) => m.id === "AZURE_TOWN");
  if (azure) {
    console.log(`  4. Campaign entry: AZURE_TOWN — set StarterHero.startingMap or seed hero "spyder_tamer".`);
  } else if (maps[0]) {
    console.log(`  4. Campaign entry map candidate: ${maps[0].id} (${maps[0].name})`);
  }
  if (!demo) {
    console.log("  NOTE: DEMO_SANDBOX missing — run DemoBootstrap via server start.");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
