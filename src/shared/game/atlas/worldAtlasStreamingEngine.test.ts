import { describe, expect, it } from 'vitest';
import {
  ATLAS_CHUNK_SIZE,
  WorldAtlasStreamingEngine,
} from './worldAtlasStreamingEngine';

describe('World Atlas Chunks, Biome Transitions & Seamless Streaming Engine (Phase 28)', () => {
  it('converts world tile coordinates into spatial chunk coordinates accurately', () => {
    const engine = new WorldAtlasStreamingEngine();

    // Tile (0, 0) -> Chunk (0, 0)
    const c0 = engine.tileToChunkCoord(0, 0);
    expect(c0.chunkX).toBe(0);
    expect(c0.chunkY).toBe(0);
    expect(c0.chunkKey).toBe('0_0');

    // Tile (64, 96) -> Chunk (2, 3) because 64 / 32 = 2, 96 / 32 = 3
    const c1 = engine.tileToChunkCoord(64, 96);
    expect(c1.chunkX).toBe(2);
    expect(c1.chunkY).toBe(3);
    expect(c1.chunkKey).toBe('2_3');
  });

  it('computes 3x3 active streaming grid around player location', () => {
    const engine = new WorldAtlasStreamingEngine();

    // Center tile at (32, 32) -> Center chunk (1, 1)
    const grid = engine.calculateStreamingGrid(32, 32, 1);
    expect(grid.size).toBe(9); // 3x3
    expect(grid.has('0_0')).toBe(true);
    expect(grid.has('1_1')).toBe(true);
    expect(grid.has('2_2')).toBe(true);
  });

  it('calculates chunks to load and evict as player moves across chunk boundaries', () => {
    const engine = new WorldAtlasStreamingEngine();

    // Player starts at (0, 0) -> loaded 3x3 around (0, 0)
    const initialChunks = engine.calculateStreamingGrid(0, 0, 1);

    // Player walks East into chunk (1, 0) -> tile X = 32
    const delta = engine.calculateStreamingDelta(initialChunks, 32, 0, 1);

    // 3 new chunks to load on East edge: '2_-1', '2_0', '2_1'
    expect(delta.chunksToLoad).toHaveLength(3);
    expect(delta.chunksToLoad).toContain('2_0');

    // 3 old chunks to evict on West edge: '-1_-1', '-1_0', '-1_1'
    expect(delta.chunksToEvict).toHaveLength(3);
    expect(delta.chunksToEvict).toContain('-1_0');
  });

  it('computes smooth biome boundary blend factors and interpolated ambient tints', () => {
    const engine = new WorldAtlasStreamingEngine();

    // 1. Center of transition (dist = 0) -> 50% Biome A, 50% Biome B
    const mid = engine.calculateBiomeBlend(0, 10, '#000000', '#ffffff');
    expect(mid.blendFactorA).toBe(0.5);
    expect(mid.blendFactorB).toBe(0.5);
    expect(mid.interpolatedTintHex).toBe('#808080');

    // 2. Fully in Biome A (dist <= -5) -> 100% Biome A, 0% Biome B
    const inA = engine.calculateBiomeBlend(-5, 10, '#000000', '#ffffff');
    expect(inA.blendFactorA).toBe(1.0);
    expect(inA.blendFactorB).toBe(0.0);
    expect(inA.interpolatedTintHex).toBe('#000000');

    // 3. Fully in Biome B (dist >= 5) -> 0% Biome A, 100% Biome B
    const inB = engine.calculateBiomeBlend(5, 10, '#000000', '#ffffff');
    expect(inB.blendFactorA).toBe(0.0);
    expect(inB.blendFactorB).toBe(1.0);
    expect(inB.interpolatedTintHex).toBe('#ffffff');
  });
});
