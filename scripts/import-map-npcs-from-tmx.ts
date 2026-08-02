/**
 * Extract create_npc events from Tuxemon TMX maps and merge into WorldMap.npcsData only.
 * Does NOT regenerate grids / the 12MB dump.
 *
 * Usage:
 *   TUXEMON_PATH=/path/to/Tuxemon npx tsx scripts/import-map-npcs-from-tmx.ts
 *   TUXEMON_PATH=... npx tsx scripts/import-map-npcs-from-tmx.ts --map cotton
 *
 * Maps dir: $TUXEMON_PATH/mods/tuxemon/maps (or $TUXEMON_MAPS)
 *
 * Spyder play path uses COTTON_TOWN (not only SPYDER_COTTON_TOWN) — TMX hits on
 * SPYDER_* maps are mirrored onto the non-prefix twin when walkable.
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { CAMPAIGN_NPC_SEEDS } from "../src/server/spyderQuests";

const prisma = new PrismaClient();

/** Curated quest NPCs — never move/overwrite coords from TMX. */
const CURATED_IDS = new Set(
  Object.values(CAMPAIGN_NPC_SEEDS).flatMap((list) => list.map((n) => n.id))
);

/** When TMX map id updates, also merge walkable NPCs into these targets. */
const MIRROR_TARGETS: Record<string, string[]> = {
  SPYDER_COTTON_TOWN: ["COTTON_TOWN"],
  SPYDER_COTTON_SCOOP: ["COTTON_SCOOP"],
  SPYDER_COTTON_CAFE: ["COTTON_CAFE"],
};

function resolveMapsDir(): string | null {
  if (process.env.TUXEMON_MAPS && fs.existsSync(process.env.TUXEMON_MAPS)) {
    return process.env.TUXEMON_MAPS;
  }
  const root = process.env.TUXEMON_PATH;
  if (root) {
    const candidate = path.join(root, "mods", "tuxemon", "maps");
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function mapFileToId(file: string): string {
  return path
    .basename(file, ".tmx")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function extractCreateNpcs(tmx: string): Array<{ id: string; x: number; y: number }> {
  const out: Array<{ id: string; x: number; y: number }> = [];
  const re = /create_npc\s+([a-zA-Z0-9_]+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tmx))) {
    out.push({
      id: m[1],
      x: parseInt(m[2], 10),
      y: parseInt(m[3], 10),
    });
  }
  return out;
}

function titleName(slug: string): string {
  return slug
    .replace(/^npc_/, "")
    .replace(/^spyder_/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function guessSprite(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes("monk")) return "monk";
  if (s.includes("hacker") || s.includes("magician")) return "magician";
  if (s.includes("barmaid")) return "barmaid";
  if (s.includes("florist")) return "florist";
  if (s.includes("shop")) return "shopassistant";
  if (s.includes("knight") || s.includes("enforcer")) return "knight";
  if (s.includes("ninja") || s.includes("scout")) return "ninja";
  if (s.includes("dragon") || s.includes("carlos")) return "dragonrider";
  if (s.includes("professor")) return "professor";
  if (s.includes("mom") || s.includes("heroine")) return "heroine";
  if (s.includes("goth")) return "goth";
  if (s.includes("child") || s.includes("confused")) return "childactor";
  return "heroine";
}

async function mergeNpcsIntoMap(
  mapId: string,
  extracted: Array<{ id: string; x: number; y: number }>,
  opts: { walkableOnly?: boolean } = {}
): Promise<number> {
  const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
  if (!world) {
    console.log(`  skip mirror ${mapId} (not in WorldMap)`);
    return 0;
  }

  let grid: number[][] = [];
  try {
    grid = JSON.parse(world.gridData || "[]");
  } catch {
    grid = [];
  }

  let existing: any[] = [];
  try {
    existing = JSON.parse(world.npcsData || "[]");
  } catch {
    existing = [];
  }

  const byId = new Map(existing.map((n) => [n.id, n]));
  let added = 0;

  for (const e of extracted) {
    const id = e.id.startsWith("npc_") ? e.id : `npc_${e.id}`;
    if (CURATED_IDS.has(id)) continue; // keep quest NPC placements

    if (opts.walkableOnly) {
      const tile = grid[e.y]?.[e.x];
      if (tile === undefined || tile === 1) continue;
    }

    const prev = byId.get(id) || {};
    if (!byId.has(id)) added++;
    byId.set(id, {
      ...prev,
      id,
      name: prev.name || titleName(e.id),
      x: e.x,
      y: e.y,
      sprite: prev.sprite || guessSprite(e.id),
      direction: prev.direction || "down",
    });
  }

  const npcs = Array.from(byId.values());
  await prisma.worldMap.update({
    where: { id: mapId },
    data: { npcsData: JSON.stringify(npcs), version: { increment: 1 } },
  });
  await prisma.gameMap
    .update({ where: { id: mapId }, data: { npcs: JSON.stringify(npcs) } })
    .catch(() => undefined);

  return added;
}

async function main() {
  const mapsDir = resolveMapsDir();
  if (!mapsDir) {
    console.error(
      "No TMX maps found. Set TUXEMON_PATH (…/Tuxemon) or TUXEMON_MAPS (…/maps).\n" +
        "Fall back: npm run seed:campaign-npcs for curated placements."
    );
    process.exit(1);
  }

  const filterIdx = process.argv.indexOf("--map");
  const filter = filterIdx >= 0 ? process.argv[filterIdx + 1]?.toLowerCase() : null;

  const files = fs
    .readdirSync(mapsDir)
    .filter((f) => f.endsWith(".tmx"))
    .filter((f) => !filter || f.toLowerCase().includes(filter));

  console.log(`Scanning ${files.length} TMX files in ${mapsDir}`);

  let mapsUpdated = 0;
  let npcsTotal = 0;

  for (const file of files) {
    const mapId = mapFileToId(file);
    const content = fs.readFileSync(path.join(mapsDir, file), "utf8");
    const extracted = extractCreateNpcs(content);
    if (extracted.length === 0) continue;

    const world = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!world) {
      console.log(`  skip ${mapId} (not in WorldMap)`);
      continue;
    }

    const added = await mergeNpcsIntoMap(mapId, extracted, { walkableOnly: false });
    console.log(`  ${mapId}: ${extracted.length} create_npc (Δ${added})`);
    mapsUpdated++;
    npcsTotal += extracted.length;

    for (const mirrorId of MIRROR_TARGETS[mapId] || []) {
      const mirrored = await mergeNpcsIntoMap(mirrorId, extracted, { walkableOnly: true });
      console.log(`    mirror → ${mirrorId}: +${mirrored} walkable`);
    }
  }

  console.log(`Done. Updated ${mapsUpdated} maps, ${npcsTotal} NPC placements from TMX.`);
  console.log("Tip: re-run npm run seed:campaign-npcs to refresh curated quest NPC dialogue.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
