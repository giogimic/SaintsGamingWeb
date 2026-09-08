/**
 * Saints Gaming — Voxel-To-Grid 2D Projection Utility
 *
 * Generates an authoritative 2D logic grid (number[][]) from a 3D VoxelWorldDocV3.
 * Maps 3D voxel physics and logic layers to 2D tile IDs for backward compatibility
 * with legacy systems and the Go MMO simulation backend.
 */

import { VoxelWorld, type VoxelWorldDocV3 } from './VoxelWorldDoc';
import {
  extractPhysics,
  extractShapeId,
  extractLogic,
  isVoxelAir,
  VoxelPhysics,
  VoxelShape,
  VoxelLogic,
} from './VoxelWord';

export const TILE_LOGIC_WALK = 0;
export const TILE_LOGIC_WALL = 1;
export const TILE_LOGIC_GRASS = 2;
export const TILE_LOGIC_TREE = 5;
export const TILE_LOGIC_ORE = 6;
export const TILE_LOGIC_SHOP = 7;
export const TILE_LOGIC_WATER = 10;
export const TILE_LOGIC_HAZARD = 11;

/**
 * Generates a 2D logic grid from a 3D VoxelWorldDocV3.
 * Height rows (y) × Width columns (x).
 */
export function generateGridFromVoxelDoc(
  doc: VoxelWorldDocV3,
  targetWidth?: number,
  targetHeight?: number
): number[][] {
  const world = VoxelWorld.deserializeFromDoc(doc);
  const width = Math.max(1, targetWidth ?? doc.mapWidth ?? world.totalWidthBlocks);
  const height = Math.max(1, targetHeight ?? doc.mapHeight ?? world.totalDepthBlocks);

  const grid: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    // Voxel Z axis maps to (height - 1 - y)
    const wz = height - 1 - y;

    for (let x = 0; x < width; x++) {
      const wx = x;

      // 1. Boundary walls if on extreme perimeter
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        row.push(TILE_LOGIC_WALL);
        continue;
      }

      let groundY = -1;
      for (let wy = world.totalHeightBlocks - 1; wy >= 0; wy--) {
        const { low, high } = world.getVoxel(wx, wy, wz);
        if (low !== undefined && !isVoxelAir(low)) {
          groundY = wy;
          break;
        }
      }

      const bodyWord = groundY >= 0 ? world.getVoxel(wx, groundY + 1, wz) : { low: 0, high: 0 };
      const groundWord = groundY >= 0 ? world.getVoxel(wx, groundY, wz) : { low: 0, high: 0 };

      const bodyPhys = extractPhysics(bodyWord.high);
      const bodyShape = extractShapeId(bodyWord.low);
      const bodyLogic = extractLogic(bodyWord.high);

      const groundPhys = extractPhysics(groundWord.high);

      // Traversable elevations (slopes, stairs, bottom slabs) allow stepping up
      const isTraversableElevation =
        bodyPhys === VoxelPhysics.WALKABLE_SLOPE ||
        bodyShape === VoxelShape.STAIRS_STRAIGHT ||
        bodyShape === VoxelShape.STAIRS_CORNER ||
        bodyShape === VoxelShape.SLAB_BOTTOM;

      if ((bodyPhys === VoxelPhysics.SOLID_OBSTACLE || bodyPhys === VoxelPhysics.HAZARD) && !isTraversableElevation) {
        // Obstructed by solid block
        row.push(TILE_LOGIC_WALL);
      } else if (bodyLogic === VoxelLogic.SHOP_COUNTER) {
        row.push(TILE_LOGIC_SHOP);
      } else if (bodyLogic === VoxelLogic.HARVEST_NODE) {
        row.push(TILE_LOGIC_ORE);
      } else if (groundPhys === VoxelPhysics.SWIMMABLE_FLUID || bodyPhys === VoxelPhysics.SWIMMABLE_FLUID) {
        row.push(TILE_LOGIC_WATER);
      } else if (groundPhys === VoxelPhysics.HAZARD || bodyPhys === VoxelPhysics.HAZARD) {
        row.push(TILE_LOGIC_HAZARD);
      } else if ((!groundWord.low || isVoxelAir(groundWord.low)) && !isTraversableElevation) {
        // Void/Pit: no ground support
        row.push(TILE_LOGIC_WALL);
      } else {
        // Open walkable terrain
        row.push(TILE_LOGIC_WALK);
      }
    }
    grid.push(row);
  }

  return grid;
}
