/**
 * Offline integrity check for the Spyder on-ramp (no running server required).
 * Verifies maps, gates, walkable corridors, NPCs, quests, grass, encounters.
 *
 * Usage: npm run smoke:spyder
 */

import { PrismaClient } from "@prisma/client";
import { CAMPAIGN_NPC_SEEDS, SPYDER_QUEST_CHAIN } from "../src/server/spyderQuests";

const prisma = new PrismaClient();

type Fail = string;
const fails: Fail[] = [];
const oks: string[] = [];

function ok(msg: string) {
  oks.push(msg);
  console.log(`  ✓ ${msg}`);
}
function fail(msg: string) {
  fails.push(msg);
  console.error(`  ✗ ${msg}`);
}

function pathClear(
  grid: number[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const h = grid.length;
  const w = grid[0]?.length || 0;
  if (x0 < 0 || y0 < 0 || x1 < 0 || y1 < 0 || x0 >= w || x1 >= w || y0 >= h || y1 >= h) {
    return false;
  }
  if (grid[y0][x0] === 1 || grid[y1][x1] === 1) return false;
  const key = (x: number, y: number) => `${x},${y}`;
  const q: Array<[number, number]> = [[x0, y0]];
  const seen = new Set([key(x0, y0)]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === x1 && y === y1) return true;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (grid[ny][nx] === 1) continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

function countGrass(grid: number[][]): number {
  let n = 0;
  for (const row of grid) for (const t of row) if (t === 2) n++;
  return n;
}

async function checkMap(
  id: string,
  opts: {
    minGrass?: number;
    path?: [number, number, number, number];
    gateTargets?: string[];
  } = {}
) {
  const map = await prisma.worldMap.findUnique({ where: { id } });
  if (!map) {
    fail(`WorldMap missing: ${id}`);
    return;
  }
  let grid: number[][];
  let gates: any;
  let encounters: any;
  try {
    grid = JSON.parse(map.gridData || "[]");
    gates = JSON.parse(map.gatesData || "[]");
    encounters = JSON.parse(map.encountersData || "[]");
  } catch {
    fail(`${id}: bad JSON`);
    return;
  }
  if (!Array.isArray(grid) || !grid.length) {
    fail(`${id}: empty grid`);
    return;
  }
  ok(`${id}: grid ${grid[0].length}x${grid.length}`);

  const gateList = Array.isArray(gates) ? gates : [];
  if (opts.gateTargets) {
    const targets = new Set(gateList.map((g: any) => g.targetMapId));
    for (const t of opts.gateTargets) {
      if (!targets.has(t)) fail(`${id}: missing gate → ${t}`);
      else ok(`${id}: gate → ${t}`);
    }
  }

  if (opts.minGrass != null) {
    const g = countGrass(grid);
    if (g < opts.minGrass) fail(`${id}: grass tiles ${g} < ${opts.minGrass}`);
    else ok(`${id}: tall grass ${g}`);
  }

  if (opts.path) {
    const [x0, y0, x1, y1] = opts.path;
    if (!pathClear(grid, x0, y0, x1, y1)) fail(`${id}: no path (${x0},${y0})→(${x1},${y1})`);
    else ok(`${id}: path (${x0},${y0})→(${x1},${y1})`);
  }

  if (Array.isArray(encounters) && encounters.length > 0) {
    ok(`${id}: ${encounters.length} encounters`);
  } else if (opts.minGrass) {
    fail(`${id}: no encounters configured`);
  }
}

const AMBIENT_MAPS = [
  "AZURE_TOWN",
  "SPYDER_ROUTE1",
  "COTTON_TOWN",
  "COTTON_SCOOP",
  "COTTON_CAFE",
  "SPYDER_COTTON_TUNNEL",
  "SPYDER_ROUTE2",
  "SPYDER_ROUTE3",
  "SPYDER_LEATHER_TOWN",
  "SPYDER_LEATHER_CENTER",
] as const;

async function checkNpcs() {
  for (const [mapId, seeds] of Object.entries(CAMPAIGN_NPC_SEEDS)) {
    const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!map) {
      fail(`NPC map missing: ${mapId}`);
      continue;
    }
    let npcs: any[] = [];
    try {
      npcs = JSON.parse(map.npcsData || "[]");
    } catch {
      fail(`${mapId}: bad npcsData`);
      continue;
    }
    let grid: number[][] = [];
    try {
      grid = JSON.parse(map.gridData || "[]");
    } catch {
      /* ignore */
    }
    for (const seed of seeds) {
      const found = npcs.find((n) => n.id === seed.id);
      if (!found) {
        fail(`${mapId}: missing NPC ${seed.id}`);
        continue;
      }
      const tile = grid[found.y]?.[found.x];
      if (tile === 1) fail(`${mapId}: ${seed.id} on wall (${found.x},${found.y})`);
      else ok(`${mapId}: ${seed.id} @ (${found.x},${found.y})`);

      const tree = await prisma.npcDialogueTree.findUnique({ where: { npcId: seed.id } });
      if (!tree) fail(`dialogue missing: ${seed.id}`);
      else ok(`dialogue: ${seed.id}`);
    }
  }
}

async function checkDialogueActions() {
  const clerk = await prisma.npcDialogueTree.findUnique({
    where: { npcId: "npc_cotton_scoop_clerk" },
  });
  if (!clerk?.data?.includes("OPEN_SHOP")) {
    fail("Scoop clerk dialogue missing OPEN_SHOP");
  } else {
    ok("Scoop clerk OPEN_SHOP");
  }

  const nurse = await prisma.npcDialogueTree.findUnique({
    where: { npcId: "npc_cotton_scoop_nurse" },
  });
  if (!nurse?.data?.includes("HEAL_PARTY")) {
    fail("Scoop nurse dialogue missing HEAL_PARTY");
  } else {
    ok("Scoop nurse HEAL_PARTY");
  }

  const leatherNurse = await prisma.npcDialogueTree.findUnique({
    where: { npcId: "npc_leather_center_nurse" },
  });
  if (!leatherNurse?.data?.includes("HEAL_PARTY")) {
    fail("Leather nurse dialogue missing HEAL_PARTY");
  } else {
    ok("Leather nurse HEAL_PARTY");
  }

  const guide = await prisma.npcDialogueTree.findUnique({
    where: { npcId: "npc_azure_guide" },
  });
  if (
    !guide?.data?.includes("node_route2") ||
    !guide?.data?.includes("node_leather") ||
    !guide?.data?.includes("node_done")
  ) {
    fail("Guide tree missing node_route2 / node_leather / node_done");
  } else {
    ok("Guide has node_route2 + node_leather + node_done");
  }
}

async function checkQuestGoldFields() {
  for (const q of SPYDER_QUEST_CHAIN) {
    let rewards: { gold?: number } = {};
    try {
      rewards = JSON.parse(q.rewards);
    } catch {
      fail(`quest ${q.slug}: bad rewards JSON`);
      continue;
    }
    if (typeof rewards.gold === "number" && rewards.gold > 0) {
      ok(`quest ${q.slug}: gold ${rewards.gold}`);
    }
  }
}

/** Every NPC on Spyder maps: off walls + usable dialogue tree. */
async function checkAmbientNpcs() {
  for (const mapId of AMBIENT_MAPS) {
    const map = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!map) continue;
    let npcs: any[] = [];
    let grid: number[][] = [];
    try {
      npcs = JSON.parse(map.npcsData || "[]");
      grid = JSON.parse(map.gridData || "[]");
    } catch {
      fail(`${mapId}: bad ambient JSON`);
      continue;
    }
    for (const npc of npcs) {
      const tile = grid[npc.y]?.[npc.x];
      if (tile === 1) fail(`${mapId}: ambient ${npc.id} on wall (${npc.x},${npc.y})`);
      else ok(`${mapId}: ambient ${npc.id} walkable`);

      const tree = await prisma.npcDialogueTree.findUnique({ where: { npcId: npc.id } });
      let usable = false;
      if (tree?.data) {
        try {
          const parsed = JSON.parse(tree.data);
          usable = Boolean(parsed?.node_start?.text);
        } catch {
          usable = false;
        }
      }
      if (!usable) fail(`${mapId}: ambient dialogue missing/broken: ${npc.id}`);
      else ok(`${mapId}: ambient dialogue ${npc.id}`);
    }
  }
}

