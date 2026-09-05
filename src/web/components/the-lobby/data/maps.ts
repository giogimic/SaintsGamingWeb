import { Point } from '../store';
import type { ElementType } from '../../../../shared/game/elementMatchups';
import { listGateTargets } from '../../../../shared/game/mapGates';
import { MAP_DOC_SOURCE_PROXY_SHELL } from '../../../../shared/game/mapDocVisual';
import {
  type AtlasNode,
  type AtlasGridData,
  normalizeAtlasGridData,
  getAdjacentAtlasNeighbors,
} from '../../../../shared/game/atlas/spatialAtlas';
import { RuntimeAssetManager } from '../../../../shared/game/assetRuntimeManager';
import { recordRecentItem } from '../../../../shared/game/creatorRecents';

function getStudioApiUrl(path: string): string {
  const base = typeof window !== 'undefined' ? (window as any).__studioBaseUrl || '' : '';
  if (!base) return path;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export interface MapGate {
  targetMapId: string;
  spawnPoint: Point;
  requiredElement?: ElementType;
  errorMessage?: string;
}

export interface MapConnection {
  targetMapId: string;
  targetEdge?: 'north' | 'south' | 'east' | 'west';
  offsetX: number;
  offsetZ: number;
}

export interface RenderedChunk {
  mapId: string;
  chunkX?: number; // Legacy
  chunkY?: number; // Legacy
  offsetX: number;
  offsetZ: number;
  width: number;
  height: number;
  grid?: number[][];
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
  voxelDoc?: any;
}

export interface GameMapData {
  id: string;
  gameId?: string;
  name: string;
  mapType?: 'TILE' | 'VOXEL' | 'HYBRID' | string;
  grid: number[][]; // 0: safe, 1: wall/boundary, 2: tall grass, 3-4: gates, 5: tree(woodcutting), 6: ore(mining), 7: shop, 8: clinic, 10: fishing spot
  gates: Record<number, MapGate>;
  /** Present on /api/maps payloads; used for Babylon dims when grid is sparse. */
  width?: number;
  height?: number;
  /** worldMap | gameMap | proxy-shell — shells must never stick over DB docs. */
  source?: string;
  version?: number;
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  freeformLayers?: any[];
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
    id: string;
    monsterId: string;
    weight: number;
    minLevel: number;
    maxLevel: number;
  }>;
  chunks?: RenderedChunk[];
  connections?: {
    north?: string | MapConnection;
    south?: string | MapConnection;
    east?: string | MapConnection;
    west?: string | MapConnection;
  };
  atlasNodeId?: string;
  nodeConnections?: {
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  };
  voxelDoc?: any;
  blockSizePx?: number;
}

export function getPlacementCacheKey(mapId: string, atlasNodeId?: string, depth: number = 0): string {
  if (depth > 0) return `${mapId}:neighbor`;
  return atlasNodeId ? `${mapId}@${atlasNodeId}` : mapId;
}

const mapCache: Record<string, GameMapData> = {};
/** Dedupe concurrent fetches for the same placement/id (Studio remount storms). */
const mapInflight = new Map<string, Promise<GameMapData>>();
/** Brief cooldown after a failed fetch so we don't hammer /api/maps on 404 loops. */
const mapFailUntil = new Map<string, number>();
const MAP_FAIL_COOLDOWN_MS = 8_000;

export let isStudioMode = false;
export function setStudioMode(val: boolean) {
  isStudioMode = val;
}

let cachedAtlas: AtlasGridData | null = null;

export function invalidateClientAtlas() {
  cachedAtlas = null;
}

export async function getClientAtlas(forceRefresh = false): Promise<AtlasGridData> {
  if (!forceRefresh && cachedAtlas) return cachedAtlas;
  try {
    const res = await fetch(getStudioApiUrl(`/api/world/atlas?t=${Date.now()}`));
    if (res.ok) {
      const data = await res.json();
      if (data?.atlas?.atlasData) {
        const raw = typeof data.atlas.atlasData === 'string' ? JSON.parse(data.atlas.atlasData) : data.atlas.atlasData;
        cachedAtlas = normalizeAtlasGridData(raw);
      }
    }
  } catch (e) {
    console.warn('[MapLoader] Failed to fetch client atlas:', e);
  }
  if (!cachedAtlas) cachedAtlas = { nodes: [] };
  return cachedAtlas;
}

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

