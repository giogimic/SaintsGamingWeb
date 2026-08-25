/**
 * Pure helpers for batched tileset mesh edits (Studio live remesh).
 * Keeps UV / quad math unit-testable without WebGL.
 */

export type TilesetUvInput = {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth?: number;
  tileheight?: number;
  imageheight?: number;
  tilecount?: number;
};

export type SizeLookup = Record<string, { w?: number; h?: number }>;

/** Tiled stores H/V/D flip in the high bits of a GID. */
export const TILED_GID_FLIP_MASK = 0xe0000000;

/** Clear Tiled flip flags so firstgid / UV math uses the real tile id. */
export function stripTiledGidFlags(gid: number): number {
  if (!Number.isFinite(gid) || gid <= 0) return 0;
  return gid & ~TILED_GID_FLIP_MASK;
}

/** Convert root-local XZ to tile row/col for the batched ground layout. */
export function worldToTileCoord(
  worldX: number,
  worldZ: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number = 1
): { r: number; c: number } | null {
  const w = mapWidth;
  const h = mapHeight;
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  if (!w || !h) return null;
  // Quads are centered on (c - w/2, h/2 - r). Add 0.5 so each half-tile
  // maps to the cell under the cursor (not the northwest neighbor).
  const c = Math.floor(worldX / s + w / 2 + 0.5);
  const r = Math.floor(h / 2 - worldZ / s + 0.5);
  if (r < 0 || c < 0 || r >= h || c >= w) return null;
  return { r, c };
}

export function cellBatchKey(layerIdx: number, r: number, c: number): string {
  return `${layerIdx}_${r}_${c}`;
}

export function tileCellWorldPos(
  r: number,
  c: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number
): { posX: number; posZ: number } {
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  return {
    posX: (c - mapWidth / 2) * s,
    posZ: (mapHeight / 2 - r) * s,
  };
}

/** 4 verts (TL, TR, BR, BL) — matches `loadTilemap` batched vertex order. */
export function groundQuadPositions(
  posX: number,
  posZ: number,
  y: number,
  tileSize: number,
  tileW: number = 32,
  tileH: number = 32,
  baseGridPx?: number
): number[] {
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  const unitPx = baseGridPx && baseGridPx > 0 ? baseGridPx : (tileW || 32);
  const worldW = s * (tileW / unitPx);
  const worldH = s * (tileH / unitPx);
  const half = s / 2;
  const x0 = posX - half;
  const z0 = posZ - half;
  const x1 = x0 + worldW;
  const z1 = z0 + worldH;
  return [
    x0, y, z1, // TL
    x1, y, z1, // TR
    x1, y, z0, // BR
    x0, y, z0, // BL
  ];
}

/** Collapse a quad under the map so it no longer draws (erase / tileset move). */
export function collapsedQuadPositions(): number[] {
  const y = -100;
  return [0, y, 0, 0, y, 0, 0, y, 0, 0, y, 0];
}

export function estimateTilesetRows(
  ts: TilesetUvInput,
  localGid: number,
  sizeLookup?: SizeLookup
): number {
  let estimatedRows = 24;
  const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, "");
  const sizes = sizeLookup?.[rawSource];
  if (sizes?.h && ts.tileheight) {
    estimatedRows = Math.floor(sizes.h / ts.tileheight);
  } else if (ts.imageheight && ts.tileheight) {
    estimatedRows = Math.floor(ts.imageheight / ts.tileheight);
  } else if (ts.tilecount && ts.columns) {
    estimatedRows = Math.ceil(ts.tilecount / ts.columns);
  } else if (ts.imageSource.includes("Terrain")) {
    estimatedRows = 24;
  } else if (ts.imageSource.includes("Furniture")) {
    estimatedRows = 11;
  } else if (ts.imageSource.includes("Interior_Walls")) {
    estimatedRows = 12;
  } else if (ts.imageSource.includes("Interior_Floors")) {
    estimatedRows = 12;
  } else if (ts.imageSource.includes("Vegetation")) {
    estimatedRows = 4;
  } else {
    estimatedRows = Math.max(16, Math.ceil((localGid + 1) / Math.max(1, ts.columns)));
  }
  return estimatedRows;
}

/**
 * Batched mesh UV order: TL, TR, BR, BL with invertY=false (v0 = top of tile).
 * Overlay CreatePlane uses a different order — do not mix.
 */
export function tilesetUvForGid(
  gid: number,
  ts: TilesetUvInput,
  sizeLookup?: SizeLookup
): number[] {
  const localGid = stripTiledGidFlags(gid) - ts.firstgid;
  const col = localGid % ts.columns;
  const row = Math.floor(localGid / ts.columns);
  const estimatedRows = estimateTilesetRows(ts, localGid, sizeLookup);
  const imgW = ts.columns * (ts.tilewidth || 16);
  const imgH = estimatedRows * (ts.tileheight || 16);
  const hpU = 0.5 / imgW;
  const hpV = 0.5 / imgH;
  const u0 = col / ts.columns + hpU;
  const u1 = (col + 1) / ts.columns - hpU;
  const v0 = row / estimatedRows + hpV;
  const v1 = (row + 1) / estimatedRows - hpV;
  return [u0, v0, u1, v0, u1, v1, u0, v1];
}

/** Overlay CreatePlane UV order (BL, BR, TR, TL). */
export function tilesetUvForOverlayPlane(
  gid: number,
  ts: TilesetUvInput,
  sizeLookup?: SizeLookup
): number[] {
  const [u0, v0, u1, , , v1] = tilesetUvForGid(gid, ts, sizeLookup);
  return [u0, v1, u1, v1, u1, v0, u0, v0];
}

const CASE_FIXES: Record<string, string> = {
  'terrain_by_george.png': 'Terrain_by_George.png',
  'furniture_and_fittings_by_george.png': 'Furniture_and_Fittings_by_George.png',
  'interior_walls_by_george.png': 'Interior_Walls_by_George.png',
  'interior_floors_by_george.png': 'Interior_Floors_by_George.png',
  'vegetation_and_outdoor_fittings_by_george.png': 'Vegetation_and_Outdoor_Fittings_by_George.png',
};

/**
 * Resolves a tileset image source string into a browser-loadable URL.
 * Handles remote URLs, uploaded assets, absolute and relative paths.
 */
export function resolveTilesetTextureUrl(source: string): string {
  if (!source) return '';
  const trimmed = source.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/game-assets/')) {
    return trimmed;
  }
  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  let rawSource = trimmed.replace(/^(.*\/tilesets\/|tilesets\/)/i, '');
  if (CASE_FIXES[rawSource.toLowerCase()]) {
    rawSource = CASE_FIXES[rawSource.toLowerCase()];
  }
  return `/game-assets/tilesets/${encodeURIComponent(rawSource)}`;
}
