import { loadMapData, loadLogicTiles } from "./mapLoader";
import { getCachedMap, getCachedLogicTiles } from "./mapCache";
import type { MapData } from "./types/map";

export async function isWalkable(mapId: string, x: number, y: number): Promise<boolean> {
  const map = await loadMapData(mapId);
  const logicTiles = await loadLogicTiles();

  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return false;
  }

  const tileId = map.grid[y]?.[x];
  if (tileId === undefined || tileId === null) {
    return false;
  }

  const logicTile = logicTiles[tileId];
  if (logicTile?.isSolid) {
    return false;
  }

  return true;
}

export function isWalkableSync(mapId: string, x: number, y: number): boolean {
  const map = getCachedMap(mapId);
  if (!map) return false;

  if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
    return false;
  }

  const tileId = map.grid[y]?.[x];
  if (tileId === undefined || tileId === null) {
    return false;
  }

  const logicTiles = getCachedLogicTiles();
  const logicTile = logicTiles?.[tileId];
  if (logicTile?.isSolid) {
    return false;
  }

  return true;
}

export function getMapDimensions(mapId: string): { width: number; height: number } {
  const map = getCachedMap(mapId);
  if (!map) return { width: 0, height: 0 };
  return { width: map.width, height: map.height };
}

export function getTile(mapId: string, x: number, y: number): number | null {
  const map = getCachedMap(mapId);
  if (!map || !map.grid?.[y]) return null;
  return map.grid[y][x] ?? null;
}

export function getSpawnPoints(mapId: string): Array<{ x: number; y: number }> {
  const map = getCachedMap(mapId);
  if (!map) return [];
  const result: Array<{ x: number; y: number }> = [];
  const logicTiles = getCachedLogicTiles();

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tileId = map.grid[y]?.[x];
      if (tileId !== undefined && tileId !== null) {
        const isSolid = logicTiles?.[tileId]?.isSolid;
        if (!isSolid) {
          result.push({ x, y });
        }
      }
    }
  }
  return result;
}
