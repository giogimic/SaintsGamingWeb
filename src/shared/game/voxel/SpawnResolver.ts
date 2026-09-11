import { VoxelWorld, VoxelWorldDocV3 } from './VoxelWorldDoc';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';
import { extractPhysics, VOXEL_WORD_AIR_LOW, VoxelPhysics, VOXEL_MAT_WATER, VOXEL_MAT_LAVA, VOXEL_MAT_ICE } from './VoxelWord';

export interface SpawnValidationResult {
  isSafe: boolean;
  position: { x: number; y: number; z: number };
  reason?: string;
  groundHeight: number;
  headroom: number;
}

/**
 * Resolves a safe spawn point on the voxel terrain.
 * A safe spawn requires:
 * 1. Solid ground beneath the player.
 * 2. At least 2 blocks of air (headroom) above the ground.
 * 3. Ground must not be a fluid (water, lava) or a dangerous material.
 * 
 * If the exact desired X/Z is unsafe, it spirals outward to find a safe surface.
 */
export function resolveSafeVoxelSpawn(
  doc: VoxelWorldDocV3,
  desiredX: number,
  desiredZ: number,
  maxSearchRadius = 32
): SpawnValidationResult {
  const world = VoxelWorld.deserializeFromDoc(doc);
  const heightChunks = doc.dimensions.heightChunks;

  const checkColumn = (x: number, z: number): SpawnValidationResult | null => {
    const cx = Math.floor(x / CHUNK_SIZE_X);
    const cz = Math.floor(z / CHUNK_SIZE_Z);
    const lx = x - (cx * CHUNK_SIZE_X);
    const lz = z - (cz * CHUNK_SIZE_Z);

    let highestSolidY = -1;
    let highestSolidWord = { low: VOXEL_WORD_AIR_LOW, high: 0 };
    let headroom = 0;

    // Scan chunks from top to bottom
    for (let cy = heightChunks - 1; cy >= 0; cy--) {
      const chunkKey = VoxelChunk.getChunkKey(cx, cz, cy);
      const chunkData = world.chunks.get(chunkKey);
      
      if (!chunkData) {
        continue;
      }

      for (let ly = CHUNK_SIZE_Y - 1; ly >= 0; ly--) {
        const idx = VoxelChunk.getIndex(lx, ly, lz);
        const low = chunkData.dataLow[idx];
        const high = chunkData.dataHigh[idx];

        if (low !== VOXEL_WORD_AIR_LOW) {
          const phys = (high >>> 8) & 0x0f; // extractPhysics
          
          if (phys !== VoxelPhysics.SWIMMABLE_FLUID) {
            // Found highest solid
            highestSolidY = (cy * CHUNK_SIZE_Y) + ly;
            highestSolidWord = { low, high };
            break;
          }
        } else {
           if (highestSolidY === -1) {
             headroom++;
           }
        }
      }
      
      if (highestSolidY !== -1) {
        break;
      }
    }

    if (highestSolidY === -1) {
      return { isSafe: false, position: { x, y: 0, z }, groundHeight: -1, headroom: 0, reason: 'No solid ground found (void)' };
    }

    const mat = highestSolidWord.low & 0xff; // extractMaterialId
    const phys = (highestSolidWord.high >>> 8) & 0x0f; // extractPhysics

    if (phys === VoxelPhysics.SWIMMABLE_FLUID || mat === VOXEL_MAT_WATER || mat === VOXEL_MAT_LAVA) {
      return { isSafe: false, position: { x, y: highestSolidY, z }, groundHeight: highestSolidY, headroom, reason: 'Ground is fluid' };
    }

    if (headroom < 2) {
      return { isSafe: false, position: { x, y: highestSolidY, z }, groundHeight: highestSolidY, headroom, reason: 'Insufficient headroom (need 2 blocks)' };
    }

    return {
      isSafe: true,
      position: { x, y: highestSolidY + 1, z },
      groundHeight: highestSolidY,
      headroom,
    };
  };

  let currentX = desiredX;
  let currentZ = desiredZ;
  let dx = 1;
  let dz = 0;
  let segmentLength = 1;
  let segmentPassed = 0;

  for (let i = 0; i < (maxSearchRadius * maxSearchRadius); i++) {
    const res = checkColumn(currentX, currentZ);
    if (res && res.isSafe) {
      return res;
    }

    currentX += dx;
    currentZ += dz;
    segmentPassed++;
    
    if (segmentPassed === segmentLength) {
      segmentPassed = 0;
      const temp = dx;
      dx = -dz;
      dz = temp;
      if (dz === 0) {
        segmentLength++;
      }
    }
  }

  return {
    isSafe: false,
    position: { x: desiredX, y: 16, z: desiredZ },
    groundHeight: -1,
    headroom: 0,
    reason: `Could not find a safe surface within ${maxSearchRadius} blocks.`,
  };
}
