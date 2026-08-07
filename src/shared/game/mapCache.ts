import type { MapData, LogicTile } from "./types/map";

// In-memory map cache: mapId -> MapData
const mapCache = new Map<string, MapData>();

// Logic tiles cache: tileId -> LogicTile
let logicTilesCache: Record<number, LogicTile> | null = null;

export function getCachedMap(mapId: string): MapData | null {
  return mapCache.get(mapId) || null;
}

export function setCachedMap(mapId: string, data: MapData): void {
  mapCache.set(mapId, data);
}

export function invalidateMapCache(mapId?: string): void {
  if (!mapId) {
    mapCache.clear();
  } else {
    mapCache.delete(mapId);
  }
}

export function getCachedLogicTiles(): Record<number, LogicTile> | null {
  return logicTilesCache;
}

export function setCachedLogicTiles(tiles: Record<number, LogicTile>): void {
  logicTilesCache = tiles;
}

export function invalidateLogicTilesCache(): void {
  logicTilesCache = null;
}

export function patchCachedMapTile(
  mapId: string,
  x: number,
  y: number,
  tileId: number
): boolean {
  const map = mapCache.get(mapId);
  if (!map || !map.grid || !map.grid[y] || map.grid[y][x] === undefined) {
    return false;
  }
  map.grid[y][x] = tileId;
  return true;
}
