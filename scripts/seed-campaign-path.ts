/**
 * Seed Azure ↔ Spyder Route 1 ↔ Cotton Town warps, tall grass, and route encounters.
 * Also carves walkable corridors so gates/grass/NPCs are reachable through walls.
 *
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

/** Open wall tiles (and force specific tile ids). */
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

/** Carve a horizontal corridor — walls (1) become walkable (0). Keeps grass/gates. */
function carveH(
  grid: number[][],
  y: number,
  x0: number,
  x1: number,
  walkTile = 0
) {
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  if (!grid[y]) return;
  for (let x = lo; x <= hi; x++) {
    if (grid[y][x] === undefined) continue;
    if (grid[y][x] === 1) grid[y][x] = walkTile;
  }
}

/** Carve a vertical corridor — walls (1) become walkable (0). */
function carveV(
  grid: number[][],
  x: number,
  y0: number,
  y1: number,
  walkTile = 0
) {
  const lo = Math.min(y0, y1);
  const hi = Math.max(y0, y1);
  for (let y = lo; y <= hi; y++) {
    if (!grid[y] || grid[y][x] === undefined) continue;
    if (grid[y][x] === 1) grid[y][x] = walkTile;
  }
}

/** Paint tall grass over walkable tiles (skips solid walls). */
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
      if (grid[y][x] === 1 || grid[y][x] === 3 || grid[y][x] === 4) continue;
      grid[y][x] = 2;
    }
  }
}

type PathCfg = {
  gates: Gate[];
  open: Array<{ x: number; y: number; tile: number }>;
  /** Extra corridor carve passes before grass paint */
  corridors?: Array<
    | { dir: "h"; y: number; x0: number; x1: number }
    | { dir: "v"; x: number; y0: number; y1: number }
  >;
  grass?: { x0: number; y0: number; x1: number; y1: number };
  encounters?: Array<{ slug: string; weight: number; minLevel?: number; maxLevel?: number }>;
};

const PATH: Record<string, PathCfg> = {
  AZURE_TOWN: {
    gates: [gate(49, 25, "SPYDER_ROUTE1", 2, 10)],
    open: [
      { x: 48, y: 25, tile: 0 },
      { x: 49, y: 25, tile: 3 },
      { x: 48, y: 24, tile: 0 },
      { x: 48, y: 26, tile: 0 },
    ],
    corridors: [{ dir: "h", y: 25, x0: 25, x1: 49 }],
  },
  SPYDER_ROUTE1: {
    gates: [
      gate(0, 10, "AZURE_TOWN", 47, 25),
      gate(39, 10, "COTTON_TOWN", 2, 19),
    ],
    open: [
      { x: 0, y: 10, tile: 3 },
      { x: 39, y: 10, tile: 4 },
      // ensure spawn pocket
      { x: 1, y: 10, tile: 0 },
      { x: 2, y: 10, tile: 0 },
      { x: 2, y: 9, tile: 0 },
      { x: 2, y: 11, tile: 0 },
      { x: 38, y: 10, tile: 0 },
    ],
    // Full east-west road + shoulder lanes through wall bands
    corridors: [
      { dir: "h", y: 9, x0: 1, x1: 38 },
      { dir: "h", y: 10, x0: 1, x1: 38 },
      { dir: "h", y: 11, x0: 1, x1: 38 },
    ],
    grass: { x0: 10, y0: 8, x1: 22, y1: 13 },
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
      { x: 2, y: 20, tile: 0 },
      { x: 4, y: 19, tile: 0 },
      { x: 5, y: 19, tile: 0 },
    ],
    // West gate → open lane on y=19 toward greeter
    corridors: [
      { dir: "h", y: 20, x0: 1, x1: 6 },
      { dir: "v", x: 2, y0: 19, y1: 20 },
      { dir: "h", y: 19, x0: 2, x1: 18 },
      { dir: "v", x: 4, y0: 15, y1: 19 },
    ],
  },
  ROUTE1: {
    gates: [
      gate(0, 20, "AZURE_TOWN", 47, 25),
      gate(58, 20, "COTTON_TOWN", 2, 19),
    ],
    open: [
      { x: 0, y: 20, tile: 3 },
      { x: 1, y: 20, tile: 0 },
      { x: 58, y: 20, tile: 4 },
      { x: 57, y: 20, tile: 0 },
    ],
    corridors: [
      { dir: "h", y: 19, x0: 1, x1: 57 },
      { dir: "h", y: 20, x0: 1, x1: 57 },
      { dir: "h", y: 21, x0: 1, x1: 57 },
    ],
    grass: { x0: 20, y0: 15, x1: 30, y1: 22 },
    encounters: [
      { slug: "pairagrin", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "aardorn", weight: 35, minLevel: 2, maxLevel: 4 },
      { slug: "cataspike", weight: 30, minLevel: 2, maxLevel: 4 },
    ],
  },
};

async function upsertMap(mapId: string, cfg: PathCfg) {
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

  for (const c of cfg.corridors || []) {
    if (c.dir === "h") carveH(grid, c.y, c.x0, c.x1);
    else carveV(grid, c.x, c.y0, c.y1);
  }

  if (cfg.grass) {
    paintGrassRect(grid, cfg.grass.x0, cfg.grass.y0, cfg.grass.x1, cfg.grass.y1);
  }
  // Gates / spawn pockets last so they win over grass
  patchGrid(grid, cfg.open);
  for (const g of cfg.gates) {
    const tile = g === cfg.gates[0] ? 3 : 4;
    patchGrid(grid, [{ x: g.position.x, y: g.position.y, tile }]);
  }

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
      (cfg.corridors?.length ? `, ${cfg.corridors.length} corridors` : "") +
      (cfg.grass ? ", tall grass" : "") +
      (cfg.encounters ? `, ${cfg.encounters.length} encounters` : "")
  );
}

async function main() {
  console.log("Seeding Spyder campaign path (gates + corridors + grass)…");
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
