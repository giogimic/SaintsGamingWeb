/**
 * Shared Brush Shape Geometry Utilities
 *
 * Single source of truth for shape-based distance and footprint checks.
 * Integrates directly with ContinuousGeometry mathematical models while
 * preserving backward-compatible signatures for all engine subsystems.
 */

import { isPointInGeometry, type ContinuousGeometry } from './geometry/continuousGeometry';

export type BrushShape = 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon';

/**
 * Check whether integer grid offset (dr, dc) falls within a brush footprint
 * centered at (0, 0) with the given radius.
 *
 * Used for grid-based painting and reticle rendering where coordinates are
 * integer cell offsets from the brush center.
 *
 * @param dr  Row offset from brush center (integer)
 * @param dc  Column offset from brush center (integer)
 * @param radius  Brush radius in cells (the "rad" value, typically brushRadius - 1)
 * @param shape  Active brush shape
 */
export function isInGridFootprint(
  dr: number,
  dc: number,
  radius: number,
  shape: BrushShape
): boolean {
  if (shape === 'square') return true; // full bounding box
  if (shape === 'diamond') return Math.abs(dr) + Math.abs(dc) <= radius;
  if (shape === 'splat-star') {
    if (dr * dr + dc * dc > radius * radius + radius) return false;
    // Cardinal axes + exact diagonals only
    return dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  }
  // circle + polygon fallback
  return dr * dr + dc * dc <= radius * radius + radius;
}

/**
 * Check whether a floating-point offset (dx, dy) falls within a brush shape
 * of the given radius.
 *
 * Routes directly through the continuous geometry model.
 *
 * @param dx  X distance from brush center (float)
 * @param dy  Y distance from brush center (float)
 * @param radius  Brush radius (float)
 * @param shape  Active brush shape
 */
export function isInBrushShape(
  dx: number,
  dy: number,
  radius: number,
  shape: BrushShape
): boolean {
  if (shape === 'square') {
    return isPointInGeometry(dx, dy, {
      type: 'rectangle',
      minX: -radius,
      minZ: -radius,
      maxX: radius,
      maxZ: radius,
    });
  }
  if (shape === 'diamond') {
    return Math.abs(dx) + Math.abs(dy) <= radius;
  }
  if (shape === 'splat-star') {
    if (dx * dx + dy * dy > radius * radius) return false;
    return Math.abs(dx) < 0.2 || Math.abs(dy) < 0.2 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.2;
  }
  // circle & polygon fallback
  return isPointInGeometry(dx, dy, {
    type: 'circle',
    centerX: 0,
    centerZ: 0,
    radius,
  });
}
