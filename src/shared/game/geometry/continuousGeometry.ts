/**
 * Saints Gaming — Continuous Mathematical Geometry Model
 *
 * Single source of truth for continuous geometry, shape definitions,
 * point-in-geometry testing, bounding box calculations, pivot transforms,
 * and discrete layer rasterization across 2D, 2.5D, and 3D editor modes.
 */

export type ContinuousGeometry =
  | { type: 'circle'; centerX: number; centerZ: number; radius: number }
  | { type: 'ellipse'; centerX: number; centerZ: number; radiusX: number; radiusZ: number; rotation?: number }
  | { type: 'rectangle'; minX: number; minZ: number; maxX: number; maxZ: number; rotation?: number }
  | { type: 'regularPolygon'; centerX: number; centerZ: number; radius: number; sides: number; rotation?: number }
  | { type: 'star'; centerX: number; centerZ: number; outerRadius: number; innerRadius: number; points: number; rotation?: number }
  | { type: 'polygon'; points: Array<{ x: number; z: number }> }
  | { type: 'path'; points: Array<{ x: number; z: number }>; strokeWidth: number; closed?: boolean }
  | { type: 'freehand'; strokes: Array<{ x: number; z: number; pressure?: number }>; strokeWidth: number };

export interface TransformPivot {
  /** Normalized anchor X (0.0 = left, 0.5 = center, 1.0 = right). Default 0.5 */
  anchorX: number;
  /** Normalized anchor Z (0.0 = top, 0.5 = center, 1.0 = bottom). Default 0.5 */
  anchorZ: number;
  /** Explicit world coordinate offset X */
  offsetX: number;
  /** Explicit world coordinate offset Z */
  offsetZ: number;
}

export const DEFAULT_TRANSFORM_PIVOT: TransformPivot = {
  anchorX: 0.5,
  anchorZ: 0.5,
  offsetX: 0,
  offsetZ: 0,
};

export interface GeometryBoundingBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  width: number;
  height: number;
  centerX: number;
  centerZ: number;
}

/**
 * Calculates the exact continuous Axis-Aligned Bounding Box (AABB) of any geometric primitive.
 */
export function getGeometryBoundingBox(geom: ContinuousGeometry): GeometryBoundingBox {
  switch (geom.type) {
    case 'circle': {
      const minX = geom.centerX - geom.radius;
      const maxX = geom.centerX + geom.radius;
      const minZ = geom.centerZ - geom.radius;
      const maxZ = geom.centerZ + geom.radius;
      return {
        minX,
        minZ,
        maxX,
        maxZ,
        width: geom.radius * 2,
        height: geom.radius * 2,
        centerX: geom.centerX,
        centerZ: geom.centerZ,
      };
    }
    case 'ellipse': {
      const maxRad = Math.max(geom.radiusX, geom.radiusZ);
      const minX = geom.centerX - maxRad;
      const maxX = geom.centerX + maxRad;
      const minZ = geom.centerZ - maxRad;
      const maxZ = geom.centerZ + maxRad;
      return {
        minX,
        minZ,
        maxX,
        maxZ,
        width: maxRad * 2,
        height: maxRad * 2,
        centerX: geom.centerX,
        centerZ: geom.centerZ,
      };
    }
    case 'rectangle': {
      const minX = Math.min(geom.minX, geom.maxX);
      const maxX = Math.max(geom.minX, geom.maxX);
      const minZ = Math.min(geom.minZ, geom.maxZ);
      const maxZ = Math.max(geom.minZ, geom.maxZ);
      return {
        minX,
        minZ,
        maxX,
        maxZ,
        width: maxX - minX,
        height: maxZ - minZ,
        centerX: (minX + maxX) / 2,
        centerZ: (minZ + maxZ) / 2,
      };
    }
    case 'regularPolygon':
    case 'star': {
      const rad = geom.type === 'regularPolygon' ? geom.radius : geom.outerRadius;
      return {
        minX: geom.centerX - rad,
        minZ: geom.centerZ - rad,
        maxX: geom.centerX + rad,
        maxZ: geom.centerZ + rad,
        width: rad * 2,
        height: rad * 2,
        centerX: geom.centerX,
        centerZ: geom.centerZ,
      };
    }
    case 'polygon':
    case 'path':
    case 'freehand': {
      const pts: Array<{ x: number; z: number }> =
        geom.type === 'polygon' || geom.type === 'path'
          ? geom.points
          : geom.strokes;

      if (!pts || pts.length === 0) {
        return { minX: 0, minZ: 0, maxX: 0, maxZ: 0, width: 0, height: 0, centerX: 0, centerZ: 0 };
      }

      let minX = pts[0].x;
      let maxX = pts[0].x;
      let minZ = pts[0].z;
      let maxZ = pts[0].z;

      for (let i = 1; i < pts.length; i++) {
        if (pts[i].x < minX) minX = pts[i].x;
        if (pts[i].x > maxX) maxX = pts[i].x;
        if (pts[i].z < minZ) minZ = pts[i].z;
        if (pts[i].z > maxZ) maxZ = pts[i].z;
      }

      const padding = geom.type === 'path' || geom.type === 'freehand' ? geom.strokeWidth / 2 : 0;
      minX -= padding;
      maxX += padding;
      minZ -= padding;
      maxZ += padding;

      return {
        minX,
        minZ,
        maxX,
        maxZ,
        width: maxX - minX,
        height: maxZ - minZ,
        centerX: (minX + maxX) / 2,
        centerZ: (minZ + maxZ) / 2,
      };
    }
  }
}

