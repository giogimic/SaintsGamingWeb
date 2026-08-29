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
 * Default standard tilesets for Studio visual paint.
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
  imagewidth?: number;
  imageheight?: number;
};

export const DEFAULT_STUDIO_TILESETS: StudioTilesetMeta[] = [
  { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
  { firstgid: 100001, imageSource: "Furniture_and_Fittings_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 200001, imageSource: "Interior_Walls_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 300001, imageSource: "Interior_Floors_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 400001, imageSource: "Vegetation_and_Outdoor_Fittings_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
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
  { id: 20, name: "Event Gate", color: "bg-fuchsia-600", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_EVENT_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"EVENT"}' },
  { id: 21, name: "Mine Shaft Gate", color: "bg-orange-800", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_MINE_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"MINE"}' },
  { id: 22, name: "Deep Forest Gate", color: "bg-emerald-700", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_FOREST_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"DEEP_FOREST"}' },
  { id: 23, name: "Realm Portal", color: "bg-teal-500", isSolid: false, interactable: false, onInteractAction: null, onInteractPayload: null, onStepAction: "WARP_PORTAL_GATE", onStepPayload: '{"targetMapId":"STARTING_MAP","spawnX":6,"spawnY":2,"category":"PORTAL"}' },
];
export const DEMO_MAP_NPCS: any[] = [];
export const DEMO_ENCOUNTERS: any[] = [];
