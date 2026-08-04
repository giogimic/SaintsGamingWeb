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
};

export const DEFAULT_STUDIO_TILESETS: StudioTilesetMeta[] = [
  { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
  { firstgid: 1000, imageSource: "Furniture_and_Fittings_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 2000, imageSource: "Interior_Walls_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 3000, imageSource: "Interior_Floors_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
  { firstgid: 4000, imageSource: "Vegetation_and_Outdoor_Fittings_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
];

/** Terrain_by_George firstgid — visible default fill for sandboxes. */
export const DEFAULT_STUDIO_GROUND_GID = 1;

export function isVisualTileLayersBlank(
  layers: Array<{ grid?: number[][] }> | null | undefined
): boolean {
  if (!Array.isArray(layers) || layers.length === 0) return true;
  return layers.every((layer) => {
    const grid = layer?.grid;
    if (!Array.isArray(grid) || grid.length === 0) return true;
    return grid.every((row) => !Array.isArray(row) || row.every((cell) => !cell));
  });
}

export function buildDefaultGroundLayer(grid: number[][] | undefined): {
  name: string;
  grid: number[][];
} {
  const h = grid?.length || 24;
  const w = grid?.[0]?.length || 24;
  return {
    name: "Ground",
    grid: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => DEFAULT_STUDIO_GROUND_GID)
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

/** Ensure in-memory map data can drive TilesetPicker + a visible ground mesh. */
export function ensureMapHasStudioTilesets<
  T extends {
    grid?: number[][];
    tileLayers?: Array<{ name: string; grid: number[][] }>;
    tilesets?: StudioTilesetMeta[];
  },
>(map: T): T {
  const needsTilesets = !Array.isArray(map.tilesets) || map.tilesets.length === 0;
  const needsLayers =
    !Array.isArray(map.tileLayers) ||
    map.tileLayers.length === 0 ||
    isVisualTileLayersBlank(map.tileLayers);

  if (!needsLayers && !needsTilesets) return map;

  return {
    ...map,
    tileLayers: needsLayers ? [buildDefaultGroundLayer(map.grid)] : map.tileLayers,
    tilesets: needsTilesets ? [...DEFAULT_STUDIO_TILESETS] : map.tilesets,
  };
}
