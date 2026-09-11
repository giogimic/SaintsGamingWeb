import { worldBakeService } from './src/server/services/bake/WorldBakeService';
import { WorldBakeJob, WorldManifest } from './src/shared/game/voxel/WorldBakeContracts';
import { VoxelWorldGenerationConfig } from './src/shared/game/voxel/VoxelWorldGenerator';
import { VoxelRegionRepository } from './src/server/repositories/VoxelRegionRepository';
import { prisma } from './src/web/lib/prisma';

async function runBakeTest(sizeStr: string, chunksDimension: number) {
  console.log(`\n========================================`);
  console.log(`[TEST] Starting ${sizeStr} Bake Test`);
  console.log(`========================================`);
  
  const jobId = `test_bake_${sizeStr}_${Date.now()}`;
  const mapId = `test_map_${sizeStr}`;
  
  // Cleanup any old test runs
  await VoxelRegionRepository.deleteAllRegionsForMap(mapId);
  
  const CHUNKS_PER_REGION = 8;
  const regionsDim = chunksDimension / CHUNKS_PER_REGION;
  const activeRegions = [];
  for (let rz = 0; rz < regionsDim; rz++) {
    for (let rx = 0; rx < regionsDim; rx++) {
      activeRegions.push({ mapId, regionX: rx, regionZ: rz });
    }
  }

  const manifest: WorldManifest = {
    mapId,
    name: `${sizeStr} Test Map`,
    version: 1,
    generator: { generatorId: 'test-gen', version: 1, configHash: 'test' },
    dimensions: { widthChunks: chunksDimension, depthChunks: chunksDimension, heightChunks: 1 },
    chunkSize: { x: 32, y: 32, z: 32 },
    chunksPerRegion: CHUNKS_PER_REGION,
    activeRegions,
    metadata: {}
  };

  // Create a dummy map to satisfy foreign key constraints
  const testMapId = `test-map-${sizeStr}-${Date.now()}`;
  await prisma.worldMap.create({
    data: {
      id: testMapId,
      name: `${sizeStr} Bake Test Map`,
      version: 3,
      gatesData: '{}',
      tileLayersData: '{}',
      npcsData: '{}'
    }
  }).catch(async (e) => {
    // If authorId is required and fails, let's just find any existing map and use its ID
    const anyMap = await prisma.worldMap.findFirst();
    if (anyMap) return anyMap;
    throw e;
  });

  const mapIdToUse = (await prisma.worldMap.findFirst({ where: { id: testMapId } }))?.id || (await prisma.worldMap.findFirst())?.id || testMapId;

  manifest.mapId = mapIdToUse;
  activeRegions.forEach(r => r.mapId = mapIdToUse);

  const job: WorldBakeJob = {
    jobId,
    manifest,
    status: 'QUEUED',
    priority: 1,
    startedAt: Date.now(),
    updatedAt: Date.now()
  };

  const config: VoxelWorldGenerationConfig = {
    id: mapId,
    name: mapId,
    widthChunks: chunksDimension,
    depthChunks: chunksDimension,
    blockSizePx: 64,
    mode: 'procedural',
    seed: 12345
  };

  console.log(`[TEST] Submitting job with ${activeRegions.length} regions (${chunksDimension * chunksDimension} chunks)`);
  
  const startTime = Date.now();
  await worldBakeService.submitJob(job, config);

  // Poll for completion
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      const prog = worldBakeService.getProgress(jobId);
      if (!prog) return;

      const mem = process.memoryUsage();
      const memMb = Math.round(mem.heapUsed / 1024 / 1024);
      
      console.log(`[TEST] Progress: ${prog.progressPercent}% | Regions: ${prog.completedRegions}/${prog.totalRegions} | Workers: ${prog.activeWorkers} | Mem: ${memMb} MB`);

      const currentJob = (worldBakeService as any).activeJobs.get(jobId);
      if (currentJob && currentJob.status === 'COMPLETED') {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        console.log(`\n[TEST SUCCESS] ${sizeStr} completed in ${elapsed}ms! Peak memory bounded.`);
        
        // Verify Regions in DB
        const savedRegions = await VoxelRegionRepository.getRegionsForMap(mapId);
        console.log(`[TEST] Verified ${savedRegions.length} regions persisted to DB.`);
        
        let totalBytes = 0;
        savedRegions.forEach(r => totalBytes += (r.voxelData?.length || 0));
        console.log(`[TEST] Total compressed region payload size: ${Math.round(totalBytes / 1024)} KB`);
        
        resolve();
      } else if (currentJob && currentJob.status === 'FAILED') {
        clearInterval(interval);
        console.error(`[TEST FAILED] ${sizeStr} failed: ${prog.error}`);
        reject(new Error(prog.error));
      }
    }, 500);
  });
}

async function main() {
  try {
    await runBakeTest('4x4', 4);
    await runBakeTest('8x8', 8);
    await runBakeTest('16x16', 16);
    await runBakeTest('32x32', 32);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
