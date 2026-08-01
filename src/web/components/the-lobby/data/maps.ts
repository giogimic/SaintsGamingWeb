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
export async function loadMap(mapId: string): Promise<GameMapData> {
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
  get(target, prop: string) {
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
