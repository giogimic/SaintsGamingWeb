/**
 * Stamp / Brush Transform Mathematics (Phase 5A)
 * Handles 2D grid flipping (horizontal, vertical) and 90°/180°/270° clockwise rotations.
 */

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

export type { TileClipboardData } from './subgridStamp';
import type { TileClipboardData } from './subgridStamp';

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
