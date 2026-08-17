/**
 * Bresenham Line Rasterization Algorithm (Phase 5C)
 * Used for Shift+Click straight-line tile painting in Studio.
 */

export interface GridCoord {
  r: number;
  c: number;
}

/**
 * Generates an ordered array of integer grid coordinates connecting (r0, c0) to (r1, c1)
 * using the standard Bresenham line algorithm.
 */
export function rasterizeLine(r0: number, c0: number, r1: number, c1: number): GridCoord[] {
  const points: GridCoord[] = [];

  let x0 = c0;
  let y0 = r0;
  const x1 = c1;
  const y1 = r1;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ r: y0, c: x0 });

    if (x0 === x1 && y0 === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return points;
}
