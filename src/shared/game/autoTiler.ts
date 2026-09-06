import type { AutoTileRuleset, MapData } from './types/map';

// Bit flags for 4-way connections (16 tiles)
export const TILE_DIR = {
  N: 1,
  E: 2,
  S: 4,
  W: 8,
};

// Bit flags for 8-way connections (47 tiles)
export const TILE_DIR_8 = {
  NW: 1,
  N: 2,
  NE: 4,
  W: 8,
  E: 16,
  SW: 32,
  S: 64,
  SE: 128,
};

/**
 * Checks if two tiles are considered "connected" for auto-tiling purposes.
 * For now, they connect if they share the same AutoTileRuleset baseGid.
 */
export function areTilesConnected(gidA: number, gidB: number, ruleset: AutoTileRuleset): boolean {
  // If either tile is missing, no connection.
  if (!gidA || !gidB) return false;
  
  // They are connected if both belong to this ruleset's maskToGid mappings.
  const allGids = Object.values(ruleset.maskToGid);
  return allGids.includes(gidB);
}

function getTileAt(map: MapData, layerIdx: number, r: number, c: number): number {
  if (r < 0 || r >= map.height || c < 0 || c >= map.width) return 0;
  if (!map.tileLayers || !map.tileLayers[layerIdx]) return 0;
  return map.tileLayers[layerIdx].grid[r]?.[c] || 0;
}

/**
 * Calculates the 4-way bitmask for a tile at a specific coordinate.
 */
export function calculate16TileMask(
  map: MapData,
  layerIdx: number,
  r: number,
  c: number,
  ruleset: AutoTileRuleset
): number {
  const currentGid = getTileAt(map, layerIdx, r, c);
  if (!currentGid) return 0;

  let mask = 0;
  
  const tileN = getTileAt(map, layerIdx, r - 1, c);
  const tileE = getTileAt(map, layerIdx, r, c + 1);
  const tileS = getTileAt(map, layerIdx, r + 1, c);
  const tileW = getTileAt(map, layerIdx, r, c - 1);

  if (areTilesConnected(currentGid, tileN, ruleset)) mask |= TILE_DIR.N;
  if (areTilesConnected(currentGid, tileE, ruleset)) mask |= TILE_DIR.E;
  if (areTilesConnected(currentGid, tileS, ruleset)) mask |= TILE_DIR.S;
  if (areTilesConnected(currentGid, tileW, ruleset)) mask |= TILE_DIR.W;

  return mask;
}

/**
 * Applies auto-tiling to a specific coordinate and its neighbors if it belongs to an auto-tile ruleset.
 * Returns an array of changes { r, c, gid }.
 */
export function applyAutoTiling(
  map: MapData,
  layerIdx: number,
  r: number,
  c: number
): { r: number; c: number; gid: number }[] {
  if (!map.tilesets) return [];
  
  // Find if the painted tile is part of any ruleset
  const currentGid = getTileAt(map, layerIdx, r, c);
  if (!currentGid) return [];

  let activeRuleset: AutoTileRuleset | undefined;
  for (const ts of map.tilesets) {
    if (!ts.autoTiles) continue;
    activeRuleset = ts.autoTiles.find(rt => Object.values(rt.maskToGid).includes(currentGid));
    if (activeRuleset) break;
  }

  if (!activeRuleset) return [];

  const changes: { r: number; c: number; gid: number }[] = [];

  // Recompute the target tile and its 4 neighbors
  const coordsToCheck = [
    { r, c },
    { r: r - 1, c },
    { r: r + 1, c },
    { r, c: c - 1 },
    { r, c: c + 1 }
  ];

  for (const coord of coordsToCheck) {
    if (coord.r < 0 || coord.r >= map.height || coord.c < 0 || coord.c >= map.width) continue;
    const tileGid = getTileAt(map, layerIdx, coord.r, coord.c);
    if (!tileGid || !areTilesConnected(currentGid, tileGid, activeRuleset)) continue;

    if (activeRuleset.type === '16-tile') {
      const mask = calculate16TileMask(map, layerIdx, coord.r, coord.c, activeRuleset);
      const newGid = activeRuleset.maskToGid[mask];
      if (newGid && newGid !== tileGid) {
        changes.push({ r: coord.r, c: coord.c, gid: newGid });
      }
    }
  }

  return changes;
}