async function checkQuests() {
  for (const q of SPYDER_QUEST_CHAIN) {
    const row = await prisma.questTemplate.findUnique({
      where: { slug: q.slug },
      include: { objectives: { orderBy: { stage: "asc" } } },
    });
    if (!row) {
      fail(`quest missing: ${q.slug}`);
      continue;
    }
    if (row.objectives.length !== q.objectives.length) {
      fail(
        `quest ${q.slug}: objectives ${row.objectives.length} != ${q.objectives.length}`
      );
    } else {
      ok(`quest ${q.slug}: ${row.objectives.length} stages`);
    }
    for (const obj of q.objectives) {
      const match = row.objectives.find(
        (o) => o.stage === obj.stage && o.targetSlug === obj.targetSlug
      );
      if (!match) fail(`quest ${q.slug}: missing stage ${obj.stage} ${obj.targetSlug}`);
    }
  }
}

async function main() {
  console.log("Spyder path smoke (DB integrity)…\nMaps");
  await checkMap("AZURE_TOWN", {
    gateTargets: ["SPYDER_ROUTE1"],
    path: [25, 25, 49, 25],
  });
  await checkMap("SPYDER_ROUTE1", {
    gateTargets: ["AZURE_TOWN", "COTTON_TOWN"],
    minGrass: 20,
    path: [2, 10, 39, 10],
  });
  await checkMap("COTTON_TOWN", {
    gateTargets: ["SPYDER_ROUTE1", "COTTON_SCOOP", "COTTON_CAFE", "SPYDER_COTTON_TUNNEL"],
    path: [2, 20, 37, 18],
  });
  await checkMap("COTTON_SCOOP", {
    gateTargets: ["COTTON_TOWN"],
    path: [6, 8, 6, 5],
  });
  await checkMap("COTTON_CAFE", {
    gateTargets: ["COTTON_TOWN"],
    path: [5, 10, 7, 6],
  });
  await checkMap("SPYDER_COTTON_TUNNEL", {
    gateTargets: ["COTTON_TOWN", "SPYDER_ROUTE2"],
    path: [2, 15, 38, 7],
  });
  await checkMap("SPYDER_ROUTE2", {
    gateTargets: ["SPYDER_COTTON_TUNNEL", "SPYDER_ROUTE3"],
    minGrass: 10,
    path: [2, 10, 39, 10],
  });
  await checkMap("SPYDER_ROUTE3", {
    gateTargets: ["SPYDER_ROUTE2", "SPYDER_LEATHER_TOWN"],
    minGrass: 10,
    path: [2, 10, 39, 21],
  });
  await checkMap("SPYDER_LEATHER_TOWN", {
    gateTargets: ["SPYDER_ROUTE3", "SPYDER_LEATHER_CENTER"],
    path: [2, 21, 10, 18],
  });
  await checkMap("SPYDER_LEATHER_CENTER", {
    gateTargets: ["SPYDER_LEATHER_TOWN"],
    path: [6, 8, 6, 6],
  });

  console.log("\nNPCs");
  await checkNpcs();

  console.log("\nAmbient NPCs (walls + dialogue)");
  await checkAmbientNpcs();

  console.log("\nDialogue actions");
  await checkDialogueActions();

  console.log("\nQuests");
  await checkQuests();

  console.log("\nQuest reward gold fields");
  await checkQuestGoldFields();

  console.log(`\n${oks.length} checks passed, ${fails.length} failed`);
  if (fails.length) {
    process.exitCode = 1;
  } else {
    console.log("Spyder path smoke OK");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
