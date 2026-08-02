import { Point } from '../store';
import { ElementType } from './saints-dex';

export interface MapGate {
  targetMapId: string;
  spawnPoint: Point;
  requiredElement?: ElementType;
  errorMessage?: string;
}

export interface MapChunkData {
  chunkX: number;
  chunkY: number;
  width: number;
  height: number;
  grid?: number[][];
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  npcs?: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    sprite: string;
    dialogueKey: string;
  }>;
}

export interface GameMapData {
  id: string;
  name: string;
  grid: number[][]; // 0: safe, 1: wall/boundary, 2: tall grass, 3-4: gates, 5: tree(woodcutting), 6: ore(mining), 7: shop, 8: clinic, 10: fishing spot
  gates: Record<number, MapGate>;
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  tilesets?: Array<{ firstgid: number; imageSource: string; columns: number; tilewidth: number; tileheight: number }>;
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
  chunks?: MapChunkData[];
}

const mapCache: Record<string, GameMapData> = {};

/**
 * Asynchronously load map from database API with local caching
 */
function isValidMapId(mapId: unknown): mapId is string {
  if (typeof mapId !== 'string' || !mapId) return false;
  // Proxy / React internals sometimes hit GAME_MAPS['$$typeof'] etc.
  if (mapId.startsWith('$$') || mapId === 'then' || mapId === 'toJSON' || mapId === 'constructor') {
    return false;
  }
  return true;
}

export async function loadMap(mapId: string): Promise<GameMapData> {
  if (!isValidMapId(mapId)) {
    const fallback: GameMapData = {
      id: 'INVALID',
      name: 'INVALID',
      grid: Array(20).fill(0).map(() => Array(20).fill(0)),
      gates: {},
      npcs: [],
      encounterPool: [],
    };
    return fallback;
  }

  if (mapCache[mapId]) {
    return mapCache[mapId];
  }

  try {
    const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to load map ${mapId}`);
    }
    const mapData: GameMapData = await res.json();
    mapCache[mapId] = mapData;
    return mapData;
  } catch (err) {
    console.error(`Error loading map ${mapId}:`, err);
    // Return fallback empty map if fetch fails
    const fallback: GameMapData = {
      id: mapId,
      name: mapId,
      grid: Array(20).fill(0).map(() => Array(20).fill(0)),
      gates: {},
      npcs: [],
      encounterPool: [],
    };
    mapCache[mapId] = fallback;
    return fallback;
  }
}

export function getCachedMap(mapId: string): GameMapData | null {
  return mapCache[mapId] || null;
}

/** Mutate a cached map tile (e.g. CLEAR_BRAMBLE). Returns false if map/coords missing. */
export function patchCachedMapTile(
  mapId: string,
  x: number,
  y: number,
  tileId: number
): boolean {
  const map = mapCache[mapId];
  if (!map?.grid?.[y] || map.grid[y][x] === undefined) return false;
  map.grid[y][x] = tileId;
  return true;
}

export function invalidateMapCache(mapId?: string) {
  if (!mapId) {
    for (const key of Object.keys(mapCache)) delete mapCache[key];
    return;
  }
  delete mapCache[mapId];
}

export interface MapIndexEntry {
  id: string;
  name: string;
  gameId: string | null;
  version: number;
  updatedAt?: string;
}

/** List WorldMap index rows from the DB (no grid payload). */
export async function listMaps(gameId?: string): Promise<MapIndexEntry[]> {
  const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`/api/maps${qs}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to list maps`);
  }
  const data = (await res.json()) as { maps?: MapIndexEntry[] };
  return data.maps || [];
}

export async function preloadAdjacentMaps(currentMapId: string): Promise<void> {
  const current = mapCache[currentMapId];
  if (!current?.gates) return;
  for (const gate of Object.values(current.gates)) {
    if (gate.targetMapId && !mapCache[gate.targetMapId]) {
      loadMap(gate.targetMapId).catch(() => {});
    }
  }
}

/**
 * Proxy object for backwards compatibility with synchronous GAME_MAPS[id] lookups
 */
export const GAME_MAPS = new Proxy(mapCache, {
  get(target, prop: string | symbol) {
    if (typeof prop !== 'string' || !isValidMapId(prop)) {
      return Reflect.get(target, prop);
    }
    if (prop in target) {
      return target[prop];
    }
    // Return default empty map on synchronous access miss while triggering async load
    loadMap(prop).catch(() => {});
    return {
      id: prop,
      name: prop,
      grid: Array(20).fill(0).map(() => Array(20).fill(0)),
      gates: {},
      npcs: [],
      encounterPool: [],
    };
  },
});
