import { VoxelWorld } from './VoxelWorldDoc';
import { 
  VoxelShape, 
  VoxelOrientation, 
  isVoxelSolid, 
  isVoxelAir, 
  packVoxel, 
  getVoxelMaterial,
  VoxelPhysics,
  VoxelShapeType,
  VoxelOrientationType,
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE
} from './VoxelWord';

export interface SlopeResolution {
  shapeId: VoxelShapeType;
  orientation: VoxelOrientationType;
}

/**
 * Deterministically resolves slope / ramp / corner shapes based on 3D neighborhood.
 */
export function resolveSlopeShape(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number
): SlopeResolution {
  const current = world.getVoxel(wx, wy, wz);
  if (!isVoxelSolid(current)) {
    return { shapeId: VoxelShape.AIR, orientation: VoxelOrientation.NORTH };
  }

  // Block above must be air for this to be a slope roof/ramp
  const above = world.getVoxel(wx, wy + 1, wz);
  if (isVoxelSolid(above)) {
    return { shapeId: VoxelShape.FULL_CUBE, orientation: VoxelOrientation.NORTH };
  }

  // Check 4 cardinal neighbors at same height Y
  const northSolid = isVoxelSolid(world.getVoxel(wx, wy, wz + 1));
  const southSolid = isVoxelSolid(world.getVoxel(wx, wy, wz - 1));
  const eastSolid = isVoxelSolid(world.getVoxel(wx + 1, wy, wz));
  const westSolid = isVoxelSolid(world.getVoxel(wx - 1, wy, wz));

  // Check 4 cardinal neighbors at Y - 1 (below)
  const northBelowAir = isVoxelAir(world.getVoxel(wx, wy - 1, wz + 1));
  const southBelowAir = isVoxelAir(world.getVoxel(wx, wy - 1, wz - 1));
  const eastBelowAir = isVoxelAir(world.getVoxel(wx + 1, wy - 1, wz));
  const westBelowAir = isVoxelAir(world.getVoxel(wx - 1, wy - 1, wz));

  // Standard Straight 45 Slopes (High back, Low front)
  if (northSolid && !southSolid && !eastSolid && !westSolid) {
    return { shapeId: VoxelShape.SLOPE_45, orientation: VoxelOrientation.SOUTH };
  }
  if (southSolid && !northSolid && !eastSolid && !westSolid) {
    return { shapeId: VoxelShape.SLOPE_45, orientation: VoxelOrientation.NORTH };
  }
  if (westSolid && !eastSolid && !northSolid && !southSolid) {
    return { shapeId: VoxelShape.SLOPE_45, orientation: VoxelOrientation.EAST };
  }
  if (eastSolid && !westSolid && !northSolid && !southSolid) {
    return { shapeId: VoxelShape.SLOPE_45, orientation: VoxelOrientation.WEST };
  }

  // Outer Corner Slopes (2 adjacent open sides)
  if (northSolid && westSolid && !southSolid && !eastSolid) {
    return { shapeId: VoxelShape.SLOPE_CORNER_OUTER, orientation: VoxelOrientation.SOUTH };
  }
  if (northSolid && eastSolid && !southSolid && !westSolid) {
    return { shapeId: VoxelShape.SLOPE_CORNER_OUTER, orientation: VoxelOrientation.WEST };
  }
  if (southSolid && westSolid && !northSolid && !eastSolid) {
    return { shapeId: VoxelShape.SLOPE_CORNER_OUTER, orientation: VoxelOrientation.EAST };
  }
  if (southSolid && eastSolid && !northSolid && !westSolid) {
    return { shapeId: VoxelShape.SLOPE_CORNER_OUTER, orientation: VoxelOrientation.NORTH };
  }

  return { shapeId: VoxelShape.FULL_CUBE, orientation: VoxelOrientation.NORTH };
}

/**
 * Smart Terrain Rule: Automatically assigns surface cap, sub-surface dirt, and base stone.
 */
export function resolveTerrainStratigraphy(
  world: VoxelWorld,
  wx: number,
  wy: number,
  wz: number,
  topMaterial: number = VOXEL_MAT_GRASS
): number {
  // Count how many solid blocks are above this voxel
  let solidAboveCount = 0;
  for (let y = wy + 1; y < world.totalHeightBlocks; y++) {
    if (isVoxelSolid(world.getVoxel(wx, y, wz))) {
      solidAboveCount++;
    } else {
      break;
    }
  }

  if (solidAboveCount === 0) {
    // Top surface layer
    const slope = resolveSlopeShape(world, wx, wy, wz);
    return packVoxel(
      topMaterial,
      slope.shapeId,
      slope.orientation,
      0,
      slope.shapeId === VoxelShape.SLOPE_45 ? VoxelPhysics.WALKABLE_SLOPE : VoxelPhysics.SOLID_OBSTACLE
    );
  } else if (solidAboveCount <= 2) {
    // Subsurface dirt layer (1-2 blocks under)
    return packVoxel(VOXEL_MAT_DIRT, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH);
  } else {
    // Deep stone layer (3+ blocks under)
    return packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH);
  }
}
