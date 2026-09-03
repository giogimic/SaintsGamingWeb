/**
 * Saints Gaming — Procedural Voxel Chunk Generator
 *
 * Evaluates continuous fractal terrain heights and populates 32³ voxel chunks
 * with depth-indexed geological strata (surface, subsurface, mantle, bedrock).
 */

import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from '../voxel/VoxelChunk';
import { packVoxel, VoxelPhysics, VoxelShape, VOXEL_WORD_AIR } from '../voxel/VoxelWord';
import { BiomeDefinition } from './biomeSchema';
import { SimplexNoise2D } from './simplexNoise';

export class ProceduralVoxelGenerator {
  private noise: SimplexNoise2D;
  private currentBiome: BiomeDefinition;

  constructor(biome: BiomeDefinition) {
    this.currentBiome = biome;
    this.noise = new SimplexNoise2D(biome.seed);
  }

  public setBiome(biome: BiomeDefinition): void {
    this.currentBiome = biome;
    this.noise.reseed(biome.seed);
  }

  /**
   * Evaluates the continuous terrain surface elevation at world (wx, wz).
   */
  public getSurfaceHeight(wx: number, wz: number): number {
    const offset = this.noise.fBm(wx, wz, this.currentBiome.terrain);
    const height = Math.round(this.currentBiome.terrain.baseHeight + offset);
    return Math.max(1, Math.min(31, height));
  }

  /**
   * Generates volumetric voxel data for a 32³ chunk according to biome strata rules.
   */
  public populateChunk(cx: number, cz: number, cy: number, chunk: VoxelChunk): void {
    const startWX = cx * CHUNK_SIZE_X;
    const startWY = cy * CHUNK_SIZE_Y;
    const startWZ = cz * CHUNK_SIZE_Z;

    const strata = this.currentBiome.strata;

    const surfaceWord = packVoxel(strata.surfaceMaterial, VoxelShape.FULL_CUBE, 0, VoxelPhysics.SOLID_OBSTACLE);
    const subsurfaceWord = packVoxel(strata.subsurfaceMaterial, VoxelShape.FULL_CUBE, 0, VoxelPhysics.SOLID_OBSTACLE);
    const mantleWord = packVoxel(strata.mantleMaterial, VoxelShape.FULL_CUBE, 0, VoxelPhysics.SOLID_OBSTACLE);
    const bedrockWord = packVoxel(strata.bedrockMaterial, VoxelShape.FULL_CUBE, 0, VoxelPhysics.SOLID_OBSTACLE);

    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      const wz = startWZ + lz;
      for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
        const wx = startWX + lx;
        const surfaceH = this.getSurfaceHeight(wx, wz);

        for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
          const wy = startWY + ly;

          if (wy > surfaceH) {
            chunk.set(lx, ly, lz, VOXEL_WORD_AIR);
          } else if (wy === 0) {
            // Bedrock layer
            chunk.set(lx, ly, lz, bedrockWord);
          } else {
            const depth = surfaceH - wy;
            if (depth === 0) {
              chunk.set(lx, ly, lz, surfaceWord);
            } else if (depth <= strata.subsurfaceDepth) {
              chunk.set(lx, ly, lz, subsurfaceWord);
            } else {
              chunk.set(lx, ly, lz, mantleWord);
            }
          }
        }
      }
    }

    chunk.isDirty = true;
  }
}
