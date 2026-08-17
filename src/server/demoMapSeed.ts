/**
 * Canonical DEMO_SANDBOX layout aligned with MapLogicTile ids:
 * 0 walkable, 1 wall, 2 tall grass, 5 tree, 6 ore, 7 shop, 9 craft, 11 bramble
 */

import fs from "fs";
import path from "path";

export const DEMO_MAP_ID = "DEMO_SANDBOX";
export const DEMO_MAP_W = 30;
export const DEMO_MAP_H = 30;

/**
 * Default Tuxemon/George tilesets for Studio visual paint.
 * DEMO_SANDBOX historically shipped logic-grid only (tileLayers=[], tilesets=[]),
 * which left TilesetPicker empty and made PR #18 paint overlays a no-op.
 * Keep in sync with WorldBuilderPanel / createBlankWorldProfile / studioTilesetBootstrap.
 */
export type StudioTilesetMeta = {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
};

export const DEFAULT_STUDIO_TILESETS: StudioTilesetMeta[] = [
  { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
  { firstgid: 1000, imageSource: "Furniture_and_Fittings_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 2000, imageSource: "Interior_Walls_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 3000, imageSource: "Interior_Floors_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 4000, imageSource: "Vegetation_and_Outdoor_Fittings_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
];

export function checkTilesetExistsOnDisk(filename: string): boolean {
  if (typeof window !== "undefined") return true;
  try {
    const raw = filename.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
    const fullPath = path.join(process.cwd(), "public", "game-assets", "tilesets", raw);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

export function hasBundledTilesetsOnDisk(): boolean {
  if (typeof window !== "undefined") return true;
  try {
    const dir = path.join(process.cwd(), "public", "game-assets", "tilesets");
    if (!fs.existsSync(dir)) return false;
    const list = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".png"));
    return list.length > 0;
  } catch {
    return false;
  }
}

export function getAvailableStudioTilesets(): StudioTilesetMeta[] {
  if (!hasBundledTilesetsOnDisk()) return [];
  const matched = DEFAULT_STUDIO_TILESETS.filter(ts => checkTilesetExistsOnDisk(ts.imageSource));
  return matched.length > 0 ? matched : DEFAULT_STUDIO_TILESETS;
}

/**
 * Solid grass on Terrain_by_George (localId 16 → GID 17).
 * GID 1 is a stair fragment — filling with it produces green wedges on black.
 */
export const DEFAULT_STUDIO_GROUND_GID = 17;

/** Old bootstrap fill — stair fragment tiles. */
export const LEGACY_BAD_GROUND_GIDS = new Set([1]);

/** Below this non-zero density, treat visual layers as an empty sandbox. */
export const STUDIO_GROUND_FILL_DENSITY = 0.05;

export function countVisualGids(
  layers: Array<{ grid?: number[][] }> | null | undefined
): { total: number; nonzero: number } {
  let total = 0;
  let nonzero = 0;
  if (!Array.isArray(layers)) return { total: 0, nonzero: 0 };
  for (const layer of layers) {
    const grid = layer?.grid;
    if (!Array.isArray(grid)) continue;
    for (const row of grid) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        total += 1;
        if (cell) nonzero += 1;
      }
    }
  }
  return { total, nonzero };
}

export function isVisualTileLayersBlank(
  layers: Array<{ grid?: number[][] }> | null | undefined
): boolean {
  if (!Array.isArray(layers) || layers.length === 0) return true;
  const { total, nonzero } = countVisualGids(layers);
  if (total === 0) return true;
  if (nonzero / total < STUDIO_GROUND_FILL_DENSITY) return true;
  return isLegacyBadGroundFill(layers);
}

export function isLegacyBadGroundFill(
  layers: Array<{ grid?: number[][] }> | null | undefined
): boolean {
  if (!Array.isArray(layers) || layers.length === 0) return false;
  let total = 0;
  let bad = 0;
  for (const layer of layers) {
    const grid = layer?.grid;
    if (!Array.isArray(grid)) continue;
    for (const row of grid) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        total += 1;
        if (LEGACY_BAD_GROUND_GIDS.has(cell)) bad += 1;
      }
    }
  }
  return total > 0 && bad / total >= 0.9;
}

