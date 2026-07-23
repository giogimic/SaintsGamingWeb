import fs from 'fs';
import path from 'path';

const TUXEMON_MAPS_DIR = 'C:\\Users\\Matth\\OneDrive\\Desktop\\Tuxemon-0.5-rc1\\mods\\tuxemon\\maps';
const OUTPUT_FILE = path.join(process.cwd(), 'components', 'the-lobby', 'data', 'campaign-maps.ts');

interface MapDefinition {
  id: string;
  name: string;
  grid: number[][];
  gates: Record<number, {
    targetMapId: string;
    spawnPoint: { x: number; y: number };
    requiredElement?: string;
    errorMessage?: string;
  }>;
  npcs?: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    sprite: string;
    dialogueKey: string;
  }>;
  encounterPool?: Array<{
    speciesId: string;
    minLevel: number;
    maxLevel: number;
    weight: number;
  }>;
}

// Convert a TMX filename to map ID
function formatMapId(filename: string): string {
  return filename
    .replace('.tmx', '')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

function parseTmxToGrid(tmxContent: string): { width: number; height: number; grid: number[][] } {
  const widthMatch = tmxContent.match(/width="(\d+)"/);
  const heightMatch = tmxContent.match(/height="(\d+)"/);

  const width = widthMatch ? Math.max(16, parseInt(widthMatch[1], 10)) : 16;
  const height = heightMatch ? Math.max(16, parseInt(heightMatch[1], 10)) : 16;

  // Initialize default grass grid
  const grid: number[][] = Array.from({ length: height }, () => Array(width).fill(0));

  // Extract CSV layer data if present
  const dataMatch = tmxContent.match(/<data encoding="csv">([\s\S]*?)<\/data>/);
  if (dataMatch && dataMatch[1]) {
    const numbers = dataMatch[1]
      .trim()
      .split(',')
      .map(n => parseInt(n.trim(), 10))
      .filter(n => !isNaN(n));

    for (let i = 0; i < numbers.length && i < width * height; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const val = numbers[i];

      // Create a basic perimeter wall if zero/boundary
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        if (grid[y]) grid[y][x] = 1;
      } else if (val > 0) {
        if (grid[y]) {
          if (val % 5 === 0) grid[y][x] = 2; // Tall grass
          else if (val % 7 === 0) grid[y][x] = 1; // Collision wall
          else if (val % 11 === 0) grid[y][x] = 10; // Water spot
          else grid[y][x] = 0; // Grass path
        }
      }
    }
  } else {
    // Basic perimeter wall fallback
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          if (grid[y]) grid[y][x] = 1;
        }
      }
    }
  }

  return { width, height, grid };
}

async function runImport() {
  console.log('[*] Importing Tuxemon campaign maps & events...');
  
  if (!fs.existsSync(TUXEMON_MAPS_DIR)) {
    console.error('[!] Tuxemon maps directory not found at:', TUXEMON_MAPS_DIR);
    return;
  }

  const files = fs.readdirSync(TUXEMON_MAPS_DIR);
  const tmxFiles = files.filter(f => f.endsWith('.tmx'));

  const campaignMaps: Record<string, MapDefinition> = {};

  // Core starter campaign maps
  const coreMaps = [
    'player_house_bedroom.tmx',
    'player_house_downstairs.tmx',
    'spyder_paper_town.tmx',
    'professor_lab.tmx',
    'spyder_route1.tmx',
    'spyder_cotton_town.tmx',
    'spyder_healing_center.tmx',
    'spyder_candy_town.tmx',
    'dragonscave.tmx'
  ];

  const setTileSafe = (grid: number[][], y: number, x: number, val: number) => {
    if (grid[y] && grid[y][x] !== undefined) {
      grid[y][x] = val;
    }
  };

  for (const file of tmxFiles) {
    if (!coreMaps.includes(file) && Object.keys(campaignMaps).length >= 30) continue;

    const mapId = formatMapId(file);
    const filePath = path.join(TUXEMON_MAPS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const { grid } = parseTmxToGrid(content);

    const gates: MapDefinition['gates'] = {};
    const npcs: MapDefinition['npcs'] = [];

    if (mapId === 'PLAYER_HOUSE_BEDROOM') {
      setTileSafe(grid, 2, 7, 9);
      gates[9] = {
        targetMapId: 'PLAYER_HOUSE_DOWNSTAIRS',
        spawnPoint: { x: 2, y: 2 }
      };
    } else if (mapId === 'PLAYER_HOUSE_DOWNSTAIRS') {
      setTileSafe(grid, 1, 2, 9);
      setTileSafe(grid, 7, 4, 8);
      gates[9] = { targetMapId: 'PLAYER_HOUSE_BEDROOM', spawnPoint: { x: 6, y: 2 } };
      gates[8] = { targetMapId: 'SPYDER_PAPER_TOWN', spawnPoint: { x: 10, y: 12 } };
      npcs.push({
        id: 'npc_mom',
        name: 'Mom',
        x: 5,
        y: 4,
        sprite: 'npc_mom',
        dialogueKey: 'mom_greeting'
      });
    } else if (mapId === 'SPYDER_PAPER_TOWN') {
      setTileSafe(grid, 12, 10, 8);
      setTileSafe(grid, 8, 15, 7);
      gates[8] = { targetMapId: 'PLAYER_HOUSE_DOWNSTAIRS', spawnPoint: { x: 4, y: 6 } };
      gates[7] = { targetMapId: 'PROFESSOR_LAB', spawnPoint: { x: 8, y: 12 } };
      npcs.push({
        id: 'npc_town_guide',
        name: 'Tamer Guide',
        x: 12,
        y: 10,
        sprite: 'npc_guide',
        dialogueKey: 'paper_town_welcome'
      });
    } else if (mapId === 'PROFESSOR_LAB') {
      setTileSafe(grid, 13, 8, 9);
      gates[9] = { targetMapId: 'SPYDER_PAPER_TOWN', spawnPoint: { x: 15, y: 9 } };
      npcs.push({
        id: 'npc_professor',
        name: 'Prof. Oakwood',
        x: 8,
        y: 3,
        sprite: 'npc_prof',
        dialogueKey: 'choose_starter_beast'
      });
    }

    campaignMaps[mapId] = {
      id: mapId,
      name: file.replace('.tmx', '').replace(/_/g, ' ').toUpperCase(),
      grid,
      gates,
      npcs,
      encounterPool: [
        { speciesId: 'rockitten', minLevel: 2, maxLevel: 5, weight: 40 },
        { speciesId: 'gnawly', minLevel: 2, maxLevel: 4, weight: 40 },
        { speciesId: 'nuttywutty', minLevel: 3, maxLevel: 6, weight: 20 }
      ]
    };
  }

  const outputCode = `// Generated Campaign Maps Data
import { GameMapData } from './maps';

export const TUXEMON_CAMPAIGN_MAPS: Record<string, GameMapData> = ${JSON.stringify(campaignMaps, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, outputCode, 'utf-8');
  console.log(`[+] Successfully wrote ${Object.keys(campaignMaps).length} campaign maps to ${OUTPUT_FILE}`);
}

runImport().catch(console.error);
