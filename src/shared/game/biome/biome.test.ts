import { describe, it, expect } from 'vitest';
import { SimplexNoise2D } from './simplexNoise';
import { CANONICAL_BIOMES } from './biomeSchema';
import { ProceduralVoxelGenerator } from './proceduralGenerator';
import { VoxelChunk } from '../voxel/VoxelChunk';
import { extractMaterialId, isVoxelAir } from '../voxel/VoxelWord';

describe('Biome Procedural Generation & Simplex Noise', () => {
  it('SimplexNoise2D produces deterministic, seed-dependent results', () => {
    const noiseA = new SimplexNoise2D(12345);
    const noiseB = new SimplexNoise2D(12345);
    const noiseC = new SimplexNoise2D(54321);

    const valA = noiseA.noise2D(12.5, 48.2);
    const valB = noiseB.noise2D(12.5, 48.2);
    const valC = noiseC.noise2D(12.5, 48.2);

    expect(valA).toBe(valB); // Exact determinism
    expect(valA).not.toBe(valC); // Seed sensitivity
    expect(valA).toBeGreaterThanOrEqual(-1.0);
    expect(valA).toBeLessThanOrEqual(1.0);
  });

  it('generates procedural chunks adhering to depth-indexed geological strata', () => {
    const biome = CANONICAL_BIOMES.emerald_plains;
    const generator = new ProceduralVoxelGenerator(biome);

    const chunk = new VoxelChunk(0, 0, 0);
    generator.populateChunk(0, 0, 0, chunk);

    // Test a vertical column at (lx = 10, lz = 10)
    const surfaceH = generator.getSurfaceHeight(10, 10);
    expect(surfaceH).toBeGreaterThanOrEqual(10);
    expect(surfaceH).toBeLessThanOrEqual(24);

    // 1. Air above surface
    for (let wy = surfaceH + 1; wy < 32; wy++) {
      const wordLow = chunk.getLow(10, wy, 10);
      expect(isVoxelAir(wordLow)).toBe(true);
    }

    // 2. Surface layer (Grass)
    const surfaceWordLow = chunk.getLow(10, surfaceH, 10);
    expect(extractMaterialId(surfaceWordLow)).toBe(biome.strata.surfaceMaterial);

    // 3. Subsurface layer (Dirt) for depth 1..3
    for (let d = 1; d <= biome.strata.subsurfaceDepth; d++) {
      const subWordLow = chunk.getLow(10, surfaceH - d, 10);
      expect(extractMaterialId(subWordLow)).toBe(biome.strata.subsurfaceMaterial);
    }

    // 4. Mantle layer (Stone) below subsurface
    const mantleWordLow = chunk.getLow(10, surfaceH - biome.strata.subsurfaceDepth - 1, 10);
    expect(extractMaterialId(mantleWordLow)).toBe(biome.strata.mantleMaterial);

    // 5. Bedrock foundation at wy = 0
    const bedrockWordLow = chunk.getLow(10, 0, 10);
    expect(extractMaterialId(bedrockWordLow)).toBe(biome.strata.bedrockMaterial);
  });

  it('switches between distinct canonical biomes cleanly', () => {
    const plainsGen = new ProceduralVoxelGenerator(CANONICAL_BIOMES.emerald_plains);
    const dunesGen = new ProceduralVoxelGenerator(CANONICAL_BIOMES.golden_dunes);

    const plainsChunk = new VoxelChunk(0, 0, 0);
    const dunesChunk = new VoxelChunk(0, 0, 0);

    plainsGen.populateChunk(0, 0, 0, plainsChunk);
    dunesGen.populateChunk(0, 0, 0, dunesChunk);

    const plainsSurface = plainsChunk.getLow(5, plainsGen.getSurfaceHeight(5, 5), 5);
    const dunesSurface = dunesChunk.getLow(5, dunesGen.getSurfaceHeight(5, 5), 5);

    expect(extractMaterialId(plainsSurface)).toBe(CANONICAL_BIOMES.emerald_plains.strata.surfaceMaterial);
    expect(extractMaterialId(dunesSurface)).toBe(CANONICAL_BIOMES.golden_dunes.strata.surfaceMaterial);
  });
});