export function fillZeroGidsInLayers<T extends { name: string; grid: number[][] }>(
  layers: T[],
  fillGid: number = DEFAULT_STUDIO_GROUND_GID
): T[] {
  return layers.map((layer) => ({
    ...layer,
    grid: (layer.grid || []).map((row) =>
      (row || []).map((cell) => (cell ? cell : fillGid))
    ),
  }));
}

export function upgradeLegacyGroundGids<T extends { name: string; grid: number[][] }>(
  layers: T[],
  fillGid: number = DEFAULT_STUDIO_GROUND_GID
): T[] {
  return layers.map((layer) => ({
    ...layer,
    grid: (layer.grid || []).map((row) =>
      (row || []).map((cell) => (LEGACY_BAD_GROUND_GIDS.has(cell) ? fillGid : cell))
    ),
  }));
}

/** Ground visual layer filled with default terrain so Studio isn't a black void. */
export function buildDefaultGroundLayer(grid: number[][]): { name: string; grid: number[][] } {
  const h = grid.length || DEMO_MAP_H;
  const w = grid[0]?.length || DEMO_MAP_W;
  return {
    name: "Ground",
    grid: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => DEFAULT_STUDIO_GROUND_GID)
    ),
  };
}

/** @deprecated Prefer buildDefaultGroundLayer — all-zero Ground renders black in Babylon. */
export function buildEmptyGroundLayer(grid: number[][]): { name: string; grid: number[][] } {
  return buildDefaultGroundLayer(grid);
}

/** True when Studio cannot show/paint visuals (missing tilesets and/or blank layers). */
export function needsStudioTilesetBootstrap(
  tileLayersData: string | null | undefined,
  tilesetsData: string | null | undefined
): boolean {
  if (!hasBundledTilesetsOnDisk()) {
    return false;
  }
  let layers: Array<{ name?: string; grid?: number[][] }> = [];
  let tilesets: unknown[] = [];
  try {
    layers = JSON.parse(tileLayersData || "[]");
  } catch {
    layers = [];
  }
  try {
    tilesets = JSON.parse(tilesetsData || "[]");
  } catch {
    tilesets = [];
  }
  if (!Array.isArray(tilesets) || tilesets.length === 0) return true;
  if (!Array.isArray(layers) || layers.length === 0) return true;
  // Nearly-empty Ground (PR #20 all-zero, or a few brush tests) still looks black.
  return isVisualTileLayersBlank(layers);
}

