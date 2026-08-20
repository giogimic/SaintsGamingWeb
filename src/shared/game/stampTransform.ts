/**
 * Stamp / Brush Transform Mathematics (Phase 5A)
 * Handles 2D grid flipping (horizontal, vertical) and 90°/180°/270° clockwise rotations.
 */

import {
  type TileClipboardData,
  extractSparseCellsFromMap,
  extractSubgridFromMap,
  stampClipboardOntoMap,
} from './subgridStamp';
import {
  type PaintableMap,
  eraseSparseCells,
  eraseTilesInRegion,
} from './tilePaint';
import {
  type PaintedCell,
  deduplicatePaintedCells,
} from './editorOps';

export interface StampTransform {
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
}

export const DEFAULT_STAMP_TRANSFORM: StampTransform = {
  flipH: false,
  flipV: false,
  rotation: 0,
};

export function rotateCW(rot: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return ((rot + 90) % 360) as 0 | 90 | 180 | 270;
}

export function rotateCCW(rot: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 {
  return ((rot + 270) % 360) as 0 | 90 | 180 | 270;
}


/** Rotate a 2D matrix 90 degrees clockwise. */
export function rotateMatrix90CW<T>(matrix: T[][]): T[][] {
  if (!matrix.length || !matrix[0].length) return matrix;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: T[][] = [];

  for (let c = 0; c < cols; c++) {
    const newRow: T[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

/** Flip a 2D matrix horizontally (left-right mirror). */
export function flipMatrixH<T>(matrix: T[][]): T[][] {
  return matrix.map((row) => [...row].reverse());
}

/** Flip a 2D matrix vertically (top-bottom mirror). */
export function flipMatrixV<T>(matrix: T[][]): T[][] {
  return [...matrix].reverse().map((row) => [...row]);
}

/** Transform any 2D tile grid by applying flip and rotation. */
export function transformGrid<T>(grid: T[][], transform: StampTransform): T[][] {
  if (!grid.length || !grid[0].length) return grid;

  let current = grid.map((r) => [...r]);

  if (transform.flipH) {
    current = flipMatrixH(current);
  }

  if (transform.flipV) {
    current = flipMatrixV(current);
  }

  const rot = transform.rotation % 360;
  if (rot === 90) {
    current = rotateMatrix90CW(current);
  } else if (rot === 180) {
    current = rotateMatrix90CW(rotateMatrix90CW(current));
  } else if (rot === 270) {
    current = rotateMatrix90CW(rotateMatrix90CW(rotateMatrix90CW(current)));
  }

  return current;
}

export type { TileClipboardData };

/** Transform coordinates and dimensions of a TileClipboardData object. */
export function transformClipboard(
  clip: TileClipboardData,
  transform: StampTransform
): TileClipboardData {
  if (!transform.flipH && !transform.flipV && transform.rotation === 0) {
    return clip;
  }

  let width = clip.width;
  let height = clip.height;
  let visual = clip.visualData.map((v) => ({ ...v }));
  let logic = clip.logicData.map((l) => ({ ...l }));

  // 1. Flip Horizontal
  if (transform.flipH) {
    visual = visual.map((v) => ({ ...v, c: width - 1 - v.c }));
    logic = logic.map((l) => ({ ...l, c: width - 1 - l.c }));
  }

  // 2. Flip Vertical
  if (transform.flipV) {
    visual = visual.map((v) => ({ ...v, r: height - 1 - v.r }));
    logic = logic.map((l) => ({ ...l, r: height - 1 - l.r }));
  }

  // 3. Rotation (CW)
  const rot = transform.rotation % 360;
  if (rot === 90) {
    visual = visual.map((v) => ({ ...v, r: v.c, c: height - 1 - v.r }));
    logic = logic.map((l) => ({ ...l, r: l.c, c: height - 1 - l.r }));
    const tmp = width;
    width = height;
    height = tmp;
  } else if (rot === 180) {
    visual = visual.map((v) => ({ ...v, r: height - 1 - v.r, c: width - 1 - v.c }));
    logic = logic.map((l) => ({ ...l, r: height - 1 - l.r, c: width - 1 - l.c }));
  } else if (rot === 270) {
    visual = visual.map((v) => ({ ...v, r: width - 1 - v.c, c: v.r }));
    logic = logic.map((l) => ({ ...l, r: width - 1 - l.c, c: l.r }));
    const tmp = width;
    width = height;
    height = tmp;
  }

  return {
    ...clip,
    width,
    height,
    visualData: visual,
    logicData: logic,
  };
}

export interface TransformSelectionParams {
  map: PaintableMap | null | undefined;
  layerIdx?: number;
  cells?: Array<{ r: number; c: number }> | Record<string, boolean>;
  bounds?: { minR: number; maxR: number; minC: number; maxC: number };
  transform: StampTransform;
}

export interface TransformSelectionResult {
  ok: boolean;
  cells: PaintedCell[];
  newBounds?: { minR: number; maxR: number; minC: number; maxC: number; width: number; height: number };
  newCells?: Record<string, boolean>;
  error?: string;
}

/**
 * Transforms (flips / rotates) the selected region or sparse cells in-place on the map document.
 * Returns the atomic deduplicated list of painted cells for single-op undo history and visual sync,
 * along with the updated sparse cells / bounding box for UI selection preservation.
 */
export function transformSelectionInPlace(
  params: TransformSelectionParams
): TransformSelectionResult {
  const { map, layerIdx = 0, cells, bounds, transform } = params;
  if (!map) return { ok: false, cells: [], error: 'Map data missing.' };

  // 1. Extract clipboard from selection
  const hasSparse = cells && (Array.isArray(cells) ? cells.length > 0 : Object.keys(cells).length > 0);
  let extracted: TileClipboardData | null = null;

  if (hasSparse) {
    extracted = extractSparseCellsFromMap({ map, cells: cells!, activeLayerIdx: layerIdx });
  } else if (bounds) {
    extracted = extractSubgridFromMap({
      map,
      minR: bounds.minR,
      maxR: bounds.maxR,
      minC: bounds.minC,
      maxC: bounds.maxC,
      activeLayerIdx: layerIdx,
    });
  }

  if (!extracted || (extracted.visualData.length === 0 && extracted.logicData.length === 0)) {
    return { ok: false, cells: [], error: 'No tiles in selection to transform.' };
  }

  // 2. Erase the source cells first
  let erasedCells: PaintedCell[] = [];
  if (hasSparse) {
    const eraseRes = eraseSparseCells({ map, layerIdx, cells: cells! });
    if (eraseRes.ok) erasedCells = eraseRes.cells;
  } else if (bounds) {
    const eraseRes = eraseTilesInRegion({
      map,
      layerIdx,
      minR: bounds.minR,
      maxR: bounds.maxR,
      minC: bounds.minC,
      maxC: bounds.maxC,
    });
    if (eraseRes.ok) erasedCells = eraseRes.cells;
  }

  // 3. Transform the clipboard
  const transformed = transformClipboard(extracted, transform);

  // 4. Stamp transformed clipboard back onto the map at the same source origin
  const stampRes = stampClipboardOntoMap({
    map,
    clipboard: transformed,
    targetR: extracted.sourceOrigin.r,
    targetC: extracted.sourceOrigin.c,
    mode: 'overlay',
    activeLayerIdx: layerIdx,
  });

  if (!stampRes.ok) {
    return { ok: false, cells: [], error: stampRes.error || 'Failed to stamp transformed tiles.' };
  }

  // 5. Deduplicate intermediate writes (erase + stamp) into a single atomic change set
  const allMutations = [...erasedCells, ...stampRes.cells];
  const deduplicated = deduplicatePaintedCells(allMutations);

  // 6. Compute new selection boundaries & sparse cells
  const newBounds = {
    minR: extracted.sourceOrigin.r,
    minC: extracted.sourceOrigin.c,
    maxR: extracted.sourceOrigin.r + transformed.height - 1,
    maxC: extracted.sourceOrigin.c + transformed.width - 1,
    width: transformed.width,
    height: transformed.height,
  };

  const newCells: Record<string, boolean> = {};
  for (const v of transformed.visualData) {
    newCells[`${extracted.sourceOrigin.r + v.r},${extracted.sourceOrigin.c + v.c}`] = true;
  }
  for (const l of transformed.logicData) {
    newCells[`${extracted.sourceOrigin.r + l.r},${extracted.sourceOrigin.c + l.c}`] = true;
  }

  return {
    ok: true,
    cells: deduplicated,
    newBounds,
    newCells,
  };
}

