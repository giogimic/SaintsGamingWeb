import { describe, it, expect } from 'vitest';
import { VoxelChunk, CHUNK_TOTAL_CELLS } from './VoxelChunk';
import { VOXEL_WORD_AIR, VOXEL_WORD_GUNMETAL } from './VoxelWord';

describe('VoxelChunk Palette-Indexed Binary RLE & Delta Packets', () => {
  it('serializes and deserializes an empty air chunk down to tiny byte footprint', () => {
    const chunk = new VoxelChunk(2, -4, 1);
    const binary = chunk.serializePaletteRLEBinary();
    
    // Header (1 + 6 + 1 + 4 = 12) + 1 run (3) = 15 bytes
    expect(binary.byteLength).toBeLessThan(30);

    const restored = VoxelChunk.deserializePaletteRLEBinary(binary);
    expect(restored.cx).toBe(2);
    expect(restored.cy).toBe(1);
    expect(restored.cz).toBe(-4);
    expect(restored.isEmpty()).toBe(true);
  });

  it('serializes and deserializes a default base chunk with perfect fidelity', () => {
    const chunk = new VoxelChunk(0, 0, 0);
    chunk.generateDefaultBase();

    const binary = chunk.serializePaletteRLEBinary();
    // Default base has 2 large runs: gunmetal bottom half, air top half
    expect(binary.byteLength).toBeLessThan(50);

    const restored = VoxelChunk.deserializePaletteRLEBinary(binary);
    expect(restored.cx).toBe(0);
    expect(restored.cy).toBe(0);
    expect(restored.cz).toBe(0);
    expect(restored.data.length).toBe(CHUNK_TOTAL_CELLS);

    for (let i = 0; i < CHUNK_TOTAL_CELLS; i++) {
      expect(restored.data[i]).toBe(chunk.data[i]);
    }
  });

  it('streams procedural terrain chunks with average payload strictly under 4 KB', () => {
    let totalBytes = 0;
    const count = 4;

    for (let c = 0; c < count; c++) {
      const chunk = new VoxelChunk(c % 2, Math.floor(c / 2), 0);
      
      // Simulate realistic layered terrain with surface undulating height
      for (let x = 0; x < 32; x++) {
        for (let z = 0; z < 32; z++) {
          const height = 10 + Math.floor(Math.sin((x + c * 32) * 0.2) * 3 + Math.cos(z * 0.2) * 3);
          for (let y = 0; y < 32; y++) {
            let word = VOXEL_WORD_AIR;
            if (y === 0) word = 10; // Bedrock
            else if (y < height - 3) word = 1; // Stone
            else if (y < height) word = 2; // Dirt
            else if (y === height) word = 3; // Grass
            
            chunk.set(x, y, z, word);
          }
        }
      }

      const binary = chunk.serializePaletteRLEBinary();
      totalBytes += binary.byteLength;

      // Verify round-trip accuracy
      const restored = VoxelChunk.deserializePaletteRLEBinary(binary);
      expect(restored.cx).toBe(chunk.cx);
      expect(restored.cy).toBe(chunk.cy);
      expect(restored.cz).toBe(chunk.cz);
      expect(restored.data.length).toBe(chunk.data.length);
    }

    const avgBytes = totalBytes / count;
    // Layered terrain with runs should easily compress to <4096 bytes (usually ~1.5 - 2.5 KB)
    expect(avgBytes).toBeLessThan(4096);
  });

  it('round-trips single-voxel delta mutation packets in 13 bytes', () => {
    const delta = VoxelChunk.serializeVoxelDelta(5, 2, -3, 1024, VOXEL_WORD_GUNMETAL);
    expect(delta.byteLength).toBe(13);

    const unpacked = VoxelChunk.deserializeVoxelDelta(delta);
    expect(unpacked.cx).toBe(5);
    expect(unpacked.cy).toBe(2);
    expect(unpacked.cz).toBe(-3);
    expect(unpacked.localIndex).toBe(1024);
    expect(unpacked.word).toBe(VOXEL_WORD_GUNMETAL);
  });
});