export async function loadMap(
  mapId: string,
  depth: number = 0,
  atlasNodeId?: string,
  draft?: boolean
): Promise<GameMapData> {
  if (!isValidMapId(mapId)) {
    return emptyMapFallback('INVALID');
  }

  // Derive placement-aware cache key
  const cacheKey = getPlacementCacheKey(mapId, atlasNodeId, depth) + (draft ? '_draft' : '');

  // Use cached map directly if we are just fetching a neighbor (depth > 0)
  // or if it already has the assembled chunks (we assume it was fully loaded)
  if (mapCache[cacheKey]) {
    if (depth > 0 || (mapCache[cacheKey].chunks && mapCache[cacheKey].chunks!.length > 0)) {
      return mapCache[cacheKey];
    }
  }

  const failUntil = mapFailUntil.get(cacheKey) ?? mapFailUntil.get(mapId);
  if (failUntil && Date.now() < failUntil) {
    return emptyMapFallback(mapId);
  }

  const existing = mapInflight.get(cacheKey);
  if (existing) return existing;

  const pending = (async (): Promise<GameMapData> => {
    try {
      const isDraftReq = draft || isStudioMode;
      const qs = isDraftReq ? '?draft=true' : '';
      const res = await fetch(getStudioApiUrl(`/api/maps/${encodeURIComponent(mapId)}${qs}`));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load map ${mapId}`);
      }
      const rawMapData: GameMapData = await res.json();

      // Dynamic Map Type Classification Fallback
      if (!rawMapData.mapType) {
        const hasTiles = rawMapData.tileLayers && rawMapData.tileLayers.length > 0;
        const hasVoxel = rawMapData.voxelDoc && Object.keys(rawMapData.voxelDoc).length > 0;
        if (hasTiles && hasVoxel) rawMapData.mapType = 'HYBRID';
        else if (hasVoxel) rawMapData.mapType = 'VOXEL';
        else if (hasTiles) rawMapData.mapType = 'TILE';
        else rawMapData.mapType = 'HYBRID'; // Default legacy fallback
      }

      // Clone mapData so different placements with the same base map do not mutate the same object
      const mapData: GameMapData = JSON.parse(JSON.stringify(rawMapData));
      mapCache[cacheKey] = mapData;
      // Also cache base mapId if not set yet for direct fast lookups
      if (!mapCache[mapId]) {
        mapCache[mapId] = mapData;
      }
      mapFailUntil.delete(cacheKey);
      mapFailUntil.delete(mapId);

      // Phase 1: Seamless Terrain - Fetch immediate neighbors (Depth 1)
      if (depth === 0) {
        try {
          const atlas = await getClientAtlas();
          let myNode: AtlasNode | undefined;

          // 1. Direct node identity match (authoritative)
          if (atlasNodeId) {
            myNode = atlas.nodes.find((n) => n.id === atlasNodeId);
          }

          // 2. Active node in gameStore if set
          if (!myNode) {
            const { useGameStore } = await import('../store');
            const activeNodeId = (useGameStore.getState() as any).activeAtlasNodeId;
            if (activeNodeId) {
              myNode = atlas.nodes.find((n) => n.id === activeNodeId && n.mapId === mapData.id);
            }
          }

          // 3. Fallback: only bind if this map definition has exactly one unique placement
          if (!myNode) {
            const allMyNodes = atlas.nodes.filter((n) => n.mapId === mapData.id);
            if (allMyNodes.length === 1) {
              myNode = allMyNodes[0];
            } else if (allMyNodes.length > 1) {
              console.warn(`[MapLoader] Map ${mapData.id} has ${allMyNodes.length} placements in Atlas; specify atlasNodeId to bind specific placement.`);
            }
          }

          if (myNode) {
            mapData.atlasNodeId = myNode.id;
            const neighbors = getAdjacentAtlasNeighbors(atlas, myNode);

            mapData.connections = {
              north: neighbors.north?.mapId,
              south: neighbors.south?.mapId,
              east: neighbors.east?.mapId,
              west: neighbors.west?.mapId,
            };
            mapData.nodeConnections = {
              north: neighbors.north?.id,
              south: neighbors.south?.id,
              east: neighbors.east?.id,
              west: neighbors.west?.id,
            };
          }
        } catch (err) {
          console.warn("[MapLoader] Failed to resolve atlas connections, falling back to DB", err);
        }
      }

      if (depth === 0 && mapData.connections) {
        const neighborPromises: Promise<void>[] = [];
        
        // If the map is monolithic (no legacy chunks), we must add it as the first chunk 
        // so that adding neighbors doesn't cause BabylonEngine to skip rendering the main map.
        if (!mapData.chunks || mapData.chunks.length === 0) {
          mapData.chunks = [{
            mapId: mapData.id,
            offsetX: 0,
            offsetZ: 0,
            width: mapData.width || 24,
            height: mapData.height || 24,
            grid: mapData.grid,
            tileLayers: mapData.tileLayers,
            tilesets: mapData.tilesets,
            npcs: mapData.npcs,
          }];
        }
        const processConnection = (
          conn: string | MapConnection | undefined,
          targetNodeId: string | undefined,
          direction: 'north' | 'south' | 'east' | 'west'
        ) => {
          if (!conn) return;
          const targetMapId = typeof conn === 'string' ? conn : conn.targetMapId;
          
          neighborPromises.push(
            loadMap(targetMapId, 1, targetNodeId).then(neighborData => {
              if (neighborData.id === 'INVALID') return;

              let offsetX = 0;
              let offsetZ = 0;
              const mainW = mapData.width || 24;
              const mainH = mapData.height || 24;
              const nW = neighborData.width || 24;
              const nH = neighborData.height || 24;

              if (typeof conn === 'object' && conn.offsetX !== undefined && conn.offsetZ !== undefined) {
                offsetX = conn.offsetX;
                offsetZ = conn.offsetZ;
              } else {
                if (direction === 'north') {
                  offsetX = 0;
                  offsetZ = (mainH / 2 + nH / 2);
                } else if (direction === 'south') {
                  offsetX = 0;
                  offsetZ = -(mainH / 2 + nH / 2);
                } else if (direction === 'east') {
                  offsetX = (mainW / 2 + nW / 2);
                  offsetZ = 0;
                } else if (direction === 'west') {
                  offsetX = -(mainW / 2 + nW / 2);
                  offsetZ = 0;
                }
              }

              mapData.chunks!.push({
                mapId: neighborData.id,
                offsetX,
                offsetZ,
                width: nW,
                height: nH,
                grid: neighborData.grid,
                tileLayers: neighborData.tileLayers,
                tilesets: neighborData.tilesets,
                npcs: neighborData.npcs || [],
                voxelDoc: neighborData.voxelDoc,
              });
            }).catch(e => {
              console.warn(`[MapLoader] Failed to load neighbor ${targetMapId}:`, e);
            })
          );
        };

        processConnection(mapData.connections.north, mapData.nodeConnections?.north, 'north');
        processConnection(mapData.connections.south, mapData.nodeConnections?.south, 'south');
        processConnection(mapData.connections.east, mapData.nodeConnections?.east, 'east');
        processConnection(mapData.connections.west, mapData.nodeConnections?.west, 'west');

        await Promise.allSettled(neighborPromises);
      }

      // Pre-warm map presentation and tileset assets in RuntimeAssetManager
      registerMapRuntimeAssets(mapData);

      if (depth === 0 && mapData.id) {
        recordRecentItem({
          id: mapData.id,
          type: 'map',
          title: mapData.name || mapData.id,
          subtitle: `${mapData.width || 64}×${mapData.height || 64}`,
        });
      }

      return mapData;
    } catch (err) {
      console.error(`Error loading map ${mapId}:`, err);
      // Do NOT cache empty fallbacks long-term — only cool down retries.
      // A transient failure must not permanently poison DEMO with npcs:[].
      mapFailUntil.set(cacheKey, Date.now() + MAP_FAIL_COOLDOWN_MS);
      return emptyMapFallback(mapId);
    } finally {
      mapInflight.delete(cacheKey);
    }
  })();

  mapInflight.set(cacheKey, pending);
  return pending;
}

export function getCachedMap(mapId: string, atlasNodeId?: string): GameMapData | null {
  if (atlasNodeId) {
    const key = `${mapId}@${atlasNodeId}`;
    if (mapCache[key]) return mapCache[key];
  }
  return mapCache[mapId] || null;
}

/** Mutate a cached map tile (e.g. CLEAR_BRAMBLE). Returns false if map/coords missing. */
export function patchCachedMapTile(
  mapId: string,
  x: number,
  y: number,
  tileId: number,
  atlasNodeId?: string
): boolean {
  const map = getCachedMap(mapId, atlasNodeId);
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
  // Delete exact mapId, neighbor entries, and all placement composite keys (mapId@nodeId)
  const prefix = `${mapId}@`;
  const neighborKey = `${mapId}:neighbor`;
  for (const key of Object.keys(mapCache)) {
    if (key === mapId || key === neighborKey || key.startsWith(prefix)) {
      delete mapCache[key];
    }
  }
  for (const key of Object.keys(mapFailUntil)) {
    if (key === mapId || key === neighborKey || key.startsWith(prefix)) {
      mapFailUntil.delete(key);
    }
  }
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
  const res = await fetch(getStudioApiUrl(`/api/maps${qs}`));
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Failed to list maps`);
  }
  const data = (await res.json()) as { maps?: MapIndexEntry[] };
  return data.maps || [];
}

export async function preloadAdjacentMaps(currentMapId: string): Promise<void> {
  const current = mapCache[currentMapId];
  if (!current) return;
  
  if (current.gates) {
    for (const targetMapId of listGateTargets(current.gates)) {
      if (targetMapId && !mapCache[targetMapId]) {
        loadMap(targetMapId).catch(() => {});
      }
    }
  }

  if (current.connections) {
    const { north, south, east, west } = current.connections;
    for (const conn of [north, south, east, west]) {
      const targetMapId = typeof conn === 'string' ? conn : conn?.targetMapId;
      if (targetMapId && !mapCache[targetMapId]) {
        loadMap(targetMapId).catch(() => {});
      }
    }
  }
}

/**
 * Register map presentation, tileset textures, and containers into RuntimeAssetManager
 */
export function registerMapRuntimeAssets(mapData: GameMapData): void {
  try {
    if (typeof window === 'undefined') return;
    const manager = RuntimeAssetManager.getInstance();
    const assetIds: string[] = [];

    if (mapData.tilesets && mapData.tilesets.length > 0) {
      mapData.tilesets.forEach((ts, idx) => {
        if (ts.imageSource) {
          const id = `tileset_${mapData.id}_${idx}`;
          const source =
            ts.imageSource.startsWith('/') || ts.imageSource.startsWith('http')
              ? ts.imageSource
              : `/game-assets/tilesets/${ts.imageSource}`;

          manager.registerAsset({
            id,
            name: `Tileset ${ts.imageSource}`,
            type: 'TILESET',
            sourceUrl: source,
            preloadPriority: 'HIGH',
            preloadGroup: 'Core',
          });
          assetIds.push(id);
        }
      });
    }

    const containerId = `Map_${mapData.id}`;
    manager.createContainer({
      id: containerId,
      name: `Map Container ${mapData.id}`,
      type: 'map',
      primaryAssetId: assetIds[0] || `map_${mapData.id}_root`,
      extraAssetIds: assetIds.slice(1),
    });

    void manager.warmContainer(containerId).catch(() => {});
  } catch (e) {
    // Non-blocking runtime warmup
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
