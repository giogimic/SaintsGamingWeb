import { parentPort, workerData } from 'worker_threads';
import { generateChunkVoxels, VoxelWorldGenerationConfig } from '@/shared/game/voxel/VoxelWorldGenerator';
import { VoxelChunk } from '@/shared/game/voxel/VoxelChunk';
import { packVoxel, VOXEL_MAT_GRASS, VoxelPhysics, VoxelOrientation, VoxelShape } from '@/shared/game/voxel/VoxelWord';
import zlib from 'zlib';
import { buildAtlasWorld } from '@/shared/game/atlas/world/AtlasWorldBuilder';
import { AtlasRegionResolver } from '@/shared/game/atlas/world/AtlasRegionResolver';

export interface BakeWorkerTask {
  taskId: string;
  config: VoxelWorldGenerationConfig;
  regionX: number;
  regionZ: number;
  chunksPerRegion: number;
}

export interface BakeWorkerResult {
  taskId: string;
  regionX: number;
  regionZ: number;
  status: 'COMPLETED' | 'ERROR';
  error?: string;
  compressedPayload?: Uint8Array;
  checksum?: string;
  chunksGenerated: number;
}

async function handleTask(task: BakeWorkerTask) {
  const { config, regionX, regionZ, chunksPerRegion } = task;
  const startCx = regionX * chunksPerRegion;
  const startCz = regionZ * chunksPerRegion;
  
  const regionData: Record<string, number[]> = {};
  let chunksGenerated = 0;

  // Initialize atlas world context for this worker task to enable 3D terrain features
  const seedBaseStr = String(config.seed || 1337);
  const atlasContext = buildAtlasWorld(seedBaseStr);
  const atlasResolver = new AtlasRegionResolver();

  for (let lz = 0; lz < chunksPerRegion; lz++) {
    for (let lx = 0; lx < chunksPerRegion; lx++) {
      const cx = startCx + lx;
      const cz = startCz + lz;

      // Deterministic PRNG Seed for this specific chunk
      // hash( worldSeed, generatorVersion, cx, cz, cy, passId )
      const seedBase = String(config.seed || 1337);
      const chunkHash = `${seedBase}_v1_${cx}_${cz}_0_all`; // basic pass for now
      
      const chunkConfig = {
        ...config,
        seed: chunkHash
      };

      // 1. Generate Chunk
      const chunk = generateChunkVoxels(cx, cz, 0, chunkConfig, atlasContext, atlasResolver);

      // 2. Validate Chunk (Lightweight)
      if (chunk.dataLow.length !== 32768 || chunk.dataHigh.length !== 32768) {
        throw new Error(`Validation failed for chunk ${cx},${cz}: Invalid array lengths.`);
      }

      // 3. Compress/Accumulate
      const chunkKey = `${cx}_${cz}_0`;
      
      // We store it simply in the record for region assembly. 
      // In a real binary layout we might serialize these consecutively into a buffer.
      // For now, we will JSON stringify the region chunks and then Deflate compress it.
      regionData[chunkKey] = [
        ...chunk.dataLow,
        ...chunk.dataHigh
      ];

      chunksGenerated++;
      
      // Simulate memory release by discarding chunk reference immediately
      // The regionData holds the raw ints, but we don't hold the VoxelChunk class instance.
    }
  }

  // 4. Region Assembly & Compression
  // We use Node's zlib deflate for binary compression of the JSON payload.
  const regionString = JSON.stringify({ chunks: regionData });
  const compressedBuffer = zlib.deflateSync(Buffer.from(regionString, 'utf-8'));
  
  // 5. Checksum (simple hash of the compressed buffer)
  const checksum = require('crypto').createHash('sha256').update(compressedBuffer).digest('hex');

  // Return the binary blob directly back to the main thread
  const result: BakeWorkerResult = {
    taskId: task.taskId,
    regionX,
    regionZ,
    status: 'COMPLETED',
    chunksGenerated,
    compressedPayload: new Uint8Array(compressedBuffer),
    checksum
  };

  console.log(`[BakeWorker] Finished task for region ${regionX},${regionZ}. Generated ${chunksGenerated} chunks.`);
  parentPort?.postMessage(result);
}

console.log('[BakeWorker] Booting up! parentPort is:', !!parentPort);
parentPort?.on('message', async (task: BakeWorkerTask) => {
  try {
    await handleTask(task);
  } catch (err: any) {
    console.error('[BakeWorker] Caught Error:', err);
    const errResult: BakeWorkerResult = {
      taskId: task.taskId,
      regionX: task.regionX,
      regionZ: task.regionZ,
      status: 'ERROR',
      chunksGenerated: 0,
      error: err.message || 'Unknown Worker Error'
    };
    parentPort?.postMessage(errResult);
  }
});
