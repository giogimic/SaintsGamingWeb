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
  imagewidth?: number;
  imageheight?: number;
  tilecount?: number;
  margin?: number;
  spacing?: number;
  offsetX?: number;
  offsetY?: number;
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
  const baseName = ts.imageSource.split("/").pop() || "";
  const sizes =
    sizeLookup?.[rawSource] ||
    sizeLookup?.[ts.imageSource] ||
    sizeLookup?.[baseName];

  const th = ts.tileheight || 16;
  const offY = ts.offsetY ?? ts.margin ?? 0;
  const spacing = ts.spacing ?? 0;

  if (sizes?.h && th) {
    estimatedRows = Math.max(1, Math.floor((sizes.h - offY) / (th + spacing)));
  } else if (ts.imageheight && th) {
    estimatedRows = Math.max(1, Math.floor((ts.imageheight - offY) / (th + spacing)));
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

  const rawSource = ts.imageSource.replace(/^(.*\/tilesets\/|tilesets\/)/i, "");
  const baseName = ts.imageSource.split("/").pop() || "";
  const sizeObj =
    sizeLookup?.[rawSource] ||
    sizeLookup?.[ts.imageSource] ||
    sizeLookup?.[baseName];

  const offX = ts.offsetX ?? ts.margin ?? 0;
  const offY = ts.offsetY ?? ts.margin ?? 0;
  const spacing = ts.spacing ?? 0;
  const tw = ts.tilewidth || 16;
  const th = ts.tileheight || 16;

  const imgW =
    (ts as any).imagewidth ||
    sizeObj?.w ||
    Math.max(1, offX + ts.columns * (tw + spacing));
  const imgH =
    (ts as any).imageheight ||
    sizeObj?.h ||
    Math.max(1, offY + estimatedRows * (th + spacing));

  const pixelX0 = offX + col * (tw + spacing);
  const pixelX1 = pixelX0 + tw;
  const pixelY0 = offY + row * (th + spacing);
  const pixelY1 = pixelY0 + th;

  const hpU = 0.5 / imgW;
  const hpV = 0.5 / imgH;
  const u0 = pixelX0 / imgW + hpU;
  const u1 = pixelX1 / imgW - hpU;
  const v0 = pixelY0 / imgH + hpV;
  const v1 = pixelY1 / imgH - hpV;
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
  'terrain_by_george.png': 'terrain-overworld.png',
  'terrain_by_george': 'terrain-overworld.png',
  'furniture_and_fittings_by_george.png': 'terrain-overworld.png',
  'interior_walls_by_george.png': 'terrain-overworld.png',
  'interior_floors_by_george.png': 'terrain-overworld.png',
  'vegetation_and_outdoor_fittings_by_george.png': 'terrain-overworld.png',
};

/**
 * Resolves a tileset image source string into a browser-loadable URL.
 * Handles remote URLs, uploaded assets, absolute and relative paths.
 */
export function resolveTilesetTextureUrl(source: string): string {
  if (!source) return '/game-assets/tilesets/terrain-overworld.png';
  const trimmed = source.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  let filename = trimmed.replace(/^\/?(game-assets\/)?tilesets\//i, '');
  filename = filename.replace(/^\/?uploads\//i, '');
  
  if (CASE_FIXES[filename.toLowerCase()]) {
    filename = CASE_FIXES[filename.toLowerCase()];
  }
  
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return `/uploads/${encodeURIComponent(filename)}`;
  }
  return `/game-assets/tilesets/${encodeURIComponent(filename)}`;
}
