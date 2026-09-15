export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoxBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/**
 * Returns true if the center of the voxel at (vx, vy, vz) is contained within the sphere.
 * The sphere's center is typically provided as the world-coordinate click point.
 */
export function sphereContains(vx: number, vy: number, vz: number, center: Point3D, radius: number): boolean {
  // Use voxel center sampling (offset by +0.5 from voxel origin)
  const cx = vx + 0.5;
  const cy = vy + 0.5;
  const cz = vz + 0.5;

  const dx = cx - center.x;
  const dy = cy - center.y;
  const dz = cz - center.z;

  // radius * radius for faster comparison without sqrt
  return (dx * dx + dy * dy + dz * dz) <= (radius * radius);
}

/**
 * Returns true if the center of the voxel is contained within the vertical cylinder.
 */
export function cylinderContains(vx: number, vy: number, vz: number, center: Point3D, radius: number, height: number): boolean {
  const cx = vx + 0.5;
  const cy = vy + 0.5;
  const cz = vz + 0.5;

  // Vertical bounds check (from center.y down to center.y - height)
  // Or centered depending on brush preference. We'll do a symmetric center-Y bounds for standard brushes.
  const halfHeight = height / 2.0;
  if (cy < center.y - halfHeight || cy > center.y + halfHeight) {
    return false;
  }

  // Radial check in XZ plane
  const dx = cx - center.x;
  const dz = cz - center.z;

  return (dx * dx + dz * dz) <= (radius * radius);
}

/**
 * Returns true if the center of the voxel is contained within the AABB box.
 */
export function boxContains(vx: number, vy: number, vz: number, bounds: BoxBounds): boolean {
  const cx = vx + 0.5;
  const cy = vy + 0.5;
  const cz = vz + 0.5;

  return (
    cx >= bounds.minX && cx <= bounds.maxX &&
    cy >= bounds.minY && cy <= bounds.maxY &&
    cz >= bounds.minZ && cz <= bounds.maxZ
  );
}

/**
 * Calculates the integer bounds needed to iterate over when evaluating a sphere brush.
 */
export function getSphereBounds(center: Point3D, radius: number): BoxBounds {
  return {
    minX: Math.floor(center.x - radius),
    maxX: Math.floor(center.x + radius),
    minY: Math.floor(center.y - radius),
    maxY: Math.floor(center.y + radius),
    minZ: Math.floor(center.z - radius),
    maxZ: Math.floor(center.z + radius),
  };
}

export function getCylinderBounds(center: Point3D, radius: number, height: number): BoxBounds {
  const half = height / 2.0;
  return {
    minX: Math.floor(center.x - radius),
    maxX: Math.floor(center.x + radius),
    minY: Math.floor(center.y - half),
    maxY: Math.floor(center.y + half),
    minZ: Math.floor(center.z - radius),
    maxZ: Math.floor(center.z + radius),
  };
}
