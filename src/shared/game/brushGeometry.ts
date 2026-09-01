/**
 * Shared Brush Shape Geometry Utilities
 *
 * Single source of truth for shape-based distance and footprint checks.
 * Used by:
 *  - BabylonEngine grid paint loop
 *  - BabylonEngine reticle `isInFootprint`
 *  - GameCanvasBabylon freeform splat/prop erase & density
 */

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
 * Used for freeform splat/prop operations where coordinates are sub-tile
 * floating-point distances from the brush center.
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
  if (shape === 'square') return Math.max(Math.abs(dx), Math.abs(dy)) <= radius;
  if (shape === 'diamond') return Math.abs(dx) + Math.abs(dy) <= radius;
  if (shape === 'splat-star') {
    if (dx * dx + dy * dy > radius * radius) return false;
    // Thin arms along cardinal and diagonal axes
    return Math.abs(dx) < 0.15 || Math.abs(dy) < 0.15 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.15;
  }
  // circle + polygon fallback
  return dx * dx + dy * dy <= radius * radius;
}
