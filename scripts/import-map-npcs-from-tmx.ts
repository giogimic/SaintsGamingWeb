/**
 * Extract create_npc events from Tuxemon TMX maps and merge into WorldMap.npcsData only.
 * Does NOT regenerate grids / the 12MB dump.
 *
 * Usage:
 *   TUXEMON_PATH=/path/to/Tuxemon npx tsx scripts/import-map-npcs-from-tmx.ts
 *   TUXEMON_PATH=... npx tsx scripts/import-map-npcs-from-tmx.ts --map azure_town
 *
 * Maps dir: $TUXEMON_PATH/mods/tuxemon/maps (or $TUXEMON_MAPS)
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  // create_npc slug,x,y  (optional spaces)
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

    let existing: any[] = [];
    try {
      existing = JSON.parse(world.npcsData || "[]");
    } catch {
      existing = [];
    }

    const byId = new Map(existing.map((n) => [n.id, n]));
    for (const e of extracted) {
      const id = e.id.startsWith("npc_") ? e.id : `npc_${e.id}`;
      const prev = byId.get(id) || {};
      byId.set(id, {
        ...prev,
        id,
        name: prev.name || titleName(e.id),
        x: e.x,
        y: e.y,
        sprite: prev.sprite || "heroine",
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
      .catch(async () => {
        /* GameMap may be missing */
      });

    console.log(`  ${mapId}: ${extracted.length} create_npc → ${npcs.length} total`);
    mapsUpdated++;
    npcsTotal += extracted.length;
  }

  console.log(`Done. Updated ${mapsUpdated} maps, ${npcsTotal} NPC placements from TMX.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
