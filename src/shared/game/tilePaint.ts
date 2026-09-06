/**
 * Studio paint resolution (bible 29 §layers / 30 §editor standard).
 *
 * Kept pure and free of Babylon/React imports so the pointer callback in
 * `GameCanvasBabylon` has one obvious decision point instead of a chain of
 * silent early returns. Every refusal carries a reason the UI can surface —
 * a click that does nothing without explanation is the bug this replaces.
 */

/** Bible layer −1: collision / authority grid stored on `map.grid`. */
export const LOGIC_LAYER_IDX = -1;
/** Bible layer −2: region tagging grid stored on `map.regions`. */
export const REGION_LAYER_IDX = -2;

export type PaintTarget =
  | { kind: "logic" }
  | { kind: "region" }
  | { kind: "visual"; layerIdx: number }
  | { kind: "unavailable"; reason: string };

export interface PaintableMap {
  grid?: number[][];
  regions?: number[][];
  tileLayers?: Array<{ name?: string; grid?: number[][] }>;
  tilesets?: Array<{ firstgid: number }>;
}

/** Decide which grid a click should write to, or why it cannot. */
export function resolvePaintTarget(
  map: PaintableMap | null | undefined,
  activeLayerIdx: number
): PaintTarget {
  if (activeLayerIdx === LOGIC_LAYER_IDX) {
    const grid = map?.grid;
    if (!Array.isArray(grid) || grid.length === 0) {
      return { kind: "unavailable", reason: "This map has no logic grid to paint." };
    }
    return { kind: "logic" };
  }

  if (activeLayerIdx === REGION_LAYER_IDX) {
    const regions = map?.regions;
    if (!Array.isArray(regions) || regions.length === 0) {
      // Auto-initialize regions if missing on the fly? Or reject and let caller initialize it.
      // Usually better to let the map initialization handle it, but for backward compat we can just allow it 
      // if it exists, or the caller will initialize it before painting.
      return { kind: "unavailable", reason: "This map has no regions grid initialized to paint." };
    }
    return { kind: "region" };
  }

  if (!Number.isInteger(activeLayerIdx) || activeLayerIdx < 0) {
    return { kind: "unavailable", reason: `Unknown layer index ${activeLayerIdx}.` };
  }

  if (!Array.isArray(map?.tilesets) || map.tilesets.length === 0) {
    return {
      kind: "unavailable",
      reason: "Map has no tilesets — open World Builder to bootstrap them, then Save Map.",
    };
  }

  const layer = map?.tileLayers?.[activeLayerIdx];
  if (!layer || !Array.isArray(layer.grid)) {
    return {
      kind: "unavailable",
      reason: `No visual layer ${activeLayerIdx} — use Add Layer in World Builder, or switch to Logic (−1).`,
    };
  }

  return { kind: "visual", layerIdx: activeLayerIdx };
}

export type PaintResult = { ok: true } | { ok: false; reason: string };

/**
 * Write one cell in place, reporting a reason instead of throwing. A ragged grid
 * used to raise inside the Babylon pointer callback after the visual had already
 * been applied, so the map data and the screen disagreed with no error surfaced.
 */
export function paintCell(
  map: PaintableMap | null | undefined,
  target: PaintTarget,
  r: number,
  c: number,
  tileId: number
): PaintResult {
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const label = target.kind === "logic" ? "the logic grid" : target.kind === "region" ? "the regions grid" : target.kind === "visual" ? `layer ${target.layerIdx}` : "unknown";
  const grid = target.kind === "logic" ? map?.grid : target.kind === "region" ? map?.regions : target.kind === "visual" ? map?.tileLayers?.[target.layerIdx]?.grid : undefined;
  if (!Array.isArray(grid)) return { ok: false, reason: `Cannot paint: ${label} is missing.` };

  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) {
    return { ok: false, reason: `Cell (${c}, ${r}) is outside ${label}.` };
  }
  const row = grid[r];
  if (!Array.isArray(row) || c >= row.length) {
    return { ok: false, reason: `Cell (${c}, ${r}) is outside ${label}.` };
  }

  // A frozen row means the map came from immer-produced state. Report it rather
  // than throwing from inside the pointer handler where nothing surfaces it.
  if (Object.isFrozen(row)) {
    return { ok: false, reason: `Cannot paint: ${label} is read-only (frozen map data).` };
  }

  row[c] = tileId;
  return { ok: true };
}

/**
 * Logic ids must exist in the `MapLogicTile` registry or `validateMapSave`
 * rejects the whole map on save. Returns true when the registry has not loaded
 * yet so painting is never blocked by a slow fetch.
 */
export function isPaintableLogicId(
  logicTiles: Record<number | string, unknown> | null | undefined,
  logicId: number
): boolean {
  if (!logicTiles) return true;
  const keys = Object.keys(logicTiles);
  if (keys.length === 0) return true;
  return Object.prototype.hasOwnProperty.call(logicTiles, String(logicId));
}

