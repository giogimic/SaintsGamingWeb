import { worldBakeService } from './src/server/services/bake/WorldBakeService';
import { WorldBakeJob, WorldManifest } from './src/shared/game/voxel/WorldBakeContracts';
import { VoxelWorldGenerationConfig } from './src/shared/game/voxel/VoxelWorldGenerator';
import { VoxelRegionRepository } from './src/server/repositories/VoxelRegionRepository';
import { VoxelStorageService } from './src/server/services/VoxelStorageService';
import { prisma } from './src/web/lib/prisma';
import crypto from 'crypto';

async function waitForJob(jobId: string): Promise<void> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const currentJob = (worldBakeService as any).activeJobs.get(jobId);
      if (currentJob && currentJob.status === 'COMPLETED') {
        clearInterval(interval);
        resolve();
      }
    }, 250);
  });
}

async function runBake(sizeStr: string, chunksDimension: number, mapId: string, seed: number, baseMaterial?: number) {
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
    name: `${sizeStr} Publish Test Map`,
    version: 1,
    generator: { generatorId: 'test-gen', version: 1, configHash: 'test' },
    dimensions: { widthChunks: chunksDimension, depthChunks: chunksDimension, heightChunks: 1 },
    chunkSize: { x: 32, y: 32, z: 32 },
    chunksPerRegion: CHUNKS_PER_REGION,
    activeRegions,
    metadata: {}
  };

  const jobId = `publish_bake_${sizeStr}_${Date.now()}`;
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
    seed,
    baseMaterial // this will actually change the fallback voxels
  };

  await worldBakeService.submitJob(job, config);
  await waitForJob(jobId);
}

async function publishVersion(mapId: string, version: number) {
  const regions = await VoxelRegionRepository.getRegionsForMap(mapId);
  
  for (const r of regions) {
    if (r.status !== 'COMPLETED') throw new Error(`Region ${r.coordinates.regionX},${r.coordinates.regionZ} not completed`);
    if (!r.checksum) throw new Error(`Region missing checksum`);
    if (!r.voxelData) throw new Error(`Region artifact missing for ${r.checksum}`);
  }

  const regionMetadata = regions.map(r => ({
    coordinates: r.coordinates,
    generator: r.generator,
    status: r.status,
    checksum: r.checksum
  }));

  const snapshotPayload = {
    id: mapId,
    name: `Test Map v${version}`,
    version: 1,
    publishedVersion: version,
    regions: regionMetadata,
  };

  await prisma.worldMapVersion.upsert({
    where: { mapId_version: { mapId, version } },
    create: { 
      mapId, 
      version, 
      name: snapshotPayload.name, 
      regions: {
        create: regionMetadata.map(r => ({
          regionX: r.coordinates.regionX,
          regionZ: r.coordinates.regionZ,
          artifactChecksum: r.checksum!
        }))
      }
    },
    update: {}
  });
  
  return regionMetadata;
}