/**
 * Tests whether a point (x, z) in world/map space is inside the continuous geometric shape.
 */
export function isPointInGeometry(x: number, z: number, geom: ContinuousGeometry): boolean {
  switch (geom.type) {
    case 'circle': {
      const dx = x - geom.centerX;
      const dz = z - geom.centerZ;
      return dx * dx + dz * dz <= geom.radius * geom.radius;
    }
    case 'ellipse': {
      let dx = x - geom.centerX;
      let dz = z - geom.centerZ;
      if (geom.rotation) {
        const rad = -geom.rotation;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rx = dx * cos - dz * sin;
        const rz = dx * sin + dz * cos;
        dx = rx;
        dz = rz;
      }
      return (dx * dx) / (geom.radiusX * geom.radiusX) + (dz * dz) / (geom.radiusZ * geom.radiusZ) <= 1.0;
    }
    case 'rectangle': {
      const minX = Math.min(geom.minX, geom.maxX);
      const maxX = Math.max(geom.minX, geom.maxX);
      const minZ = Math.min(geom.minZ, geom.maxZ);
      const maxZ = Math.max(geom.minZ, geom.maxZ);
      if (!geom.rotation) {
        return x >= minX && x <= maxX && z >= minZ && z <= maxZ;
      }
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const rad = -geom.rotation;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = (x - cx) * cos - (z - cz) * sin + cx;
      const rz = (x - cx) * sin + (z - cz) * cos + cz;
      return rx >= minX && rx <= maxX && rz >= minZ && rz <= maxZ;
    }
    case 'regularPolygon': {
      const sides = Math.max(3, geom.sides);
      const polyPts = getRegularPolygonVertices(geom.centerX, geom.centerZ, geom.radius, sides, geom.rotation || 0);
      return isPointInPolygonVertices(x, z, polyPts);
    }
    case 'star': {
      const starPts = getStarVertices(
        geom.centerX,
        geom.centerZ,
        geom.outerRadius,
        geom.innerRadius,
        geom.points,
        geom.rotation || 0
      );
      return isPointInPolygonVertices(x, z, starPts);
    }
    case 'polygon': {
      return isPointInPolygonVertices(x, z, geom.points);
    }
    case 'path':
    case 'freehand': {
      const pts = geom.type === 'path' ? geom.points : geom.strokes;
      const radius = (geom.strokeWidth || 1) / 2;
      const radiusSq = radius * radius;
      if (!pts || pts.length === 0) return false;
      if (pts.length === 1) {
        const dx = x - pts[0].x;
        const dz = z - pts[0].z;
        return dx * dx + dz * dz <= radiusSq;
      }
      // Check distance from point to all line segments
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegmentSquared(x, z, pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z) <= radiusSq) {
          return true;
        }
      }
      if (geom.type === 'path' && geom.closed && pts.length > 2) {
        if (distToSegmentSquared(x, z, pts[pts.length - 1].x, pts[pts.length - 1].z, pts[0].x, pts[0].z) <= radiusSq) {
          return true;
        }
      }
      return false;
    }
  }
}

/**
 * Standard ray-casting algorithm for point in 2D polygon
 */
