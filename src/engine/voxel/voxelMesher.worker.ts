/**
 * Saints Gaming — Dedicated Voxel Chunk Mesher Web Worker
 *
 * Runs greedy meshing off-thread using 34³ halo buffers and vertex Ambient Occlusion.
 * Returns vertex buffers using zero-copy postMessage transfers.
 */

import { meshChunkWithHalo34, HaloMeshInput } from './VoxelMesherCore';

self.onmessage = (e: MessageEvent<HaloMeshInput>) => {
  try {
    const result = meshChunkWithHalo34(e.data);
    (self as any).postMessage(
      { success: true, result },
      [
        result.positions.buffer,
        result.normals.buffer,
        result.uvs.buffer,
        result.colors.buffer,
        result.indices.buffer,
      ]
    );
  } catch (err: any) {
    (self as any).postMessage({ success: false, error: err?.message || String(err) });
  }
};
