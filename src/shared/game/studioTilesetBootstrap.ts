/**
 * Client-side Studio tileset bootstrap — mirrors server DEFAULT_STUDIO_TILESETS.
 * Used when a loaded WorldMap has empty tileLayers/tilesets (legacy DEMO_SANDBOX).
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

export function buildEmptyGroundLayer(grid: number[][] | undefined): {
  name: string;
  grid: number[][];
} {
  const h = grid?.length || 24;
  const w = grid?.[0]?.length || 24;
  return {
    name: "Ground",
    grid: Array.from({ length: h }, () => Array.from({ length: w }, () => 0)),
  };
}

/** Ensure in-memory map data can drive TilesetPicker + paint overlays. */
export function ensureMapHasStudioTilesets<T extends {
  grid?: number[][];
  tileLayers?: Array<{ name: string; grid: number[][] }>;
  tilesets?: StudioTilesetMeta[];
}>(map: T): T {
  const needsLayers = !Array.isArray(map.tileLayers) || map.tileLayers.length === 0;
  const needsTilesets = !Array.isArray(map.tilesets) || map.tilesets.length === 0;
  if (!needsLayers && !needsTilesets) return map;
  return {
    ...map,
    tileLayers: needsLayers ? [buildEmptyGroundLayer(map.grid)] : map.tileLayers,
    tilesets: needsTilesets ? [...DEFAULT_STUDIO_TILESETS] : map.tilesets,
  };
}
