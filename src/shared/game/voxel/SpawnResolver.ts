import { VoxelWorld, VoxelWorldDocV3 } from './VoxelWorldDoc';
import { isVoxelAir, isVoxelSolid, extractPhysics, VoxelPhysics, VOXEL_MAT_WATER, VOXEL_MAT_LAVA } from './VoxelWord';

export interface SpawnValidationResult {
  isSafe: boolean;
  position: { x: number; y: number; z: number };
  reason?: string;
  groundHeight: number;
  headroom: number;
}

/** True when the standard player capsule can occupy the supplied voxel-space point. */
export function isVoxelCharacterPositionClear(
  world: VoxelWorld,
  position: { x: number; y: number; z: number },
  width = 0.6,
  height = 1.8,
  depth = 0.6,
): boolean {
  if (
    !Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z) ||
    position.x - width / 2 < 0 || position.x + width / 2 > world.totalWidthBlocks ||
    position.z - depth / 2 < 0 || position.z + depth / 2 > world.totalDepthBlocks ||
    position.y < 0 || position.y + height > world.totalHeightBlocks
  ) {
    return false;
  }

  const minX = Math.floor(position.x - width / 2);
  const maxX = Math.floor(position.x + width / 2 - 1e-6);
  const minY = Math.floor(position.y);
  const maxY = Math.floor(position.y + height - 1e-6);
  const minZ = Math.floor(position.z - depth / 2);
  const maxZ = Math.floor(position.z + depth / 2 - 1e-6);
  for (let y = minY; y <= maxY; y++) {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const voxel = world.getVoxel(x, y, z);
        if (!isVoxelAir(voxel.low) && isVoxelSolid(voxel.high)) return false;
      }
    }
  }
  return true;
}

/**
 * Finds a column with solid, non-hazardous ground and two clear blocks for the
 * player capsule. Coordinates and the returned Y are voxel-space values.
 */
export function resolveSafeVoxelSpawnInWorld(
  world: VoxelWorld,
  desiredX: number,
  desiredZ: number,
  maxSearchRadius = 32
): SpawnValidationResult {
  const checkColumn = (x: number, z: number): SpawnValidationResult | null => {
    if (
      !Number.isInteger(x) || !Number.isInteger(z) ||
      x < 0 || z < 0 || x >= world.totalWidthBlocks || z >= world.totalDepthBlocks
    ) {
      return null;
    }

    let groundY = -1;
    let groundLow = 0;
    let groundHigh = 0;

    for (let y = world.totalHeightBlocks - 1; y >= 0; y--) {
      const voxel = world.getVoxel(x, y, z);
      if (isVoxelAir(voxel.low) || !isVoxelSolid(voxel.high)) continue;
      groundY = y;
      groundLow = voxel.low;
      groundHigh = voxel.high;
      break;
    }

    if (groundY < 0) return null;

    const physics = extractPhysics(groundHigh);
    const materialId = groundLow & 0xff;
    if (
      physics === VoxelPhysics.SWIMMABLE_FLUID ||
      physics === VoxelPhysics.HAZARD ||
      materialId === VOXEL_MAT_WATER ||
      materialId === VOXEL_MAT_LAVA
    ) {
      return null;
    }

    let headroom = 0;
    for (let y = groundY + 1; y < world.totalHeightBlocks; y++) {
      const voxel = world.getVoxel(x, y, z);
      if (!isVoxelAir(voxel.low)) return null;
      headroom++;
    }

    if (headroom < 2) return null;
    return {
      isSafe: true,
      position: { x, y: groundY + 1, z },
      groundHeight: groundY,
      headroom,
    };
  };

  const safeDesiredX = Math.floor(desiredX);
  const safeDesiredZ = Math.floor(desiredZ);
  for (let radius = 0; radius <= maxSearchRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const result = checkColumn(safeDesiredX + dx, safeDesiredZ + dz);
        if (result) return result;
      }
    }
  }

  return {
    isSafe: false,
    position: { x: safeDesiredX, y: Math.min(16, world.totalHeightBlocks - 1), z: safeDesiredZ },
    groundHeight: -1,
    headroom: 0,
    reason: `Could not find safe ground within ${maxSearchRadius} blocks.`,
  };
}

/** Resolves the safe spawn point from a serialized voxel world document. */
export function resolveSafeVoxelSpawn(
  doc: VoxelWorldDocV3,
  desiredX: number,
  desiredZ: number,
  maxSearchRadius = 32
): SpawnValidationResult {
  return resolveSafeVoxelSpawnInWorld(
    VoxelWorld.deserializeFromDoc(doc),
    desiredX,
    desiredZ,
    maxSearchRadius,
  );
}
