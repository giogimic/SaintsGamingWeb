/**
 * Ensure DEMO_SANDBOX exists as WorldMap/GameMap for /lobby.
 * (One-shot repair; DemoBootstrap also rewrites this on server boot.)
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

async function main() {
  const grid = buildDemoSandboxGrid();
  const gridJson = JSON.stringify(grid);
  const npcsJson = JSON.stringify(DEMO_MAP_NPCS);
  const encountersJson = JSON.stringify(DEMO_ENCOUNTERS);

  await prisma.worldMap.upsert({
    where: { id: DEMO_MAP_ID },
    create: {
      id: DEMO_MAP_ID,
      name: "Demo Sandbox",
      gridData: gridJson,
      gatesData: "{}",
      npcsData: npcsJson,
      encountersData: encountersJson,
    },
    update: {
      name: "Demo Sandbox",
      gridData: gridJson,
      npcsData: npcsJson,
      encountersData: encountersJson,
      version: { increment: 1 },
    },
  });

  await prisma.gameMap.upsert({
    where: { id: DEMO_MAP_ID },
    create: {
      id: DEMO_MAP_ID,
      name: "Demo Sandbox",
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
      gates: "{}",
    },
    update: {
      name: "Demo Sandbox",
      width: DEMO_MAP_W,
      height: DEMO_MAP_H,
      tilesetData: gridJson,
      npcs: npcsJson,
      encounters: encountersJson,
    },
  });

  console.log(`✅ Map ready: ${DEMO_MAP_ID}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
