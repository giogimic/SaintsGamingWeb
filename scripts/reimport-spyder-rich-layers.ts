/**
 * Reimport TMX tileLayers + tilesets for Spyder on-ramp maps into WorldMap.
 *
 * Usage:
 *   TUXEMON_PATH=/tmp/Tuxemon npx tsx scripts/reimport-spyder-rich-layers.ts
 *
 * Does not rewrite collision grids / gates / NPCs — only visual layers + tilesets.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PrismaClient } from "@prisma/client";

const TUXEMON_ROOT = process.env.TUXEMON_PATH || "/tmp/Tuxemon";
const MAPS_DIR = path.join(TUXEMON_ROOT, "mods", "tuxemon", "maps");
const TILESETS_DIR = path.join(process.cwd(), "public", "assets", "tilesets");

/** Spyder smoke path maps (filename → WorldMap id). Prefer spyder_* TMX when present. */
const SPYDER_MAPS: Record<string, string> = {
  "azure_town.tmx": "AZURE_TOWN",
  "spyder_route1.tmx": "SPYDER_ROUTE1",
  "route1.tmx": "SPYDER_ROUTE1",
  "cotton_town.tmx": "COTTON_TOWN",
  "cotton_scoop.tmx": "COTTON_SCOOP",
  "cotton_cafe.tmx": "COTTON_CAFE",
  "spyder_cotton_tunnel.tmx": "SPYDER_COTTON_TUNNEL",
  "cotton_underground.tmx": "SPYDER_COTTON_TUNNEL",
  "spyder_route2.tmx": "SPYDER_ROUTE2",
  "route2.tmx": "SPYDER_ROUTE2",
  "spyder_route3.tmx": "SPYDER_ROUTE3",
  "route3.tmx": "SPYDER_ROUTE3",
  "spyder_leather_town.tmx": "SPYDER_LEATHER_TOWN",
  "leather_town.tmx": "SPYDER_LEATHER_TOWN",
  "spyder_leather_scoop.tmx": "SPYDER_LEATHER_SCOOP",
  "leather_scoop.tmx": "SPYDER_LEATHER_SCOOP",
  "spyder_leather_center.tmx": "SPYDER_LEATHER_CENTER",
  "spyder_leather_gym.tmx": "SPYDER_LEATHER_GYM",
  "spyder_leather_shaft1.tmx": "SPYDER_LEATHER_SHAFT1",
  "leather_shaft1.tmx": "SPYDER_LEATHER_SHAFT1",
  "spyder_leather_shaft2.tmx": "SPYDER_LEATHER_SHAFT2",
  "leather_shaft2.tmx": "SPYDER_LEATHER_SHAFT2",
};

type TilesetInfo = {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
};

const tsxCache: Record<string, Omit<TilesetInfo, "firstgid">> = {};

function parseTsx(tsxFilename: string) {
  const key = path.basename(tsxFilename);
  if (tsxCache[key]) return tsxCache[key];
  const tsxPath = path.join(TILESETS_DIR, key);
  if (!fs.existsSync(tsxPath)) {
    console.warn(`[!] TSX missing: ${tsxPath}`);
    return { imageSource: "", columns: 1, tilewidth: 16, tileheight: 16 };
  }
  const content = fs.readFileSync(tsxPath, "utf8");
  const imgMatch = content.match(/<image [^>]*source="([^"]+)"/);
  const colsMatch = content.match(/columns="(\d+)"/);
  const widthMatch = content.match(/tilewidth="(\d+)"/);
  const heightMatch = content.match(/tileheight="(\d+)"/);
  const res = {
    imageSource: imgMatch ? path.basename(imgMatch[1]) : "",
    columns: colsMatch ? parseInt(colsMatch[1], 10) : 16,
    tilewidth: widthMatch ? parseInt(widthMatch[1], 10) : 16,
    tileheight: heightMatch ? parseInt(heightMatch[1], 10) : 16,
  };
  tsxCache[key] = res;
  return res;
}