/** Mesh names the paint/pick ray is allowed to land on. */
export function isTilePickTarget(meshName: string | null | undefined): boolean {
  if (!meshName) return false;
  return (
    meshName === "map_pick_plane" ||
    meshName.startsWith("voxel_chunk_") ||
    meshName.startsWith("tileset_mesh_") ||
    meshName.startsWith("logic_") ||
    meshName.startsWith("tile_") ||
    meshName.startsWith("ground_") ||
    meshName.startsWith("base_ground_")
  );
}

export interface EraseRegionParams {
  map: PaintableMap | null | undefined;
  layerIdx: number;
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

export interface ErasedCell {
  layerIdx: number;
  r: number;
  c: number;
  before: number;
  after: 0;
}

export type EraseRegionResult =
  | { ok: true; cells: ErasedCell[] }
  | { ok: false; reason: string };

/**
 * Erase all non-zero tiles within a bounding box [minR..maxR, minC..maxC] on
 * the target layer (logic or visual), mutating the grid in-place and returning
 * the list of changed cells for undo tracking and visual engine sync.
 */
export function eraseTilesInRegion(params: EraseRegionParams): EraseRegionResult {
  const { map, layerIdx, minR, maxR, minC, maxC } = params;
  if (!map) return { ok: false, reason: "Map data missing." };

  const target = resolvePaintTarget(map, layerIdx);
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const grid = target.kind === "logic" ? map.grid : target.kind === "region" ? map.regions : target.kind === "visual" ? map.tileLayers?.[target.layerIdx]?.grid : undefined;
  if (!Array.isArray(grid)) {
    return {
      ok: false,
      reason: target.kind === "logic" ? "Logic grid is missing." : target.kind === "region" ? "Regions grid is missing." : target.kind === "visual" ? `Layer ${target.layerIdx} is missing.` : "Layer is missing.",
    };
  }

  const r0 = Math.max(0, Math.min(minR, maxR));
  const r1 = Math.max(minR, maxR);
  const c0 = Math.max(0, Math.min(minC, maxC));
  const c1 = Math.max(minC, maxC);

  const erased: ErasedCell[] = [];

  for (let r = r0; r <= r1; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || Object.isFrozen(row)) continue;
    for (let c = c0; c <= c1; c++) {
      if (c >= row.length) continue;
      const prev = row[c] ?? 0;
      if (prev !== 0) {
        row[c] = 0;
        erased.push({
          layerIdx: target.kind === "logic" ? LOGIC_LAYER_IDX : target.kind === "region" ? REGION_LAYER_IDX : target.kind === "visual" ? target.layerIdx : 0,
          r,
          c,
          before: prev,
          after: 0,
        });
      }
    }
  }

  return { ok: true, cells: erased };
}

export interface EraseSparseCellsParams {
  map: PaintableMap | null | undefined;
  layerIdx: number;
  cells: Array<{ r: number; c: number }> | Record<string, boolean>;
}

/**
 * Erase all non-zero tiles for an arbitrary set of cell coordinates on the target layer,
 * mutating the grid in-place and returning the list of changed cells for single-op undo history.
 */
export function eraseSparseCells(params: EraseSparseCellsParams): EraseRegionResult {
  const { map, layerIdx, cells } = params;
  if (!map) return { ok: false, reason: "Map data missing." };

  const target = resolvePaintTarget(map, layerIdx);
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const grid = target.kind === "logic" ? map.grid : target.kind === "region" ? map.regions : target.kind === "visual" ? map.tileLayers?.[target.layerIdx]?.grid : undefined;
  if (!Array.isArray(grid)) {
    return {
      ok: false,
      reason: target.kind === "logic" ? "Logic grid is missing." : target.kind === "region" ? "Regions grid is missing." : target.kind === "visual" ? `Layer ${target.layerIdx} is missing.` : "Layer is missing.",
    };
  }

  const cellList: Array<{ r: number; c: number }> = Array.isArray(cells)
    ? cells
    : Object.keys(cells)
        .filter((k) => cells[k])
        .map((k) => {
          const [r, c] = k.split(",").map(Number);
          return { r, c };
        });

  const erased: ErasedCell[] = [];
  const visited = new Set<string>();

  for (const { r, c } of cellList) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) continue;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const row = grid[r];
    if (!Array.isArray(row) || Object.isFrozen(row) || c >= row.length) continue;

    const prev = row[c] ?? 0;
    if (prev !== 0) {
      row[c] = 0;
      erased.push({
        layerIdx: target.kind === "logic" ? LOGIC_LAYER_IDX : target.kind === "region" ? REGION_LAYER_IDX : target.kind === "visual" ? target.layerIdx : 0,
        r,
        c,
        before: prev,
        after: 0,
      });
    }
  }

  return { ok: true, cells: erased };
}

export interface PaintRegionParams {
  map: PaintableMap | null | undefined;
  layerIdx: number;
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
  tileId: number;
}

export interface PaintSparseCellsParams {
  map: PaintableMap | null | undefined;
  layerIdx: number;
  cells: Array<{ r: number; c: number }> | Record<string, boolean>;
  tileId: number;
}