/** Logic tile definitions (same as scripts/seed-tiles + bramble). */
export const DEMO_LOGIC_TILES = [
  { id: 0, name: "Walkable", color: "bg-emerald-900", isSolid: false, interactable: false, onInteractAction: null as string | null, onInteractPayload: null as string | null, onStepAction: null as string | null, onStepPayload: null as string | null },
  { id: 1, name: "Solid Wall", color: "bg-red-600", isSolid: true, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 2, name: "Tall Grass", color: "bg-green-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "ENCOUNTER", onStepPayload: '{"chance":0.5}' },
  { id: 3, name: "Gate A", color: "bg-amber-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 4, name: "Gate B", color: "bg-amber-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 5, name: "Wood Tree", color: "bg-amber-800", isSolid: true, interactable: true, onInteractAction: "HARVEST_WOOD", onInteractPayload: '{"xp":25,"resource":"wood"}', onStepAction: null, onStepPayload: null },
  { id: 6, name: "Ore Rock", color: "bg-[#8d6e63]", isSolid: true, interactable: true, onInteractAction: "HARVEST_ORE", onInteractPayload: '{"xp":25,"resource":"ore"}', onStepAction: null, onStepPayload: null },
  { id: 7, name: "Shop Tile", color: "bg-yellow-400", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_SHOP", onStepPayload: null },
  { id: 8, name: "Clinic Tile", color: "bg-pink-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "CLINIC_HEAL", onStepPayload: null },
  { id: 9, name: "Crafting Table", color: "bg-gray-500", isSolid: true, interactable: true, onInteractAction: "OPEN_CRAFTING", onInteractPayload: null, onStepAction: null, onStepPayload: null },
  { id: 10, name: "Fishing", color: "bg-sky-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "FISHING", onStepPayload: null },
  { id: 11, name: "Bramble Wall", color: "bg-lime-800", isSolid: true, interactable: true, onInteractAction: "CLEAR_BRAMBLE", onInteractPayload: '{"requiresTool":"axe_bronze"}', onStepAction: null, onStepPayload: null },
  { id: 12, name: "Base Hub", color: "bg-indigo-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "OPEN_BASE", onStepPayload: null },
  { id: 13, name: "Monster Spawner", color: "bg-rose-700", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "MONSTER_SPAWN_ZONE", onStepPayload: '{"monsterPool":"rockitten","maxPopulation":3,"level":1}' },
  { id: 14, name: "North Gate", color: "bg-sky-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_NORTH_GATE", onStepPayload: '{"spawnX":-1,"spawnY":-1}' },
  { id: 15, name: "East Gate", color: "bg-cyan-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_EAST_GATE", onStepPayload: '{"spawnX":0,"spawnY":-1}' },
  { id: 16, name: "South Gate", color: "bg-blue-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_SOUTH_GATE", onStepPayload: '{"spawnX":-1,"spawnY":0}' },
  { id: 17, name: "West Gate", color: "bg-indigo-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_WEST_GATE", onStepPayload: '{"spawnX":-1,"spawnY":-1}' },
  { id: 18, name: "Dungeon Entrance", color: "bg-purple-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_DUNGEON_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"DUNGEON"}' },
  { id: 19, name: "Raid Gate", color: "bg-amber-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_RAID_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":10,"spawnY":10,"category":"RAID"}' },
  { id: 20, name: "Event Gate", color: "bg-fuchsia-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_EVENT_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"EVENT"}' },
  { id: 21, name: "Mine Shaft Gate", color: "bg-orange-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_MINE_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"MINE"}' },
  { id: 22, name: "Deep Forest Gate", color: "bg-emerald-700", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_FOREST_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"DEEP_FOREST"}' },
  { id: 23, name: "Realm Portal", color: "bg-teal-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_PORTAL_GATE", onStepPayload: '{"targetMapId":"DEMO_SANDBOX","spawnX":6,"spawnY":2,"category":"PORTAL"}' },
];

export function buildDemoSandboxGrid(): number[][] {
  const w = DEMO_MAP_W;
  const h = DEMO_MAP_H;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0; // walkable ground everywhere by default

      // Outer border wall
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tile = 1;
      }
      // Shop + craft west of spawn
      else if (x === 11 && y === 14) tile = 7;
      else if (x === 11 && y === 15) tile = 9;
      // Early tall grass near plaza (TB smoke before Q4 north unlock)
      else if (x >= 16 && x <= 18 && y >= 12 && y <= 14) tile = 2;
      // Tall grass north (encounters) — behind bramble line
      else if (x >= 10 && x <= 20 && y >= 2 && y <= 8) tile = 2;
      // Bramble barrier blocking north grass from plaza (clear in Q4)
      else if (y === 10 && x >= 12 && x <= 16) tile = 11;
      // Gathering SE
      else if (x >= 20 && y >= 18 && x <= 27 && y <= 27) {
        tile = (x + y) % 2 === 0 ? 5 : 6;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

export function buildLobbyGrid(w: number = 64, h: number = 64): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0; // Walkable by default

      // Outer border wall
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tile = 1;
      }
      // Simple spawn plaza outline (spawn is at 32, 32)
      else if ((x === 26 || x === 38) && y >= 26 && y <= 38) {
        tile = 1; // Left/Right walls
        // Make openings for exits
        if (y >= 30 && y <= 34) tile = 0;
      }
      else if ((y === 26 || y === 38) && x >= 26 && x <= 38) {
        tile = 1; // Top/Bottom walls
        // Make openings for exits
        if (x >= 30 && x <= 34) tile = 0;
      }
      // Add some tall grass patches in the corners of the map
      else if (x >= 4 && x <= 14 && y >= 4 && y <= 14) tile = 2; // Top-left
      else if (x >= 50 && x <= 60 && y >= 4 && y <= 14) tile = 2; // Top-right
      else if (x >= 4 && x <= 14 && y >= 50 && y <= 60) tile = 2; // Bottom-left
      else if (x >= 50 && x <= 60 && y >= 50 && y <= 60) tile = 2; // Bottom-right
      // Add a couple of trees (logic 5) and ores (logic 6) nearby the plaza exits
      else if ((x === 32 || x === 33) && (y === 22 || y === 23)) tile = 5;
      else if ((x === 32 || x === 33) && (y === 42 || y === 43)) tile = 6;
      else if ((y === 32 || y === 33) && (x === 22 || x === 23)) tile = 5;
      else if ((y === 32 || y === 33) && (x === 42 || x === 43)) tile = 6;

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

export const DEMO_MAP_NPCS = [
  {
    id: "npc_guide_1",
    name: "Guide",
    x: 18,
    y: 16,
    sprite: "adventurer",
    direction: "down",
    dialogue: [
      "Start with the Trail Greeter in the plaza — accept Saints Trail. Vance's toolbelt comes after you spar the Tutor.",
    ],
  },
];

/** Vance stands on the clear path north of spawn plaza. */
export const DEMO_VANCE_SPAWN = { x: 14, y: 12 };

export const DEMO_WILD_SPOTS = [
  { x: 17, y: 16 },
  { x: 22, y: 16 },
  { x: 12, y: 18 },
];

export const DEMO_ENCOUNTERS = [
  { speciesSlug: "rockitten", weight: 1, minLevel: 3, maxLevel: 5 },
];

export function buildTrainingGroundsGrid(): number[][] {
  const w = 20;
  const h = 20;
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tile = 1;
      else if (x >= 5 && x <= 15 && y >= 5 && y <= 15) tile = 2; // Central arena tall grass
      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

export function buildCrystalCavernsGrid(): number[][] {
  const w = 25;
  const h = 25;
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 1; // Default solid rock cave wall
      if (x >= 2 && x <= 22 && y >= 2 && y <= 22) tile = 0; // Main cavern floor
      if (x >= 8 && x <= 16 && y >= 8 && y <= 16) tile = 6; // Dense ore vein
      if (x === 12 && y === 5) tile = 11; // Bramble-blocked deep passage
      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/** SAINTS_HAVEN — Central 40x40 Town & Portal Gateway */
export function buildSaintsHavenGrid(): number[][] {
  const w = 40;
  const h = 40;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0; // Walkable ground

      // Border walls
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tile = 1;
      }
      // Cardinal Gate Openings
      else if (y === 1 && (x >= 19 && x <= 21)) tile = 14; // North Gate
      else if (x === w - 2 && (y >= 19 && y <= 21)) tile = 15; // East Gate
      else if (y === h - 2 && (x >= 19 && x <= 21)) tile = 16; // South Gate
      else if (x === 1 && (y >= 19 && y <= 21)) tile = 18; // West Dungeon Gate
      // Central Portal to Lobby
      else if (x === 20 && y === 15) tile = 23; // Realm Portal
      // Plaza Facilities
      else if (x === 16 && y === 18) tile = 7; // General Store
      else if (x === 16 && y === 22) tile = 8; // Clinic / Infirmary
      else if (x === 24 && y === 18) tile = 9; // Forge / Crafting
      else if (x === 24 && y === 22) tile = 12; // Base Hub
      // Park trees and pond
      else if (x >= 6 && x <= 10 && y >= 6 && y <= 10) {
        tile = (x + y) % 2 === 0 ? 5 : 0;
      }
      else if (x >= 30 && x <= 34 && y >= 30 && y <= 34) {
        tile = (x + y) % 2 === 0 ? 6 : 0;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/** WILD_MEADOWS — 36x36 Wildlife & Gathering Zone */
export function buildWildMeadowsGrid(): number[][] {
  const w = 36;
  const h = 36;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 0;

      // Outer border
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        tile = 1;
      }
      // South return gate to Saints Haven
      else if (y === h - 2 && (x >= 17 && x <= 19)) {
        tile = 16;
      }
      // Quadrant 1: Tall Grass NW (Bio/Solar wildlings)
      else if (x >= 4 && x <= 14 && y >= 4 && y <= 14) {
        tile = 2;
      }
      // Quadrant 2: Tall Grass NE (Volt/Cryo wildlings)
      else if (x >= 22 && x <= 32 && y >= 4 && y <= 14) {
        tile = 2;
      }
      // Quadrant 3: Woodcutting Grove SW
      else if (x >= 4 && x <= 14 && y >= 22 && y <= 30) {
        tile = (x * y) % 3 === 0 ? 5 : 0;
      }
      // Quadrant 4: Fishing Stream & Brambles SE
      else if (x >= 22 && x <= 30 && y >= 22 && y <= 30) {
        tile = (x + y) % 4 === 0 ? 10 : (x + y) % 5 === 0 ? 11 : 0;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/** QUARRY_MINE — 32x32 Industrial Mining & Monster Spawner Zone */
export function buildQuarryMineGrid(): number[][] {
  const w = 32;
  const h = 32;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 1; // Default solid canyon wall

      // Carved mining chambers
      if ((x >= 2 && x <= 30 && y >= 14 && y <= 18) || (y >= 2 && y <= 30 && x >= 14 && x <= 18)) {
        tile = 0; // Central crossroads
      } else if (x >= 4 && x <= 12 && y >= 4 && y <= 12) {
        tile = (x + y) % 2 === 0 ? 6 : 0; // Ore deposit chamber NW
      } else if (x >= 20 && x <= 28 && y >= 4 && y <= 12) {
        tile = (x * y) % 3 === 0 ? 13 : 0; // Monster Spawner zone NE
      } else if (x >= 20 && x <= 28 && y >= 20 && y <= 28) {
        tile = (x + y) % 2 === 0 ? 6 : 9; // Forge & deep ore SE
      }

      // West Gate return to Saints Haven
      if (x === 1 && (y >= 15 && y <= 17)) {
        tile = 17;
      }
      // Mine shaft passage to deep caves
      if (x === 30 && (y >= 15 && y <= 17)) {
        tile = 21;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/** TRAINING_ARENA — 30x30 Hero Battles & Dueling Colosseum */
export function buildTrainingArenaGrid(): number[][] {
  const w = 30;
  const h = 30;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 1;

      // Colosseum inner circle
      const dx = x - 15;
      const dy = y - 15;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 12) {
        tile = 0; // Arena sand
      }
      if (dist <= 4) {
        tile = 13; // Center duel / boss spawner ring
      }

      // North Gate return to Saints Haven
      if (y === 1 && (x >= 14 && x <= 16)) {
        tile = 14;
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

/** DUNGEON_CRYPTS — 32x32 Shadow Crypts & Boss Chamber */
export function buildDungeonCryptsGrid(): number[][] {
  const w = 32;
  const h = 32;
  const grid: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      let tile = 1; // Solid stone wall

      // Main crypt chambers
      if (x >= 12 && x <= 20 && y >= 20 && y <= 28) tile = 0; // Entry hall
      else if (x >= 8 && x <= 24 && y >= 6 && y <= 18) tile = 0; // Grand Boss Hall
      else if (x >= 14 && x <= 18 && y >= 18 && y <= 20) tile = 0; // Connecting corridor

      // Boss spawner center
      if (x === 16 && y === 12) tile = 13;

      // Exit Gate south to Saints Haven
      if (y === 29 && (x >= 15 && x <= 17)) tile = 16;

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}