export function isPointInPolygonVertices(x: number, z: number, vertices: Array<{ x: number; z: number }>): boolean {
  if (!vertices || vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, zi = vertices[i].z;
    const xj = vertices[j].x, zj = vertices[j].z;
    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes vertices for a regular N-sided polygon (triangle, diamond, hexagon, octagon, etc.)
 */
export function getRegularPolygonVertices(
  centerX: number,
  centerZ: number,
  radius: number,
  sides: number,
  rotation = 0
): Array<{ x: number; z: number }> {
  const vertices: Array<{ x: number; z: number }> = [];
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * step - Math.PI / 2;
    vertices.push({
      x: centerX + radius * Math.cos(angle),
      z: centerZ + radius * Math.sin(angle),
    });
  }
  return vertices;
}

/**
 * Computes vertices for an N-pointed star
 */
export function getStarVertices(
  centerX: number,
  centerZ: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation = 0
): Array<{ x: number; z: number }> {
  const vertices: Array<{ x: number; z: number }> = [];
  const numPts = Math.max(3, points);
  const step = Math.PI / numPts;
  for (let i = 0; i < numPts * 2; i++) {
    const angle = rotation + i * step - Math.PI / 2;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    vertices.push({
      x: centerX + r * Math.cos(angle),
      z: centerZ + r * Math.sin(angle),
    });
  }
  return vertices;
}

/**
 * Calculates squared distance from point (px, pz) to line segment (x1, z1)-(x2, z2).
 */
function distToSegmentSquared(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
  if (l2 === 0) return (px - x1) * (px - x1) + (pz - z1) * (pz - z1);
  let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projZ = z1 + t * (z2 - z1);
  return (px - projX) * (px - projX) + (pz - projZ) * (pz - projZ);
}

/**
 * Rasterizes continuous mathematical geometry against discrete grid bounds.
 * Tests each grid cell's center against the continuous geometry.
 *
 * @param geom Continuous geometry shape
 * @param gridBounds Dimensions of the map grid { width, height }
 * @param tileSize Size of each tile in world units (default 1)
 */
export function rasterizeGeometryToCells(
  geom: ContinuousGeometry,
  gridBounds: { width: number; height: number },
  tileSize = 1
): Array<{ r: number; c: number }> {
  const bbox = getGeometryBoundingBox(geom);
  const mapW = gridBounds.width;
  const mapH = gridBounds.height;

  // Convert bounding box from world/map space to integer row/col ranges
  const minC = Math.max(0, Math.floor(bbox.minX / tileSize));
  const maxC = Math.min(mapW - 1, Math.ceil(bbox.maxX / tileSize));
  const minR = Math.max(0, Math.floor(bbox.minZ / tileSize));
  const maxR = Math.min(mapH - 1, Math.ceil(bbox.maxZ / tileSize));

  const cells: Array<{ r: number; c: number }> = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      // Test cell center in world coordinates
      const cellCenterX = (c + 0.5) * tileSize;
      const cellCenterZ = (r + 0.5) * tileSize;
      if (isPointInGeometry(cellCenterX, cellCenterZ, geom)) {
        cells.push({ r, c });
      }
    }
  }

  return cells;
}

/**
 * Translates a ContinuousGeometry object by (dx, dz).
 */
export function translateGeometry(geom: ContinuousGeometry, dx: number, dz: number): ContinuousGeometry {
  switch (geom.type) {
    case 'circle':
      return { ...geom, centerX: geom.centerX + dx, centerZ: geom.centerZ + dz };
    case 'ellipse':
      return { ...geom, centerX: geom.centerX + dx, centerZ: geom.centerZ + dz };
    case 'rectangle':
      return {
        ...geom,
        minX: geom.minX + dx,
        maxX: geom.maxX + dx,
        minZ: geom.minZ + dz,
        maxZ: geom.maxZ + dz,
      };
    case 'regularPolygon':
    case 'star':
      return { ...geom, centerX: geom.centerX + dx, centerZ: geom.centerZ + dz };
    case 'polygon':
    case 'path':
      return {
        ...geom,
        points: geom.points.map((p) => ({ x: p.x + dx, z: p.z + dz })),
      };
    case 'freehand':
      return {
        ...geom,
        strokes: geom.strokes.map((s) => ({ ...s, x: s.x + dx, z: s.z + dz })),
      };
  }
}
