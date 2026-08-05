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
  tileSize: number
): number[] {
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  const half = s / 2;
  const x0 = posX - half;
  const x1 = posX + half;
  const z0 = posZ - half;
  const z1 = posZ + half;
  return [x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0];
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
  const localGid = gid - ts.firstgid;
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
