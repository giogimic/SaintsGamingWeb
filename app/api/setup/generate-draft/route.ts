import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { worldBakeService } from "@/server/services/bake/WorldBakeService";
import { WorldBakeJob, WorldManifest } from "@/shared/game/voxel/WorldBakeContracts";
import { VoxelWorldGenerationConfig } from "@/shared/game/voxel/VoxelWorldGenerator";
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const mapId = body.mapId || 'STARTING_MEADOW';
    const seed = body.seed || Date.now().toString();
    const widthChunks = Number(body.widthChunks) || 4;
    const depthChunks = Number(body.depthChunks) || 4;
    const heightChunks = Number(body.heightChunks) || 1;
    const baseMaterial = Number(body.baseMaterial) || 2;
    const baseElevation = Number(body.baseElevation) || 16;
    
    const CHUNKS_PER_REGION = 8;
    const regionsX = Math.ceil(widthChunks / CHUNKS_PER_REGION);
    const regionsZ = Math.ceil(depthChunks / CHUNKS_PER_REGION);
    
    const activeRegions = [];
    for (let rz = 0; rz < regionsZ; rz++) {
      for (let rx = 0; rx < regionsX; rx++) {
        activeRegions.push({ mapId, regionX: rx, regionZ: rz });
      }
    }

    const configHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    // 1. Create Revision
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

    // 2. Submit Bake Job
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

    await prisma.worldBootstrapRevision.update({
      where: { id: revision.id },
      data: { status: 'GENERATING', jobId }
    });

    // Submit asynchronously, do not await it
    worldBakeService.submitJob(job, config).catch(e => {
      console.error(`[GenerateDraft] Failed to submit job ${jobId}`, e);
    });

    // 3. Return IDs immediately
    return NextResponse.json({
      bootstrapRevisionId: revision.id,
      jobId
    });
    
  } catch (error: any) {
    console.error('[GenerateDraft] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
