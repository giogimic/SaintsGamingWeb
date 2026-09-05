import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from '@/shared/game/voxel/VoxelChunk';
import { SimplexNoise2D } from '@/shared/game/biome/simplexNoise';
import { BiomeDefinition, CANONICAL_BIOMES } from '@/shared/game/biome/biomeSchema';
import {
  VOXEL_MAT_GRASS,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_STONE,
  VOXEL_MAT_GUNMETAL,
  VOXEL_MAT_SAND,
  VOXEL_MAT_SNOW,
  VOXEL_MAT_ICE,
  VOXEL_MAT_WOOD,
  VOXEL_WORD_AIR
} from '@/shared/game/voxel/VoxelWord';
import { FeaturePlacer } from '@/shared/game/biome/featurePlacer';

/**
 * Authoritative Server-Side Procedural Terrain Generator
 * Uses shared deterministic SimplexNoise and Biome Strata configs to generate chunks mathematically.
 */
export class ProceduralGenerator {
  private baseSeed: number;
  private noiseTemp: SimplexNoise2D;
  private noiseMoist: SimplexNoise2D;
  // Fallback map of noise instances per biome seed if needed, but usually we just use the global seed for noise.
  private noiseElevation: SimplexNoise2D; 

  constructor(seed: number) {
    this.baseSeed = seed;
    // Offset the seeds slightly so the noise maps don't overlap exactly
    this.noiseTemp = new SimplexNoise2D(seed + 100);
    this.noiseMoist = new SimplexNoise2D(seed + 200);
    this.noiseElevation = new SimplexNoise2D(seed);
  }

  /**
   * Determine the biome at a specific world coordinate by evaluating Climate noise.
   */
  public getBiomeAt(wx: number, wz: number): BiomeDefinition {
    // Generate raw noise values [-1 .. 1]
    const rawTemp = this.noiseTemp.noise2D(wx * 0.005, wz * 0.005);
    const rawMoist = this.noiseMoist.noise2D(wx * 0.005, wz * 0.005);
    
    // Normalize to [0 .. 1]
    const temp = (rawTemp / 70.0 + 1) / 2;
    const moist = (rawMoist / 70.0 + 1) / 2;

    // Find the best fitting biome
    let bestBiome: BiomeDefinition = CANONICAL_BIOMES.emerald_plains;
    let bestScore = Infinity;

    for (const key of Object.keys(CANONICAL_BIOMES)) {
      const biome = CANONICAL_BIOMES[key];
      const { minTemp, maxTemp, minMoisture, maxMoisture } = biome.climate;
      
      // Calculate distance to the biome's climate rectangle
      let dTemp = 0;
      if (temp < minTemp) dTemp = minTemp - temp;
      else if (temp > maxTemp) dTemp = temp - maxTemp;
      
      let dMoist = 0;
      if (moist < minMoisture) dMoist = minMoisture - moist;
      else if (moist > maxMoisture) dMoist = moist - maxMoisture;

      const score = Math.sqrt(dTemp * dTemp + dMoist * dMoist);
      
      if (score < bestScore) {
        bestScore = score;
        bestBiome = biome;
      }
    }

    return bestBiome;
  }

  /**
   * Generates a fully populated 32x32x32 VoxelChunk.
   */
  public generateChunk(cx: number, cz: number, cy: number = 0): VoxelChunk {
    const chunk = new VoxelChunk(cx, cz, cy);
    const maxWorldH = CHUNK_SIZE_Y; // Currently rendering single vertical chunks for demo

    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        // Global coordinates for noise
        const worldX = (cx * CHUNK_SIZE_X) + x;
        const worldZ = (cz * CHUNK_SIZE_Z) + z;

        // Get biome for this exact column
        const biome = this.getBiomeAt(worldX, worldZ);
        const { terrain, strata } = biome;

        // Calculate elevation at this column
        const offset = this.noiseElevation.fBm(worldX, worldZ, terrain);
        const surfaceY = Math.round(terrain.baseHeight + offset);
        const clampedY = Math.max(1, Math.min(31, surfaceY));

        // Draw the vertical strata column from surface down to bedrock
        for (let y = clampedY; y >= 0; y--) {
          const depth = clampedY - y;
          
          let materialId = VOXEL_WORD_AIR;
          
          if (y === 0) {
            materialId = strata.bedrockMaterial;
          } else if (depth === 0) {
            materialId = strata.surfaceMaterial;
          } else if (depth <= strata.subsurfaceDepth) {
            materialId = strata.subsurfaceMaterial;
          } else {
            materialId = strata.mantleMaterial;
          }

          chunk.set(x, y, z, materialId);
        }
      }
    }

    // Place features (trees, rocks, etc.) deterministically based on chunk seed and biome
    // We use the biome at the center of the chunk for feature spawning logic
    const centerBiome = this.getBiomeAt(cx * CHUNK_SIZE_X + CHUNK_SIZE_X / 2, cz * CHUNK_SIZE_Z + CHUNK_SIZE_Z / 2);
    FeaturePlacer.placeFeatures(chunk, this.baseSeed, centerBiome);

    // Since this is fresh procedural data, it doesn't need to trigger a database save yet
    chunk.isDirty = false;
    return chunk;
  }

  /**
   * Stub for blending a handcrafted POI chunk seamlessly into surrounding procedural terrain.
   */
  public blendHandcraftedEdges(poiChunk: VoxelChunk): VoxelChunk {
    // Basic smoothing logic would go here: evaluating the edges of the POI chunk
    // and sloping the heights to match the procedural noise expectations.
    // For now, we return the POI chunk intact.
    return poiChunk;
  }
}
