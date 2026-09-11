import { prisma } from './src/web/lib/prisma';
import { worldBakeService } from './src/server/services/bake/WorldBakeService';
import { VoxelWorldGenerationConfig } from './src/shared/game/voxel/VoxelWorldGenerator';

async function runBootstrapLifecycleTest() {
  console.log(`\n========================================`);
  console.log(`[TEST] Starting Bootstrap Lifecycle Test`);
  console.log(`========================================`);

  const gameName = `TestGame_${Date.now()}`;
  const mapId = `test_map_${Date.now()}`;
  const widthChunks = 8;
  const depthChunks = 8;
  
  // 1. Create Bootstrap Revision
  console.log(`[1] Creating Bootstrap Revision for map ${mapId}...`);
  const revision = await prisma.worldBootstrapRevision.create({
    data: {
      mapId,
      seed: 'test_seed_123',
      generatorVersion: 'saints-core@1.0.0',
      configHash: 'mock_hash',
      dimensions: JSON.stringify({ widthChunks, depthChunks, heightChunks: 1 }),
      status: 'PENDING',
    }
  });

  const config: VoxelWorldGenerationConfig = {
    id: mapId,
    name: mapId,
    widthChunks,
    depthChunks,
    blockSizePx: 64,
    mode: 'procedural',
    seed: 'test_seed_123'
  };

  // 1b. Create WorldMap (Draft Pointer Target)
  await prisma.worldMap.create({
    data: {
      id: mapId,
      gameId: 'saints',
      name: mapId,
      gridData: '{}',
      gatesData: '{}',
      npcsData: '{}',
      encountersData: '{}',
      entitiesData: '{}',
      tileLayersData: '{}',
      freeformLayersData: '[]',
      tilesetsData: '{}',
      regionClass: 'authored',
      version: 1,
      mapType: 'VOXEL',
    }
  }).catch(() => {}); // ignore if it somehow exists

  // 2. Start Bake
  console.log(`[2] Starting Bake for revision ${revision.id}...`);
  await prisma.worldBootstrapRevision.update({
    where: { id: revision.id },
    data: { status: 'GENERATING' }
  });

  const CHUNKS_PER_REGION = 8;
  const activeRegions = [];
  for (let rz = 0; rz < Math.ceil(depthChunks / CHUNKS_PER_REGION); rz++) {
    for (let rx = 0; rx < Math.ceil(widthChunks / CHUNKS_PER_REGION); rx++) {
      activeRegions.push({ mapId, regionX: rx, regionZ: rz });
    }
  }

  const manifest = {
    mapId,
    name: mapId,
    version: 1,
    generator: { generatorId: 'saints-core', version: 1, configHash: 'mock_hash' },
    dimensions: { widthChunks, depthChunks, heightChunks: 1 },
    chunkSize: { x: 32, y: 32, z: 32 },
    chunksPerRegion: CHUNKS_PER_REGION,
    activeRegions,
    metadata: {}
  };

  const jobId = `test_bootstrap_${Date.now()}`;
  
  await worldBakeService.submitJob({
    jobId,
    revisionId: revision.id,
    manifest,
    status: 'QUEUED',
    priority: 1,
    startedAt: Date.now(),
    updatedAt: Date.now()
  }, config);

  // Poll for completion
  console.log(`[3] Waiting for bake to complete...`);
  await new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      const currentJob = (worldBakeService as any).activeJobs.get(jobId);
      if (currentJob && currentJob.status === 'COMPLETED') {
        clearInterval(interval);
        resolve();
      } else if (currentJob && currentJob.status === 'FAILED') {
        clearInterval(interval);
        reject(new Error('Bake failed'));
      }
    }, 500);
  });

  console.log(`[3] Bake completed.`);

  // 3. Initialize Game (Simulated)
  console.log(`[4] Simulating initialize-game endpoint...`);
  
  const completedRevision = await prisma.worldBootstrapRevision.findUnique({
    where: { id: revision.id },
    include: { regions: true }
  });

  if (!completedRevision || completedRevision.status !== 'COMPLETED') {
    throw new Error('Revision is not COMPLETED in DB');
  }
  if (completedRevision.regions.length === 0) {
    throw new Error('No regions found for revision');
  }
  
  console.log(`    Found ${completedRevision.regions.length} region artifacts.`);

  // (WorldMap already created in step 1b)

  // Publish WorldMapVersion
  console.log(`[5] Creating WorldMapVersion...`);
  const publishedVersion = await prisma.worldMapVersion.upsert({
    where: {
      mapId_version: { mapId, version: 1 }
    },
    create: {
      mapId,
      version: 1,
      name: mapId,
      regions: {
        create: completedRevision.regions.map(r => ({
          regionX: r.regionX,
          regionZ: r.regionZ,
          artifactChecksum: r.artifactChecksum
        }))
      }
    },
    update: {}
  });

  // Verify
  console.log(`[6] Verifying Isolation...`);
  const versionRegions = await prisma.worldMapVersionRegion.findMany({
    where: { versionId: publishedVersion.id }
  });

  if (versionRegions.length !== completedRevision.regions.length) {
    throw new Error(`Region count mismatch: Version has ${versionRegions.length}, Revision had ${completedRevision.regions.length}`);
  }

  // Ensure artifacts exist in the database and match checksums
  const checksums = versionRegions.map(r => r.artifactChecksum);
  const artifacts = await prisma.worldRegionArtifact.findMany({
    where: { checksum: { in: checksums } }
  });

  if (artifacts.length !== [...new Set(checksums)].length) {
    throw new Error(`Missing artifacts in WorldRegionArtifact table! Found ${artifacts.length} expected ${new Set(checksums).size}`);
  }

  console.log(`\n========================================`);
  console.log(`[SUCCESS] End-to-End Lifecycle Verified!`);
  console.log(`========================================`);
  
  process.exit(0);
}

runBootstrapLifecycleTest().catch(console.error);
