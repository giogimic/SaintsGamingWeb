/**
 * Saints Gaming — Unified Editor Cursor & Hit-Testing Abstraction
 *
 * Provides a single coordinate model across 2D grid, 2.5D freeform, and 3D scenes.
 * Handles continuous world coordinates, surface hits, explicit anchor/pivot math,
 * and optional on-demand grid snapping.
 */

import { TransformPivot, DEFAULT_TRANSFORM_PIVOT } from './continuousGeometry';

export interface EditorCursorHit {
  /** Continuous world-space hit coordinate (x, y, z) */
  worldX: number;
  worldY: number;
  worldZ: number;

  /** Surface normal at the hit location */
  normalX: number;
  normalY: number;
  normalZ: number;

  /** Continuous map-space coordinates (where top-left is 0.0, 0.0) */
  mapSpaceX: number;
  mapSpaceZ: number;

  /** Derived integer and center-aligned grid projections */
  snapped: {
    r: number;
    c: number;
    worldX: number;
    worldZ: number;
  };

  /** Whether the continuous cursor falls within the playable/editor map bounds */
  isInsideBounds: boolean;
}

/**
 * Creates a continuous EditorCursorHit from a Babylon.js 3D world intersection point.
 *
 * @param worldX World X coordinate
 * @param worldY World Y (altitude)
 * @param worldZ World Z coordinate
 * @param mapWidth Map width in tiles
 * @param mapHeight Map height in tiles
 * @param tileSize Tile size in world units (default 1)
 * @param normal Optional surface normal
 */
export function createEditorCursorHit(
  worldX: number,
  worldY: number,
  worldZ: number,
  mapWidth: number,
  mapHeight: number,
  tileSize = 1,
  normal = { x: 0, y: 1, z: 0 }
): EditorCursorHit {
  const mapSpaceX = worldX / tileSize + mapWidth / 2;
  const mapSpaceZ = mapHeight / 2 - worldZ / tileSize;

  const r = Math.floor(mapSpaceZ);
  const c = Math.floor(mapSpaceX);

  const snappedWorldX = (c + 0.5 - mapWidth / 2) * tileSize;
  const snappedWorldZ = (mapHeight / 2 - (r + 0.5)) * tileSize;

  const isInsideBounds = r >= 0 && r < mapHeight && c >= 0 && c < mapWidth;

  return {
    worldX,
    worldY,
    worldZ,
    normalX: normal.x,
    normalY: normal.y,
    normalZ: normal.z,
    mapSpaceX,
    mapSpaceZ,
    snapped: {
      r,
      c,
      worldX: snappedWorldX,
      worldZ: snappedWorldZ,
    },
    isInsideBounds,
  };
}

/**
 * Calculates world-space placement position for an object with dimensions (w, h)
 * given a cursor position and transform pivot.
 *
 * @param cursorX Continuous cursor world X
 * @param cursorZ Continuous cursor world Z
 * @param width Width in world units
 * @param height Height/depth in world units
 * @param pivot Transform pivot / anchor configuration (default 0.5, 0.5 center)
 * @param rotation Rotation in radians (optional)
 */
export function calculatePivotOffsetPosition(
  cursorX: number,
  cursorZ: number,
  width: number,
  height: number,
  pivot: TransformPivot = DEFAULT_TRANSFORM_PIVOT,
  rotation = 0
): { x: number; z: number } {
  // Offset relative to top-left of the bounding box
  const localOffsetX = width * pivot.anchorX + pivot.offsetX;
  const localOffsetZ = height * pivot.anchorZ + pivot.offsetZ;

  if (rotation === 0) {
    return {
      x: cursorX - localOffsetX + width / 2,
      z: cursorZ + localOffsetZ - height / 2,
    };
  }

  // Rotate offset vector
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rx = localOffsetX * cos - localOffsetZ * sin;
  const rz = localOffsetX * sin + localOffsetZ * cos;

  return {
    x: cursorX - rx + width / 2,
    z: cursorZ + rz - height / 2,
  };
}
