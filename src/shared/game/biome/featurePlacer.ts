import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from '../voxel/VoxelChunk';
import { BiomeDefinition } from './biomeSchema';
import { VOXEL_MAT_WOOD, VOXEL_WORD_AIR, VOXEL_MAT_GRASS, VOXEL_MAT_SAND, VOXEL_MAT_SNOW } from '../voxel/VoxelWord';

// Simple Linear Congruential Generator (LCG) for deterministic pseudo-random numbers
class PRNG {
  private seed: number;
  constructor(seed: number) {
    this.seed = (seed ^ 0xdeadbeef) >>> 0;
  }
  public nextFloat(): number {
    this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
}

export class FeaturePlacer {
  /**
   * Deterministically places features (like trees, rocks) into the chunk.
   * This is called AFTER the base terrain is generated for the chunk.
   */
  public static placeFeatures(chunk: VoxelChunk, globalSeed: number, biome: BiomeDefinition): void {
    const chunkSeed = globalSeed ^ (chunk.cx * 73856093) ^ (chunk.cz * 19126627);
    const prng = new PRNG(chunkSeed);

    const { spawnableFlora } = biome.features;
    if (!spawnableFlora || spawnableFlora.length === 0) return;

    // We can roll a few attempts per chunk to spawn something
    const ATTEMPTS = 5;

    for (let i = 0; i < ATTEMPTS; i++) {
      // Pick a random surface X, Z within the chunk
      const lx = Math.floor(prng.nextFloat() * CHUNK_SIZE_X);
      const lz = Math.floor(prng.nextFloat() * CHUNK_SIZE_Z);

      // Find the surface Y
      let surfaceY = -1;
      let surfaceMat = VOXEL_WORD_AIR;
      for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
        const mat = chunk.get(lx, y, lz);
        if (mat !== VOXEL_WORD_AIR) {
          surfaceY = y;
          surfaceMat = mat;
          break;
        }
      }

      if (surfaceY === -1 || surfaceY >= CHUNK_SIZE_Y - 5) continue; // No space

      // Choose a feature based on weights
      let totalWeight = 0;
      for (const flora of spawnableFlora) totalWeight += flora.weight;
      if (totalWeight === 0) continue;

      let roll = prng.nextFloat() * totalWeight;
      let selectedFeature: string | null = null;
      for (const flora of spawnableFlora) {
        if (roll < flora.weight) {
          selectedFeature = flora.featureId;
          break;
        }
        roll -= flora.weight;
      }

      if (!selectedFeature) continue;

      // Place the feature
      this.placeFeatureAt(chunk, lx, surfaceY, lz, surfaceMat, selectedFeature, prng);
    }
  }

  private static placeFeatureAt(chunk: VoxelChunk, lx: number, surfaceY: number, lz: number, surfaceMat: number, featureId: string, prng: PRNG): void {
    // Simple feature catalog for demo purposes
    if (featureId === 'oak_tree' && surfaceMat === VOXEL_MAT_GRASS) {
      // Trunk
      const height = 3 + Math.floor(prng.nextFloat() * 3); // 3 to 5 tall
      for (let y = 1; y <= height; y++) {
        if (surfaceY + y < CHUNK_SIZE_Y) {
          chunk.set(lx, surfaceY + y, lz, VOXEL_MAT_WOOD);
        }
      }
      // Leaves (mock using grass material for now)
      if (surfaceY + height + 1 < CHUNK_SIZE_Y) {
         chunk.set(lx, surfaceY + height + 1, lz, VOXEL_MAT_GRASS);
         if (lx > 0) chunk.set(lx - 1, surfaceY + height, lz, VOXEL_MAT_GRASS);
         if (lx < CHUNK_SIZE_X - 1) chunk.set(lx + 1, surfaceY + height, lz, VOXEL_MAT_GRASS);
         if (lz > 0) chunk.set(lx, surfaceY + height, lz - 1, VOXEL_MAT_GRASS);
         if (lz < CHUNK_SIZE_Z - 1) chunk.set(lx, surfaceY + height, lz + 1, VOXEL_MAT_GRASS);
      }
    } 
    else if (featureId === 'cactus' && surfaceMat === VOXEL_MAT_SAND) {
      const height = 2 + Math.floor(prng.nextFloat() * 3);
      for (let y = 1; y <= height; y++) {
        if (surfaceY + y < CHUNK_SIZE_Y) {
          chunk.set(lx, surfaceY + y, lz, VOXEL_MAT_GRASS); // Using grass as green cactus placeholder
        }
      }
    }
    else if (featureId === 'pine_tree' && surfaceMat === VOXEL_MAT_SNOW) {
      const height = 4 + Math.floor(prng.nextFloat() * 3);
      for (let y = 1; y <= height; y++) {
        if (surfaceY + y < CHUNK_SIZE_Y) {
          chunk.set(lx, surfaceY + y, lz, VOXEL_MAT_WOOD);
        }
      }
    }
  }
}
