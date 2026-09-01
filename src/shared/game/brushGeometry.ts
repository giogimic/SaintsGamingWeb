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
 * of the given radius, optionally rotated by an angle in radians.
 *
 * Routes directly through the continuous geometry model.
 *
 * @param dx  X distance from brush center (float)
 * @param dy  Y distance from brush center (float)
 * @param radius  Brush radius (float)
 * @param shape  Active brush shape
 * @param rotation  Optional rotation in radians
 */
export function isInBrushShape(
  dx: number,
  dy: number,
  radius: number,
  shape: BrushShape,
  rotation?: number
): boolean {
  let localX = dx;
  let localY = dy;

  if (rotation && rotation !== 0) {
    const cosR = Math.cos(-rotation);
    const sinR = Math.sin(-rotation);
    localX = dx * cosR - dy * sinR;
    localY = dx * sinR + dy * cosR;
  }

  if (shape === 'square') {
    return isPointInGeometry(localX, localY, {
      type: 'rectangle',
      minX: -radius,
      minZ: -radius,
      maxX: radius,
      maxZ: radius,
    });
  }
  if (shape === 'diamond') {
    return Math.abs(localX) + Math.abs(localY) <= radius;
  }
  if (shape === 'splat-star') {
    if (localX * localX + localY * localY > radius * radius) return false;
    const thresh = Math.max(0.2, radius * 0.2);
    return Math.abs(localX) < thresh || Math.abs(localY) < thresh || Math.abs(Math.abs(localX) - Math.abs(localY)) < thresh;
  }
  // circle & polygon fallback
  return isPointInGeometry(localX, localY, {
    type: 'circle',
    centerX: 0,
    centerZ: 0,
    radius,
  });
}

/**
 * Calculate distance-based opacity falloff for soft splat brushes.
 * Returns value from 0.0 (edge) to 1.0 (center).
 */
export function calculateSplatOpacityFalloff(
  dx: number,
  dy: number,
  radius: number,
  softness: number = 0.5
): number {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= radius) return 0;
  if (softness <= 0.05) return 1;

  const innerRadius = radius * (1 - softness);
  if (dist <= innerRadius) return 1;

  // Smooth Hermite interpolation falloff
  const t = (dist - innerRadius) / (radius - innerRadius);
  return 1 - (t * t * (3 - 2 * t));
}

/**
 * Generate randomly distributed or shape-patterned sub-tile splat points
 * within a continuous brush footprint.
 */
export function generateSplatScatterPoints(
  centerX: number,
  centerY: number,
  radius: number,
  shape: BrushShape,
  scatter: number = 0.5,
  count: number = 1,
  rotation: number = 0,
  randomizeRotation: boolean = false
): Array<{ x: number; y: number; rot: number; opacity: number }> {
  const points: Array<{ x: number; y: number; rot: number; opacity: number }> = [];

  if (radius <= 0.5 || count <= 1) {
    const rot = randomizeRotation ? Math.random() * Math.PI * 2 : rotation;
    points.push({ x: centerX, y: centerY, rot, opacity: 1.0 });
    return points;
  }

  const maxAttempts = count * 6;
  let attempts = 0;

  while (points.length < count && attempts < maxAttempts) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    // Area-weighted radial distribution
    const rDist = Math.sqrt(Math.random()) * radius * (0.3 + 0.7 * scatter);
    const ox = Math.cos(angle) * rDist;
    const oy = Math.sin(angle) * rDist;

    if (isInBrushShape(ox, oy, radius, shape, rotation)) {
      const rot = randomizeRotation ? Math.random() * Math.PI * 2 : rotation;
      const opacity = calculateSplatOpacityFalloff(ox, oy, radius, 0.4);
      points.push({
        x: centerX + ox,
        y: centerY + oy,
        rot,
        opacity,
      });
    }
  }

  if (points.length === 0) {
    points.push({ x: centerX, y: centerY, rot: rotation, opacity: 1.0 });
  }

  return points;
}