export interface BatchPaintCell {
  layerIdx: number;
  r: number;
  c: number;
  before: number;
  after: number;
}

export type BatchPaintResult =
  | { ok: true; cells: BatchPaintCell[] }
  | { ok: false; reason: string };

/**
 * Paint all tiles within a bounding box [minR..maxR, minC..maxC] on the target layer
 * with tileId, mutating the grid in-place and returning the list of changed cells.
 */
export function paintTilesInRegion(params: PaintRegionParams): BatchPaintResult {
  const { map, layerIdx, minR, maxR, minC, maxC, tileId } = params;
  if (!map) return { ok: false, reason: "Map data missing." };

  const target = resolvePaintTarget(map, layerIdx);
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const grid = target.kind === "logic" ? map.grid : target.kind === "region" ? map.regions : target.kind === "visual" ? map.tileLayers?.[target.layerIdx]?.grid : undefined;
  if (!Array.isArray(grid)) {
    return {
      ok: false,
      reason: target.kind === "logic" ? "Logic grid is missing." : target.kind === "region" ? "Regions grid is missing." : target.kind === "visual" ? `Layer ${target.layerIdx} is missing.` : "Layer is missing.",
    };
  }

  const r0 = Math.max(0, Math.min(minR, maxR));
  const r1 = Math.max(minR, maxR);
  const c0 = Math.max(0, Math.min(minC, maxC));
  const c1 = Math.max(minC, maxC);

  const changed: BatchPaintCell[] = [];

  for (let r = r0; r <= r1; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || Object.isFrozen(row)) continue;
    for (let c = c0; c <= c1; c++) {
      if (c >= row.length) continue;
      const prev = row[c] ?? 0;
      if (prev !== tileId) {
        row[c] = tileId;
        changed.push({
          layerIdx: target.kind === "logic" ? LOGIC_LAYER_IDX : target.kind === "region" ? REGION_LAYER_IDX : target.kind === "visual" ? target.layerIdx : 0,
          r,
          c,
          before: prev,
          after: tileId,
        });
      }
    }
  }

  return { ok: true, cells: changed };
}

/**
 * Paint all tiles for an arbitrary set of cell coordinates on the target layer with tileId,
 * mutating the grid in-place and returning the list of changed cells for single-op undo history.
 */
export function paintSparseCells(params: PaintSparseCellsParams): BatchPaintResult {
  const { map, layerIdx, cells, tileId } = params;
  if (!map) return { ok: false, reason: "Map data missing." };

  const target = resolvePaintTarget(map, layerIdx);
  if (target.kind === "unavailable") return { ok: false, reason: target.reason };

  const grid = target.kind === "logic" ? map.grid : target.kind === "region" ? map.regions : target.kind === "visual" ? map.tileLayers?.[target.layerIdx]?.grid : undefined;
  if (!Array.isArray(grid)) {
    return {
      ok: false,
      reason: target.kind === "logic" ? "Logic grid is missing." : target.kind === "region" ? "Regions grid is missing." : target.kind === "visual" ? `Layer ${target.layerIdx} is missing.` : "Layer is missing.",
    };
  }

  const cellList: Array<{ r: number; c: number }> = Array.isArray(cells)
    ? cells
    : Object.keys(cells)
        .filter((k) => cells[k])
        .map((k) => {
          const [r, c] = k.split(",").map(Number);
          return { r, c };
        });

  const changed: BatchPaintCell[] = [];
  const visited = new Set<string>();

  for (const { r, c } of cellList) {
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) continue;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const row = grid[r];
    if (!Array.isArray(row) || Object.isFrozen(row) || c >= row.length) continue;

    const prev = row[c] ?? 0;
    if (prev !== tileId) {
      row[c] = tileId;
      changed.push({
        layerIdx: target.kind === "logic" ? LOGIC_LAYER_IDX : target.kind === "region" ? REGION_LAYER_IDX : target.kind === "visual" ? target.layerIdx : 0,
        r,
        c,
        before: prev,
        after: tileId,
      });
    }
  }

  return { ok: true, cells: changed };
}

/** Compute bounding box of arbitrary cells. Returns null if empty. */
export function getCellsBoundingBox(
  cells: Array<{ r: number; c: number }> | Record<string, boolean>
): { minR: number; maxR: number; minC: number; maxC: number; width: number; height: number; count: number } | null {
  const cellList: Array<{ r: number; c: number }> = Array.isArray(cells)
    ? cells
    : Object.keys(cells)
        .filter((k) => cells[k])
        .map((k) => {
          const [r, c] = k.split(",").map(Number);
          return { r, c };
        });

  if (cellList.length === 0) return null;

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (const { r, c } of cellList) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  if (!isFinite(minR) || !isFinite(minC)) return null;

  const width = maxC - minC + 1;
  const height = maxR - minR + 1;

  return {
    minR,
    maxR,
    minC,
    maxC,
    width,
    height,
    count: cellList.length,
  };
}



