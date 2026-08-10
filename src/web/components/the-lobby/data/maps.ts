import { Point } from '../store';
import type { ElementType } from '@/shared/game/elementMatchups';
import { listGateTargets } from '@/shared/game/mapGates';
import { MAP_DOC_SOURCE_PROXY_SHELL } from '@/shared/game/mapDocVisual';

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
  /** Present on /api/maps payloads; used for Babylon dims when grid is sparse. */
  width?: number;
  height?: number;
  /** worldMap | gameMap | proxy-shell — shells must never stick over DB docs. */
  source?: string;
  version?: number;
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
/** Dedupe concurrent fetches for the same id (Studio remount storms). */
const mapInflight = new Map<string, Promise<GameMapData>>();
/** Brief cooldown after a failed fetch so we don't hammer /api/maps on 404 loops. */
const mapFailUntil = new Map<string, number>();
const MAP_FAIL_COOLDOWN_MS = 8_000;

function emptyMapFallback(mapId: string): GameMapData {
  return {
    id: mapId,
    name: mapId,
    source: MAP_DOC_SOURCE_PROXY_SHELL,
    width: 20,
    height: 20,
    grid: Array(20).fill(0).map(() => Array(20).fill(0)),
    gates: {},
    npcs: [],
    encounterPool: [],
    tileLayers: [],
    tilesets: [],
  };
}

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
    return emptyMapFallback('INVALID');
  }

  if (mapCache[mapId]) {
    return mapCache[mapId];
  }

  const failUntil = mapFailUntil.get(mapId);
  if (failUntil && Date.now() < failUntil) {
    return emptyMapFallback(mapId);
  }

  const existing = mapInflight.get(mapId);
  if (existing) return existing;

  const pending = (async (): Promise<GameMapData> => {
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load map ${mapId}`);
      }
      const mapData: GameMapData = await res.json();
      mapCache[mapId] = mapData;
      mapFailUntil.delete(mapId);
      return mapData;
    } catch (err) {
      console.error(`Error loading map ${mapId}:`, err);
      // Do NOT cache empty fallbacks long-term — only cool down retries.
      // A transient failure must not permanently poison DEMO with npcs:[].
      mapFailUntil.set(mapId, Date.now() + MAP_FAIL_COOLDOWN_MS);
      return emptyMapFallback(mapId);
    } finally {
      mapInflight.delete(mapId);
    }
  })();

  mapInflight.set(mapId, pending);
  return pending;
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
    mapFailUntil.clear();
    return;
  }
  delete mapCache[mapId];
  mapFailUntil.delete(mapId);
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
  for (const targetMapId of listGateTargets(current.gates)) {
    if (targetMapId && !mapCache[targetMapId]) {
      loadMap(targetMapId).catch(() => {});
    }
  }
}

const MAP_ID_RE = /^[A-Za-z][A-Za-z0-9_]*$/;

/**
 * Proxy object for backwards compatibility with synchronous GAME_MAPS[id] lookups
 */
export const GAME_MAPS = new Proxy(mapCache, {
  get(target, prop) {
    if (typeof prop !== "string") {
      return Reflect.get(target, prop as symbol);
    }
    if (prop in target) {
      return target[prop];
    }
    // Ignore React/internal keys (e.g. $$typeof) — do not fetch /api/maps/$$typeof
    if (!MAP_ID_RE.test(prop) || prop.startsWith("$$")) {
      return undefined;
    }
    // Return default empty map on synchronous access miss while triggering async load
    loadMap(prop).catch(() => {});
    return {
      id: prop,
      name: prop,
      source: MAP_DOC_SOURCE_PROXY_SHELL,
      width: 20,
      height: 20,
      grid: Array(20).fill(0).map(() => Array(20).fill(0)),
      gates: {},
      npcs: [],
      encounterPool: [],
      tileLayers: [],
      tilesets: [],
    };
  },
});
