/**
 * Saints Gaming — 32³ Isotropic Volumetric Chunk Migration Utility
 *
 * Converts legacy 16×16×32 volumetric chunks to standard 32×32×32 isotropic chunks.
 */

import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './VoxelChunk';
import type { VoxelWorldDocV3 } from './VoxelWorldDoc';
import { isVoxelAir } from './VoxelWord';

export const LEGACY_CHUNK_SIZE_X = 16;
export const LEGACY_CHUNK_SIZE_Z = 16;
export const LEGACY_CHUNK_SIZE_Y = 32;
export const LEGACY_CHUNK_TOTAL_CELLS = 16 * 16 * 32; // 8,192

/**
 * Checks if a chunk RLE payload was encoded using the legacy 8,192 cell format.
 */
export function isLegacyChunkRle(rleArray: number[]): boolean {
  if (!Array.isArray(rleArray) || rleArray.length === 0) return false;
  let total = 0;
  for (let i = 0; i < rleArray.length; i += 2) {
    total += rleArray[i] || 0;
  }
  return total === LEGACY_CHUNK_TOTAL_CELLS;
}

/**
 * Checks if a VoxelWorldDocV3 contains legacy 16x16x32 chunks.
 */
export function isLegacy16CubicDoc(doc: VoxelWorldDocV3): boolean {
  if (!doc.chunks || typeof doc.chunks !== 'object') return false;
  const keys = Object.keys(doc.chunks);
  if (keys.length === 0) return false;
  for (const key of keys) {
    const rle = doc.chunks[key];
    if (rle && rle.length > 0) {
      if (isLegacyChunkRle(rle)) return true;
    }
  }
  return false;
}

/**
 * Migrates a legacy 16x16x32 VoxelWorldDocV3 into a standard 32x32x32 isotropic doc.
 */
export function migrateLegacyDocTo32Cubic(doc: VoxelWorldDocV3): VoxelWorldDocV3 {
  if (!isLegacy16CubicDoc(doc)) {
    return doc;
  }

  // Calculate new world dimensions in 32³ chunks
  const oldWidthChunks = doc.dimensions?.widthChunks || 2;
  const oldDepthChunks = doc.dimensions?.depthChunks || 2;
  const oldHeightChunks = doc.dimensions?.heightChunks || 1;

  const totalWidthBlocks = doc.mapWidth ?? oldWidthChunks * LEGACY_CHUNK_SIZE_X;
  const totalDepthBlocks = doc.mapHeight ?? oldDepthChunks * LEGACY_CHUNK_SIZE_Z;
  const totalHeightBlocks = oldHeightChunks * LEGACY_CHUNK_SIZE_Y;

  const newWidthChunks = Math.max(1, Math.ceil(totalWidthBlocks / CHUNK_SIZE_X));
  const newDepthChunks = Math.max(1, Math.ceil(totalDepthBlocks / CHUNK_SIZE_Z));
  const newHeightChunks = Math.max(1, Math.ceil(totalHeightBlocks / CHUNK_SIZE_Y));

  // Map to hold new 32³ chunks
  const newChunks = new Map<string, VoxelChunk>();

  const getOrCreateNewChunk = (cx: number, cz: number, cy: number): VoxelChunk => {
    const key = VoxelChunk.getChunkKey(cx, cz, cy);
    let chunk = newChunks.get(key);
    if (!chunk) {
      chunk = new VoxelChunk(cx, cz, cy);
      newChunks.set(key, chunk);
    }
    return chunk;
  };

  // Re-slice legacy chunks into 32³ chunks
  for (const [key, rleArray] of Object.entries(doc.chunks)) {
    const { cx: oldCx, cz: oldCz, cy: oldCy } = VoxelChunk.parseChunkKey(key);

    // Decode legacy 8192 array
    const legacyData = new Uint32Array(LEGACY_CHUNK_TOTAL_CELLS);
    let targetIdx = 0;
    for (let i = 0; i < rleArray.length; i += 2) {
      const count = rleArray[i];
      const val = rleArray[i + 1] >>> 0;
      for (let c = 0; c < count && targetIdx < LEGACY_CHUNK_TOTAL_CELLS; c++) {
        legacyData[targetIdx++] = val;
      }
    }

    // Map each cell to world coordinates, then to new 32³ chunk
    for (let oldIdx = 0; oldIdx < targetIdx; oldIdx++) {
      const word = legacyData[oldIdx];
      if (isVoxelAir(word)) continue;

      const oldLx = oldIdx % LEGACY_CHUNK_SIZE_X;
      const oldLz = Math.floor(oldIdx / LEGACY_CHUNK_SIZE_X) % LEGACY_CHUNK_SIZE_Z;
      const oldLy = Math.floor(oldIdx / (LEGACY_CHUNK_SIZE_X * LEGACY_CHUNK_SIZE_Z));

      const wx = oldCx * LEGACY_CHUNK_SIZE_X + oldLx;
      const wz = oldCz * LEGACY_CHUNK_SIZE_Z + oldLz;
      const wy = oldCy * LEGACY_CHUNK_SIZE_Y + oldLy;

      const newCx = Math.floor(wx / CHUNK_SIZE_X);
      const newCz = Math.floor(wz / CHUNK_SIZE_Z);
      const newCy = Math.floor(wy / CHUNK_SIZE_Y);

      const newLx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
      const newLz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
      const newLy = ((wy % CHUNK_SIZE_Y) + CHUNK_SIZE_Y) % CHUNK_SIZE_Y;

      const chunk = getOrCreateNewChunk(newCx, newCz, newCy);
      chunk.set(newLx, newLy, newLz, word);
    }
  }

  // Serialize new chunks to RLE
  const serializedChunks: Record<string, number[]> = {};
  for (const [chunkKey, chunk] of newChunks.entries()) {
    if (!chunk.isEmpty()) {
      serializedChunks[chunkKey] = chunk.serializeRLE();
    }
  }

  return {
    ...doc,
    dimensions: {
      widthChunks: newWidthChunks,
      depthChunks: newDepthChunks,
      heightChunks: newHeightChunks,
    },
    chunks: serializedChunks,
  };
}
