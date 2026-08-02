/**
 * Ensure DEMO_SANDBOX (and a legacy test_map alias) exist as WorldMap/GameMap rows
 * so /game and /lobby can both load a map.
 *
 * Prefer DemoBootstrap on server boot; this script is a one-shot repair for local DB.
 */
import { PrismaClient } from "@prisma/client";
import {
  DEMO_ENCOUNTERS,
  DEMO_MAP_H,
  DEMO_MAP_ID,
  DEMO_MAP_NPCS,
  DEMO_MAP_W,
  buildDemoSandboxGrid,
} from "../src/server/demoMapSeed";

const prisma = new PrismaClient();

async function upsertWorldAndGame(id: string, name: string) {
  const grid = buildDemoSandboxGrid();
  const gridJson = JSON.stringify(grid);
  const npcsJson = JSON.stringify(DEMO_MAP_NPCS);
  const encountersJson = JSON.stringify(DEMO_ENCOUNTERS);

  await prisma.worldMap.upsert({
    where: { id },
    create: {
      id,
      name,
      gridData: gridJson,
      gatesData: "{}",
      npcsData: npcsJson,
      encountersData: encountersJson,
    },
    update: {
      name,
      gridData: gridJson,
      npcsData: npcsJson,
      encountersData: encountersJson,
      version: { increment: 1 },
    },
  });

  await prisma.gameMap.upsert({
    where: { id },
    create: {
      id,
      name,
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
      gates: "{}",
    },
    update: {
      name,
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
    },
  });
}

async function main() {
  await upsertWorldAndGame(DEMO_MAP_ID, "Demo Sandbox");
  // Alias for older /game clients that still request test_map
  await upsertWorldAndGame("test_map", "Saints Village (legacy alias)");
  console.log(`✅ Maps ready: ${DEMO_MAP_ID}, test_map`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
