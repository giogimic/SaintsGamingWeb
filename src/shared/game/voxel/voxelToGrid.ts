/**
 * Saints Gaming — Voxel-To-Grid 2D Projection Utility
 *
 * Generates an authoritative 2D logic grid (number[][]) from a 3D VoxelWorldDocV3.
 * Maps 3D voxel physics and logic layers to 2D tile IDs for backward compatibility
 * with legacy systems and the Go MMO simulation backend.
 */

import { VoxelWorld, type VoxelWorldDocV3 } from './VoxelWorldDoc';
import {
  getVoxelPhysics,
  getVoxelShape,
  getVoxelLogic,
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

      // 2. Check 3D volume at player standing level (default Y=16 body, Y=15 ground)
      const bodyWord = world.getVoxel(wx, 16, wz);
      const groundWord = world.getVoxel(wx, 15, wz);

      const bodyPhys = getVoxelPhysics(bodyWord);
      const bodyShape = getVoxelShape(bodyWord);
      const bodyLogic = getVoxelLogic(bodyWord);

      const groundPhys = getVoxelPhysics(groundWord);

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
      } else if ((!groundWord || isVoxelAir(groundWord)) && !isTraversableElevation) {
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
