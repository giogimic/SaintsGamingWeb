/**
 * Ensure Tuxemon campaign maps are reachable for Spyder playtests.
 *
 * - Lists WorldMap rows with gameId=tuxemon
 * - Attaches a basic encountersData list from wild CreatureDefs when empty
 * - Seeds Azure ↔ Route 1 ↔ Cotton gates + tall grass (seed-campaign-path)
 * - Prints lobby warp hints
 *
 * Usage: npx tsx scripts/ensure-campaign-playable.ts
 */

import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import path from "path";

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

  console.log(`\nPatched ${patched} maps with default encounters.`);

  console.log("\nSeeding campaign path (gates / grass)…");
  const pathScript = path.join(__dirname, "seed-campaign-path.ts");
  const pathResult = spawnSync("npx", ["tsx", pathScript], {
    stdio: "inherit",
    env: process.env,
  });
  if (pathResult.status !== 0) {
    console.warn("  seed-campaign-path failed — run npm run seed:campaign-path manually");
  }

  console.log("\nPlay path:");
  console.log("  1. npm run seed:campaign-npcs");
  console.log("  2. npm run dev");
  console.log("  3. Create Spyder Tamer → AZURE_TOWN");
  console.log("  4. Talk Azure Guide → townsfolk → east road → Route 1 tall grass → capture");
  console.log("  5. Report to Guide → east to Cotton Town greeter");
  const azure = maps.find((m) => m.id === "AZURE_TOWN");
  if (!azure && maps[0]) {
    console.log(`  NOTE: AZURE_TOWN missing; candidate: ${maps[0].id}`);
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
