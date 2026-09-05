/**
 * Client-side Studio tileset bootstrap — mirrors server DEFAULT_STUDIO_TILESETS.
 * Used when a loaded WorldMap has empty/blank tileLayers (legacy DEMO_SANDBOX).
 *
 * Important: Babylon's rich tileset path skips GID 0. An all-zero Ground +
 * tilesets present draws a black void (clearColor). Always seed a visible GID.
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
  { firstgid: 1, imageSource: "terrain-overworld.png", columns: 8, tilewidth: 128, tileheight: 128, imagewidth: 1024, imageheight: 1024 },
];

/**
 * Solid grass on Terrain_by_George (localId 16 → GID 17).
 * Do NOT use GID 1 — that is a stair fragment and renders as green wedges on black.
 */
export const DEFAULT_STUDIO_GROUND_GID = 17;

/** Legacy bootstrap fill set — kept empty so painted GID 1 is never overwritten. */
export const LEGACY_BAD_GROUND_GIDS = new Set<number>();

/** Fraction of non-zero cells below which a layer is treated as an empty sandbox. */
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
  // Nearly-empty sandboxes (e.g. 3 painted tiles on 30×30) still look black.
  if (nonzero / total < STUDIO_GROUND_FILL_DENSITY) return true;
  return isLegacyBadGroundFill(layers);
}

/** True when ≥90% of cells are the old stair-fragment GID 1 fill. */
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

/** Fill GID-0 cells with default terrain; preserve any painted non-zero GIDs. */
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

/** Replace legacy stair GID fills with solid grass; keep other painted GIDs. */
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

export function buildDefaultGroundLayer(
  grid: number[][] | undefined,
  fillGid: number = DEFAULT_STUDIO_GROUND_GID
): {
  name: string;
  grid: number[][];
} {
  const h = grid?.length || 24;
  const w = grid?.[0]?.length || 24;
  return {
    name: "Ground",
    grid: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => fillGid)
    ),
  };
}

/** @deprecated Prefer buildDefaultGroundLayer. */
export function buildEmptyGroundLayer(grid: number[][] | undefined): {
  name: string;
  grid: number[][];
} {
  return buildDefaultGroundLayer(grid);
}

export const TILESET_GID_STRIDE = 100000;

export function normalizeTilesetGids<
  T extends {
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    tilesets?: StudioTilesetMeta[];
  }
>(map: T): T {
  if (!Array.isArray(map.tilesets) || map.tilesets.length === 0) {
    return map;
  }

  let isAlreadyClean = true;
  for (let i = 0; i < map.tilesets.length; i++) {
    const expectedFirstGid = i * TILESET_GID_STRIDE + 1;
    if (map.tilesets[i].firstgid !== expectedFirstGid) {
      isAlreadyClean = false;
      break;
    }
  }

  if (isAlreadyClean) {
    return map;
  }

  const oldTilesets = map.tilesets;
  const oldSorted = [...oldTilesets].sort((a, b) => b.firstgid - a.firstgid);

  const newTilesets = oldTilesets.map((ts, idx) => ({
    ...ts,
    firstgid: idx * TILESET_GID_STRIDE + 1,
  }));

  let newTileLayers = map.tileLayers;
  if (Array.isArray(map.tileLayers) && map.tileLayers.length > 0) {
    newTileLayers = map.tileLayers.map((layer) => {
      if (!Array.isArray(layer.grid)) return layer;
      const remappedGrid = layer.grid.map((row) => {
        if (!Array.isArray(row)) return row;
        return row.map((rawGid) => {
          if (!rawGid || rawGid === 0) return 0;
          const cleanGid = (rawGid & 0x1fffffff);
          const flipMask = rawGid & ~0x1fffffff;

          const oldTs = oldSorted.find((t) => cleanGid >= t.firstgid);
          if (!oldTs) return rawGid;
          const oldIdx = oldTilesets.indexOf(oldTs);
          if (oldIdx === -1) return rawGid;

          const localId = cleanGid - oldTs.firstgid;
          const newGid = (oldIdx * TILESET_GID_STRIDE + 1) + localId;
          return (newGid | flipMask);
        });
      });
      return {
        ...layer,
        grid: remappedGrid,
      };
    });
  }

  return {
    ...map,
    tilesets: newTilesets,
    tileLayers: newTileLayers,
  };
}

export function ensureMapHasStudioTilesets<
  T extends {
    grid?: number[][];
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    tilesets?: StudioTilesetMeta[];
  },
>(map: T): T {
  const needsTilesets =
    DEFAULT_STUDIO_TILESETS.length > 0 &&
    (!Array.isArray(map.tilesets) || map.tilesets.length === 0);
  const missingLayers = !Array.isArray(map.tileLayers) || map.tileLayers.length === 0;
  const legacyBadFill = Array.isArray(map.tileLayers) && isLegacyBadGroundFill(map.tileLayers);
  const needsFillZeros =
    DEFAULT_STUDIO_GROUND_GID > 0 &&
    Array.isArray(map.tileLayers) &&
    map.tileLayers.length > 0 &&
    isVisualTileLayersBlank(map.tileLayers);

  if (!needsTilesets && !missingLayers && !legacyBadFill && !needsFillZeros) {
    if (!Array.isArray(map.tilesets)) {
      return { ...map, tilesets: [] };
    }
    return normalizeTilesetGids(map);
  }

  let seraphtLayers = map.tileLayers;
  if (missingLayers) {
    seraphtLayers = [buildDefaultGroundLayer(map.grid)];
  } else if (legacyBadFill) {
    seraphtLayers = upgradeLegacyGroundGids(seraphtLayers!);
  } else if (needsFillZeros) {
    seraphtLayers = fillZeroGidsInLayers(seraphtLayers!);
  }

  const rawEnsured = {
    ...map,
    tileLayers: seraphtLayers,
    tilesets: needsTilesets ? [...DEFAULT_STUDIO_TILESETS] : (map.tilesets || []),
  };
  return normalizeTilesetGids(rawEnsured);
}
