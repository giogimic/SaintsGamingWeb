/**
 * Seed Azure ↔ Spyder Route 1 ↔ Cotton Town warps, tall grass, and route encounters.
 * Usage: npx tsx scripts/seed-campaign-path.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Gate = {
  position: { x: number; y: number };
  targetMapId: string;
  targetSpawn: { x: number; y: number };
  spawnPoint: { x: number; y: number };
};

function gate(
  x: number,
  y: number,
  targetMapId: string,
  sx: number,
  sy: number
): Gate {
  const spawn = { x: sx, y: sy };
  return {
    position: { x, y },
    targetMapId,
    targetSpawn: spawn,
    spawnPoint: spawn,
  };
}

/** Open wall tiles and paint optional grass / gate markers. */
function patchGrid(
  grid: number[][],
  patches: Array<{ x: number; y: number; tile: number }>
) {
  for (const p of patches) {
    if (!grid[p.y] || grid[p.y][p.x] === undefined) continue;
    grid[p.y][p.x] = p.tile;
  }
  return grid;
}

function paintGrassRect(
  grid: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!grid[y] || grid[y][x] === undefined) continue;
      if (grid[y][x] === 1) continue; // keep walls
      grid[y][x] = 2;
    }
  }
}

const PATH: Record<
  string,
  {
    gates: Gate[];
    open: Array<{ x: number; y: number; tile: number }>;
    grass?: { x0: number; y0: number; x1: number; y1: number };
    encounters?: Array<{ slug: string; weight: number; minLevel?: number; maxLevel?: number }>;
  }
> = {
  AZURE_TOWN: {
    gates: [gate(49, 25, "SPYDER_ROUTE1", 2, 10)],
    open: [
      { x: 48, y: 25, tile: 0 },
      { x: 49, y: 25, tile: 3 },
      { x: 48, y: 24, tile: 0 },
      { x: 48, y: 26, tile: 0 },
    ],
  },
  SPYDER_ROUTE1: {
    gates: [
      gate(0, 10, "AZURE_TOWN", 47, 25),
      gate(39, 10, "COTTON_TOWN", 2, 20),
    ],
    open: [
      { x: 0, y: 10, tile: 3 },
      { x: 1, y: 10, tile: 0 },
      { x: 1, y: 9, tile: 0 },
      { x: 1, y: 11, tile: 0 },
      { x: 39, y: 10, tile: 4 },
      { x: 38, y: 10, tile: 0 },
      { x: 38, y: 9, tile: 0 },
      { x: 38, y: 11, tile: 0 },
    ],
    grass: { x0: 10, y0: 7, x1: 18, y1: 14 },
    encounters: [
      { slug: "pairagrin", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "aardorn", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "cataspike", weight: 30, minLevel: 2, maxLevel: 4 },
    ],
  },
  COTTON_TOWN: {
    gates: [gate(0, 20, "SPYDER_ROUTE1", 37, 10)],
    open: [
      { x: 0, y: 20, tile: 3 },
      { x: 1, y: 20, tile: 0 },
      { x: 1, y: 19, tile: 0 },
      { x: 1, y: 21, tile: 0 },
    ],
  },
  // Mirror ROUTE1 for players who land on the non-spyder id
  ROUTE1: {
    gates: [
      gate(0, 20, "AZURE_TOWN", 47, 25),
      gate(58, 20, "COTTON_TOWN", 2, 20),
    ],
    open: [
      { x: 0, y: 20, tile: 3 },
      { x: 1, y: 20, tile: 0 },
      { x: 58, y: 20, tile: 4 },
      { x: 57, y: 20, tile: 0 },
    ],
    grass: { x0: 20, y0: 15, x1: 30, y1: 22 },
    encounters: [
      { slug: "pairagrin", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "aardorn", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "cataspike", weight: 30, minLevel: 2, maxLevel: 4 },
    ],
  },
};

async function upsertMap(mapId: string, cfg: (typeof PATH)[string]) {
  const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
  if (!map) {
    console.log(`  skip ${mapId} (missing)`);
    return;
  }

  let grid: number[][];
  try {
    grid = JSON.parse(map.gridData || "[]");
  } catch {
    console.log(`  skip ${mapId} (bad grid)`);
    return;
  }
  if (!Array.isArray(grid) || !grid.length) {
    console.log(`  skip ${mapId} (empty grid)`);
    return;
  }

  if (cfg.grass) {
    paintGrassRect(grid, cfg.grass.x0, cfg.grass.y0, cfg.grass.x1, cfg.grass.y1);
  }
  patchGrid(grid, cfg.open);

  const gatesJson = JSON.stringify(cfg.gates);
  const gridJson = JSON.stringify(grid);
  const data: Record<string, unknown> = {
    gridData: gridJson,
    gatesData: gatesJson,
    version: { increment: 1 },
  };
  if (cfg.encounters) {
    data.encountersData = JSON.stringify(cfg.encounters);
  }

  await prisma.worldMap.update({ where: { id: mapId }, data: data as any });

  const h = grid.length;
  const w = grid[0]?.length || 24;
  await prisma.gameMap.upsert({
    where: { id: mapId },
    create: {
      id: mapId,
      name: map.name,
      width: w,
      height: h,
      tilesetData: gridJson,
      gates: gatesJson,
      npcs: map.npcsData,
      encounters: cfg.encounters ? JSON.stringify(cfg.encounters) : map.encountersData,
    },
    update: {
      width: w,
      height: h,
      tilesetData: gridJson,
      gates: gatesJson,
      ...(cfg.encounters ? { encounters: JSON.stringify(cfg.encounters) } : {}),
    },
  });

  console.log(
    `  ${mapId}: ${cfg.gates.length} gates` +
      (cfg.grass ? ", tall grass" : "") +
      (cfg.encounters ? `, ${cfg.encounters.length} encounters` : "")
  );
}

async function main() {
  console.log("Seeding Spyder campaign path (gates + grass + encounters)…");
  for (const [mapId, cfg] of Object.entries(PATH)) {
    await upsertMap(mapId, cfg);
  }
  console.log("Done. Walk east from Azure plaza to enter Spyder Route 1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
