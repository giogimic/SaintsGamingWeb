import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const TUXEMON_MAPS_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\maps';
const TILESETS_DIR = path.join(process.cwd(), 'public', 'assets', 'tilesets');
const OUTPUT_FILE = path.join(process.cwd(), 'components', 'the-lobby', 'data', 'campaign-maps.ts');

interface TilesetInfo {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
}

interface ResolvedTile {
  gid: number;
  image: string;
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

// Cache parsed TSX info
const tsxCache: Record<string, { imageSource: string; columns: number; tilewidth: number; tileheight: number }> = {};

function parseTsx(tsxFilename: string) {
  if (tsxCache[tsxFilename]) return tsxCache[tsxFilename];

  const tsxPath = path.join(TILESETS_DIR, path.basename(tsxFilename));
  if (!fs.existsSync(tsxPath)) {
    console.warn(`[!] TSX not found: ${tsxPath}`);
    return { imageSource: '', columns: 1, tilewidth: 16, tileheight: 16 };
  }

  const content = fs.readFileSync(tsxPath, 'utf8');
  const imgMatch = content.match(/<image [^>]*source="([^"]+)"/);
  const colsMatch = content.match(/columns="(\d+)"/);
  const widthMatch = content.match(/tilewidth="(\d+)"/);
  const heightMatch = content.match(/tileheight="(\d+)"/);

  const res = {
    imageSource: imgMatch ? path.basename(imgMatch[1]) : '',
    columns: colsMatch ? parseInt(colsMatch[1], 10) : 16,
    tilewidth: widthMatch ? parseInt(widthMatch[1], 10) : 16,
    tileheight: heightMatch ? parseInt(heightMatch[1], 10) : 16,
  };

  tsxCache[tsxFilename] = res;
  return res;
}

function parseMapTmx(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const widthMatch = content.match(/width="(\d+)"/);
  const heightMatch = content.match(/height="(\d+)"/);
  const mapWidth = widthMatch ? parseInt(widthMatch[1], 10) : 16;
  const mapHeight = heightMatch ? parseInt(heightMatch[1], 10) : 16;

  // Extract tileset definitions
  const tilesets: TilesetInfo[] = [];
  const tilesetRegex = /<tileset firstgid="(\d+)" source="([^"]+)"/g;
  let tsMatch;
  while ((tsMatch = tilesetRegex.exec(content)) !== null) {
    const firstgid = parseInt(tsMatch[1], 10);
    const tsxInfo = parseTsx(tsMatch[2]);
    tilesets.push({
      firstgid,
      ...tsxInfo
    });
  }

  // Sort tilesets descending by firstgid for matching
  tilesets.sort((a, b) => b.firstgid - a.firstgid);

  // Extract Layers
  const tileLayers: Array<{ name: string; grid: number[][] }> = [];
  const layerRegex = /<layer [^>]*name="([^"]+)"[^>]*>[\s\S]*?<data encoding="base64" compression="zlib">([\s\S]*?)<\/data>[\s\S]*?<\/layer>/g;
  let lMatch;
  while ((lMatch = layerRegex.exec(content)) !== null) {
    const layerName = lMatch[1];
    const rawData = lMatch[2].trim();
    const buffer = Buffer.from(rawData, 'base64');
    const decompressed = zlib.inflateSync(buffer);
    
    const layerGrid: number[][] = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
    for (let i = 0; i < decompressed.length / 4 && i < mapWidth * mapHeight; i++) {
      const gid = decompressed.readUInt32LE(i * 4);
      const x = i % mapWidth;
      const y = Math.floor(i / mapWidth);
      if (layerGrid[y]) layerGrid[y][x] = gid;
    }
    tileLayers.push({ name: layerName, grid: layerGrid });
  }

  // Extract Collisions
  const collisionGrid: number[][] = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0));
  
  // Mark boundaries as 1 by default
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
        collisionGrid[y][x] = 1;
      }
    }
  }

  const collisionRegex = /<object [^>]*type="collision"[^>]*x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g;
  let cMatch;
  while ((cMatch = collisionRegex.exec(content)) !== null) {
    const startX = Math.floor(parseInt(cMatch[1], 10) / 16);
    const startY = Math.floor(parseInt(cMatch[2], 10) / 16);
    const widthInTiles = Math.ceil(parseInt(cMatch[3], 10) / 16);
    const heightInTiles = Math.ceil(parseInt(cMatch[4], 10) / 16);

    for (let dy = 0; dy < heightInTiles; dy++) {
      for (let dx = 0; dx < widthInTiles; dx++) {
        const cx = startX + dx;
        const cy = startY + dy;
        if (cy >= 0 && cy < mapHeight && cx >= 0 && cx < mapWidth) {
          collisionGrid[cy][cx] = 1;
        }
      }
    }
  }

  // Combine layers into visual grid and collision grid
  return {
    width: mapWidth,
    height: mapHeight,
    grid: collisionGrid,
    tileLayers,
    tilesets
  };
}

async function run() {
  console.log('[*] Parsing full Tuxemon campaign maps with rich layers & tilesets...');
  const files = fs.readdirSync(TUXEMON_MAPS_DIR).filter(f => f.endsWith('.tmx'));
  
  const mapsData: Record<string, any> = {};

  for (const file of files) {
    const mapId = file.replace('.tmx', '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const fullPath = path.join(TUXEMON_MAPS_DIR, file);
    try {
      const parsed = parseMapTmx(fullPath);
      mapsData[mapId] = {
        id: mapId,
        name: mapId.replace(/_/g, ' '),
        width: parsed.width,
        height: parsed.height,
        grid: parsed.grid,
        tileLayers: parsed.tileLayers,
        tilesets: parsed.tilesets
      };
    } catch (err) {
      console.error(`[-] Failed to parse ${file}:`, err);
    }
  }

  console.log(`[✓] Successfully parsed ${Object.keys(mapsData).length} rich campaign maps!`);
  
  const fileContent = `// Rich Generated Campaign Maps Data
import { GameMapData } from './maps';

export const TUXEMON_CAMPAIGN_MAPS: Record<string, any> = ${JSON.stringify(mapsData, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, fileContent);
  console.log(`[✓] Saved rich maps to ${OUTPUT_FILE}`);
}

run();
