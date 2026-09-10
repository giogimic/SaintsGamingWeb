import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './VoxelChunk';
import { VOXEL_WORD_AIR_LOW } from './VoxelWord';

/** Fast deterministic PRNG (mulberry32) */
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export interface ProceduralStructure {
  voxelMapId: string;
  spawnWeight: number; // 0.0 to 1.0
  yOffset: number;
}

export function applyStructuresToChunk(
  chunk: VoxelChunk,
  structures: ProceduralStructure[],
  structureVoxelDocs: Record<string, any>,
  globalSeed: number
) {
  if (!structures || structures.length === 0) return;

  const radius = 2; // 2x2 chunk anchor radius

  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const anchorCX = chunk.cx + dx;
      const anchorCZ = chunk.cz + dz;

      // Deterministic seed for this anchor chunk
      const anchorSeedStr = `${globalSeed}_${anchorCX}_${anchorCZ}`;
      const anchorSeedNum = Array.from(anchorSeedStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const prng = mulberry32(anchorSeedNum);

      for (const structDef of structures) {
        if (structDef.spawnWeight <= 0) continue;

        const roll = prng();
        if (roll > structDef.spawnWeight) continue;

        // Structure spawned!
        const structDoc = structureVoxelDocs[structDef.voxelMapId];
        if (!structDoc || !structDoc.chunks) continue;

        // Decode chunks
        const structChunks = structDoc.chunks;
        
        // Anchor world position
        const anchorWorldX = anchorCX * CHUNK_SIZE_X + Math.floor(CHUNK_SIZE_X / 2);
        const anchorWorldZ = anchorCZ * CHUNK_SIZE_Z + Math.floor(CHUNK_SIZE_Z / 2);
        const anchorWorldY = Math.max(0, structDef.yOffset + 3);

        for (const [ckey, rleData] of Object.entries(structChunks)) {
          // Parse ckey "cx_cz_cy"
          const parts = ckey.split('_').map(Number);
          if (parts.length < 3) continue;
          
          const sCx = parts[0];
          const sCz = parts[1];
          const sCy = parts[2];

          // Decode RLE back to VoxelChunk
          const sChunk = VoxelChunk.deserializePaletteRLEBinary(new Uint8Array(rleData as any));

          for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
            for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
              for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
                const idx = VoxelChunk.getIndex(lx, ly, lz);
                const wordLow = sChunk.dataLow[idx];
                const wordHigh = sChunk.dataHigh[idx];

                if (wordLow === VOXEL_WORD_AIR_LOW) continue;

                // World pos relative to structure origin (0,0,0)
                const bwX = (sCx * CHUNK_SIZE_X) + lx;
                const bwY = (sCy * CHUNK_SIZE_Y) + ly;
                const bwZ = (sCz * CHUNK_SIZE_Z) + lz;

                // Offset it by anchor
                const targetWX = anchorWorldX + bwX;
                const targetWY = anchorWorldY + bwY;
                const targetWZ = anchorWorldZ + bwZ;

                // Does it fall into current chunk?
                const targetCX = Math.floor(targetWX / CHUNK_SIZE_X);
                const targetCY = Math.floor(targetWY / CHUNK_SIZE_Y);
                const targetCZ = Math.floor(targetWZ / CHUNK_SIZE_Z);

                if (targetCX === chunk.cx && targetCY === chunk.cy && targetCZ === chunk.cz) {
                  const localX = targetWX - (targetCX * CHUNK_SIZE_X);
                  const localY = targetWY - (targetCY * CHUNK_SIZE_Y);
                  const localZ = targetWZ - (targetCZ * CHUNK_SIZE_Z);

                  if (localX >= 0 && localX < CHUNK_SIZE_X && localY >= 0 && localY < CHUNK_SIZE_Y && localZ >= 0 && localZ < CHUNK_SIZE_Z) {
                    const localIdx = VoxelChunk.getIndex(localX, localY, localZ);
                    chunk.dataLow[localIdx] = wordLow;
                    chunk.dataHigh[localIdx] = wordHigh;
                    chunk.isDirty = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