async function testPublishLifecycle() {
  console.log(`\n========================================`);
  console.log(`[TEST] Phase 2B Immutable Publish Lifecycle`);
  console.log(`========================================`);

  const mapId = `publish-test-map-${Date.now()}`;

  // 1. Setup Dummy Map
  await prisma.worldMap.create({
    data: { id: mapId, name: 'Publish Test Map', version: 3, gatesData: '{}', tileLayersData: '{}', npcsData: '{}' }
  });

  // STEP A: Bake 4x4 with Seed A (seed 100)
  console.log(`\n[STEP A] Baking 4x4 with Seed A (100)`);
  await runBake('4x4', 4, mapId, 100, 2); // 2 = VOXEL_MAT_GRASS

  // STEP B: Publish Version 1
  console.log(`[STEP B] Publishing Version 1`);
  const v1Metadata = await publishVersion(mapId, 1);
  console.log(`  -> Version 1 published with ${v1Metadata.length} regions.`);
  
  // STEP C: Record Version 1 checksums
  const v1Checksums = v1Metadata.map(r => r.checksum);
  console.log(`  -> V1 Checksums:`, v1Checksums);

  // STEP D: Bake draft with Seed B (seed 200)
  console.log(`\n[STEP D] Baking 4x4 with Seed B (200)`);
  // Force rebake by setting regions to PENDING so WorldBakeService doesn't skip them
  await prisma.worldRegion.updateMany({ where: { mapId }, data: { status: 'PENDING' } });
  await runBake('4x4', 4, mapId, 200, 5); // 5 = VOXEL_MAT_SAND

  // STEP E: Publish Version 2
  console.log(`[STEP E] Publishing Version 2`);
  const v2Metadata = await publishVersion(mapId, 2);
  const v2Checksums = v2Metadata.map(r => r.checksum);
  console.log(`  -> V2 Checksums:`, v2Checksums);

  // STEP F: Load Version 1 and verify original Seed A chunks
  console.log(`\n[STEP F] Loading Version 1 artifacts via content hash...`);
  const v1Doc = await VoxelStorageService.getVoxelDocFromArtifacts(mapId, v1Checksums as string[]);
  if (!v1Doc || Object.keys(v1Doc.chunks || {}).length === 0) {
    throw new Error('V1 Doc failed to load');
  }
  // Hash the v1 doc chunks
  const v1ChunksHash = crypto.createHash('sha256').update(JSON.stringify(v1Doc.chunks)).digest('hex');
  console.log(`  -> V1 Chunks Hash: ${v1ChunksHash}`);

  // STEP G: Load Version 2 and verify Seed B chunks
  console.log(`[STEP G] Loading Version 2 artifacts via content hash...`);
  const v2Doc = await VoxelStorageService.getVoxelDocFromArtifacts(mapId, v2Checksums as string[]);
  if (!v2Doc || Object.keys(v2Doc.chunks || {}).length === 0) {
    throw new Error('V2 Doc failed to load');
  }
  const v2ChunksHash = crypto.createHash('sha256').update(JSON.stringify(v2Doc.chunks)).digest('hex');
  console.log(`  -> V2 Chunks Hash: ${v2ChunksHash}`);

  if (v1ChunksHash === v2ChunksHash) {
    throw new Error('FATAL: V1 and V2 loaded the same chunks! Immutability broken!');
  }
  console.log(`[SUCCESS] Draft modification did not affect Published V1!`);

  // Verify Unchanged Region Reuse
  // Let's bake a 8x8 where one region is identical to V2
  // Actually, procedural generation with the same seed will produce the same checksums.
  console.log(`\n[VERIFY] Testing Content Hash Reuse`);
  console.log(`  -> Baking Seed B (200) again with same baseMaterial...`);
  await prisma.worldRegion.updateMany({ where: { mapId }, data: { status: 'PENDING' } });
  await runBake('4x4', 4, mapId, 200, 5); // 5 = VOXEL_MAT_SAND
  const v3Metadata = await publishVersion(mapId, 3);
  const v3Checksums = v3Metadata.map(r => r.checksum);
  
  let allReused = true;
  for (let i = 0; i < v2Checksums.length; i++) {
    if (v2Checksums[i] !== v3Checksums[i]) allReused = false;
  }
  if (!allReused) {
    throw new Error('FATAL: Exact same bake produced different checksums. Content reuse failed!');
  }
  console.log(`[SUCCESS] Content-addressed reuse verified! Checksums match exactly.`);

  // 32x32 Large Publish Test
  console.log(`\n[LARGE BAKE] Testing 32x32 Publish / Reload`);
  const largeMapId = `large-test-map-${Date.now()}`;
  await prisma.worldMap.create({
    data: { id: largeMapId, name: '32x32 Test Map', version: 3, gatesData: '{}', tileLayersData: '{}', npcsData: '{}' }
  });

  const largeStart = Date.now();
  await runBake('32x32', 32, largeMapId, 999);
  console.log(`  -> Bake completed in ${Date.now() - largeStart}ms`);

  const largeMetadata = await publishVersion(largeMapId, 1);
  if (largeMetadata.length !== 16) {
    throw new Error(`Expected 16 regions for 32x32, got ${largeMetadata.length}`);
  }
  console.log(`  -> Published 32x32 Version 1 with ${largeMetadata.length} regions.`);

  const largeDoc = await VoxelStorageService.getVoxelDocFromArtifacts(largeMapId, largeMetadata.map(r => r.checksum) as string[]);
  const loadedChunks = Object.keys(largeDoc?.chunks || {}).length;
  if (loadedChunks !== 1024) {
    throw new Error(`Expected 1024 chunks in 32x32 doc, got ${loadedChunks}`);
  }
  console.log(`[SUCCESS] 32x32 Reload verified! Loaded all ${loadedChunks} chunks perfectly.`);

  console.log(`\n========================================`);
  console.log(`[TEST PASSED] Phase 2B Immutable Pipeline Verified!`);
  console.log(`========================================\n`);
  
  process.exit(0);
}

testPublishLifecycle().catch(e => {
  console.error(e);
  process.exit(1);
});