function parseMapTmx(filePath: string) {
  const content = fs.readFileSync(filePath, "utf8");
  const mapWidth = parseInt(content.match(/width="(\d+)"/)?.[1] || "16", 10);
  const mapHeight = parseInt(content.match(/height="(\d+)"/)?.[1] || "16", 10);

  const tilesets: TilesetInfo[] = [];
  const tilesetRegex = /<tileset firstgid="(\d+)" source="([^"]+)"/g;
  let tsMatch;
  while ((tsMatch = tilesetRegex.exec(content)) !== null) {
    tilesets.push({
      firstgid: parseInt(tsMatch[1], 10),
      ...parseTsx(tsMatch[2]),
    });
  }

  const tileLayers: Array<{ name: string; grid: number[][] }> = [];
  const emptyGrid = () =>
    Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0) as number[]);

  // base64 + zlib (most spyder_*.tmx)
  const zlibLayerRegex =
    /<layer [^>]*name="([^"]+)"[^>]*>[\s\S]*?<data encoding="base64" compression="zlib">([\s\S]*?)<\/data>[\s\S]*?<\/layer>/g;
  let lMatch;
  while ((lMatch = zlibLayerRegex.exec(content)) !== null) {
    const layerName = lMatch[1];
    const buffer = Buffer.from(lMatch[2].trim(), "base64");
    const decompressed = zlib.inflateSync(buffer);
    const layerGrid = emptyGrid();
    for (let i = 0; i < decompressed.length / 4 && i < mapWidth * mapHeight; i++) {
      const gid = decompressed.readUInt32LE(i * 4);
      const x = i % mapWidth;
      const y = Math.floor(i / mapWidth);
      if (layerGrid[y]) layerGrid[y][x] = gid;
    }
    tileLayers.push({ name: layerName, grid: layerGrid });
  }

  // csv (azure_town.tmx and some classic maps)
  if (tileLayers.length === 0) {
    const csvLayerRegex =
      /<layer [^>]*name="([^"]+)"[^>]*>[\s\S]*?<data encoding="csv">([\s\S]*?)<\/data>[\s\S]*?<\/layer>/g;
    while ((lMatch = csvLayerRegex.exec(content)) !== null) {
      const layerName = lMatch[1];
      const values = lMatch[2]
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s, 10) || 0);
      const layerGrid = emptyGrid();
      for (let i = 0; i < values.length && i < mapWidth * mapHeight; i++) {
        const x = i % mapWidth;
        const y = Math.floor(i / mapWidth);
        if (layerGrid[y]) layerGrid[y][x] = values[i];
      }
      tileLayers.push({ name: layerName, grid: layerGrid });
    }
  }

  return { width: mapWidth, height: mapHeight, tileLayers, tilesets };
}

async function main() {
  if (!fs.existsSync(MAPS_DIR)) {
    throw new Error(`Tuxemon maps dir not found: ${MAPS_DIR} (set TUXEMON_PATH)`);
  }

  const prisma = new PrismaClient();
  let updated = 0;
  const done = new Set<string>();

  // Prefer spyder_* TMX when both classic + spyder entries map to the same id.
  const entries = Object.entries(SPYDER_MAPS).sort(([a], [b]) => {
    const ap = a.startsWith("spyder_") ? 0 : 1;
    const bp = b.startsWith("spyder_") ? 0 : 1;
    return ap - bp || a.localeCompare(b);
  });

  for (const [file, mapId] of entries) {
    if (done.has(mapId)) continue;
    const full = path.join(MAPS_DIR, file);
    if (!fs.existsSync(full)) {
      continue;
    }
    const existing = await prisma.worldMap.findUnique({ where: { id: mapId } });
    if (!existing) {
      console.warn(`[skip] WorldMap ${mapId} not in DB`);
      continue;
    }

    const parsed = parseMapTmx(full);
    if (!parsed.tileLayers.length) {
      console.warn(`[skip] ${mapId}: no tile layers decoded from ${file}`);
      continue;
    }

    await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        tileLayersData: JSON.stringify(parsed.tileLayers),
        tilesetsData: JSON.stringify(parsed.tilesets),
        version: { increment: 1 },
      },
    });
    done.add(mapId);
    updated++;
    console.log(
      `[ok] ${mapId} ← ${file}: ${parsed.tileLayers.length} layers, ${parsed.tilesets.length} tilesets (${parsed.width}x${parsed.height})`
    );
  }

  await prisma.$disconnect();
  console.log(`[done] updated ${updated} maps`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
