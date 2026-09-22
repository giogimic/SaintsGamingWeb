import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { worldBakeService } from "@/server/services/bake/WorldBakeService";
import { WorldBakeJob, WorldManifest } from "@/shared/game/voxel/WorldBakeContracts";
import { VoxelWorldGenerationConfig } from "@/shared/game/voxel/VoxelWorldGenerator";
import { CHUNKS_PER_REGION } from "@/shared/game/voxel/WorldStreamingContracts";
import { SetupLogger } from "@/server/diagnostics/SetupLogger";
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const initializationId = body.initializationId || 'init_unknown';
    const logger = new SetupLogger(initializationId);
    
    logger.log({ stageName: '01. Validate Setup Input', stageCode: 'validate_input', status: 'RUNNING', message: 'Validating payload' });

    const mapId = body.mapId || 'STARTING_MEADOW';
    const seed = body.seed || Date.now().toString();
    const widthChunks = Number(body.widthChunks) || 4;
    const depthChunks = Number(body.depthChunks) || 4;
    const heightChunks = Number(body.heightChunks) || 1;
    const baseMaterial = Number(body.baseMaterial) || 2;
    const baseElevation = Number(body.baseElevation) || 16;
    const mapTypeRaw = body.mapType || 'VOXEL';

    if (!['TILE', 'VOXEL', 'FRACTAL'].includes(mapTypeRaw)) {
      logger.log({ stageName: '01. Validate Setup Input', stageCode: 'validate_input', status: 'FAILED', message: 'Invalid mapType provided', error: mapTypeRaw });
      return NextResponse.json({ error: "Invalid mapType provided", events: logger.getEvents() }, { status: 400 });
    }
    const mapType = mapTypeRaw as 'TILE' | 'VOXEL' | 'FRACTAL';

    logger.log({ stageName: '01. Validate Setup Input', stageCode: 'validate_input', status: 'COMPLETED', message: 'Input validated', metadata: { mapId, mapType } });

    const regionsX = Math.ceil(widthChunks / CHUNKS_PER_REGION);
    const regionsZ = Math.ceil(depthChunks / CHUNKS_PER_REGION);

    const activeRegions = [];
    for (let rz = 0; rz < regionsZ; rz++) {
      for (let rx = 0; rx < regionsX; rx++) {
        activeRegions.push({ mapId, regionX: rx, regionZ: rz });
      }
    }

    const configHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    // Setup Parity / Foreign Key Fix:
    logger.log({ stageName: '02. Create / Update WorldProject', stageCode: 'create_project', status: 'RUNNING', message: 'Ensuring Saints project exists' });
    const gameConfig = await prisma.gameConfig.upsert({
      where: { slug: 'saints' },
      create: { slug: 'saints', name: 'Saints Gaming' },
      update: {}
    });

    const activeProject = await prisma.worldProject.upsert({
      where: { slug: 'saints' },
      create: {
        slug: 'saints',
        gameId: gameConfig.id,
        name: 'Saints Gaming',
        description: 'Auto-generated project during setup',
      },
      update: { gameId: gameConfig.id },
    });
    logger.log({ stageName: '02. Create / Update WorldProject', stageCode: 'create_project', status: 'COMPLETED', message: 'WorldProject ready', metadata: { projectId: activeProject.id } });

    logger.log({ stageName: '03. Create Working World', stageCode: 'create_working_world', status: 'COMPLETED', message: 'Working World bounded to Project' });

    logger.log({ stageName: '04. Create WorldMap', stageCode: 'create_map', status: 'RUNNING', message: `Upserting map ${mapId}` });

    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        projectId: activeProject.id,
        name: body.mapName || 'Genesis Sanctuary',
        gatesData: '{}',
        encountersData: '[]',
        entitiesData: '[]',
        regionClass: 'procedural',
        mapType: mapType,
        proceduralConfig: JSON.stringify({ seed, generatorVersion: '1.0.0', configHash }),
      },
      update: { 
        projectId: activeProject.id,
        mapType: mapType,
        proceduralConfig: JSON.stringify({ seed, generatorVersion: '1.0.0', configHash }),
      },
    });

    logger.log({ 
      stageName: '04. Create WorldMap', stageCode: 'create_map', status: 'COMPLETED', message: 'WorldMap created', 
      metadata: { id: mapId, mapType, regionClass: 'procedural', proceduralConfig: 'PRESENT' } 
    });
    logger.log({ stageName: '05. Configure Map', stageCode: 'configure_map', status: 'COMPLETED', message: 'Seed and configuration applied' });

    logger.log({ stageName: '06. Create WorldBootstrapRevision', stageCode: 'create_bootstrap', status: 'RUNNING', message: 'Creating bootstrap revision' });

    const revision = await prisma.worldBootstrapRevision.create({
      data: {
        mapId,
        seed,
        generatorVersion: '1.0.0',
        configHash,
        dimensions: JSON.stringify({ widthChunks, depthChunks, heightChunks }),
        status: 'PENDING',
      }
    });
    logger.log({ stageName: '06. Create WorldBootstrapRevision', stageCode: 'create_bootstrap', status: 'COMPLETED', message: 'Revision created', metadata: { revisionId: revision.id } });

    const jobId = `bootstrap_${revision.id}`;
    const manifest: WorldManifest = {
      mapId,
      name: 'Bootstrap Draft',
      version: 1,
      generator: { generatorId: 'saints-core', version: 1, configHash },
      dimensions: { widthChunks, depthChunks, heightChunks },
      chunkSize: { x: 32, y: 32, z: 32 },
      chunksPerRegion: CHUNKS_PER_REGION,
      activeRegions,
      metadata: {}
    };

    const job: WorldBakeJob = {
      jobId,
      revisionId: revision.id,
      manifest,
      status: 'QUEUED',
      priority: 10,
      startedAt: Date.now(),
      updatedAt: Date.now()
    };

    const config: VoxelWorldGenerationConfig = {
      id: mapId,
      name: mapId,
      widthChunks,
      depthChunks,
      heightChunks,
      blockSizePx: 64,
      mode: 'procedural',
      seed,
      baseMaterial,
      baseElevation,
    };

    if (mapType === 'FRACTAL') {
      logger.log({ stageName: '07. Bake / Generate Terrain', stageCode: 'voxel_bake', status: 'SKIPPED', message: 'Procedural terrain generated at runtime', metadata: { mapType: 'FRACTAL', terrainStrategy: 'PROCEDURAL_RUNTIME', voxelBake: 'SKIPPED' } });
      // Fractal maps don't require offline baking of chunks.
      await prisma.worldBootstrapRevision.update({
        where: { id: revision.id },
        data: { status: 'COMPLETED', jobId, completedAt: new Date() }
      });
    } else {
      logger.log({ stageName: '07. Bake / Generate Terrain', stageCode: 'voxel_bake', status: 'RUNNING', message: 'Submitting offline voxel bake job', metadata: { mapType: 'VOXEL', terrainStrategy: 'AUTHORED_BAKE', voxelBake: 'REQUIRED' } });
      await prisma.worldBootstrapRevision.update({
        where: { id: revision.id },
        data: { status: 'GENERATING', jobId }
      });

      try {
        await worldBakeService.submitJob(job, config);
      } catch (error: any) {
        const message = error?.message || 'Failed to submit voxel bake job';
        console.error(`[GenerateDraft] Failed to submit job ${jobId}`, error);
        await prisma.worldBootstrapRevision.update({
          where: { id: revision.id },
          data: { status: 'FAILED' },
        });
        logger.log({ stageName: '07. Bake / Generate Terrain', stageCode: 'voxel_bake', status: 'FAILED', message, error: message });
        return NextResponse.json({ error: message, events: logger.getEvents() }, { status: 503 });
      }
    }

    return NextResponse.json({ bootstrapRevisionId: revision.id, jobId, events: logger.getEvents() });
  } catch (error: any) {
    console.error('[GenerateDraft] Error:', error);
    return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  }
}
