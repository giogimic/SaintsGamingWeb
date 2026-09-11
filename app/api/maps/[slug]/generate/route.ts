import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";
import { generateChunkVoxels, type VoxelWorldGenerationConfig } from "@/shared/game/voxel/VoxelWorldGenerator";
import { buildAtlasWorld } from "@/shared/game/atlas/world/AtlasWorldBuilder";
import { AtlasRegionResolver } from "@/shared/game/atlas/world/AtlasRegionResolver";
import { VoxelChunk } from "@/shared/game/voxel/VoxelChunk";

/**
 * POST /api/maps/[slug]/generate
 * Pregenerates a radius of chunks for a procedural fractal map.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const authCheck = await verifyStudioPermission(req, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }

    const body = await req.json();
    const radius = Math.max(0, parseInt(body.radius) || 0);

    const map = await prisma.worldMap.findUnique({
      where: { id: slug },
      select: { mapType: true }
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    if (map.mapType !== 'FRACTAL') {
      return NextResponse.json({ error: "Only FRACTAL maps support on-demand generation" }, { status: 400 });
    }

    const { VoxelStorageService } = await import('@/server/services/VoxelStorageService');
    const voxelDoc = await VoxelStorageService.getVoxelDoc(slug) as any;
    if (!voxelDoc || !voxelDoc.chunks || !voxelDoc.generationMetadata) {
      return NextResponse.json({ error: "Map is missing generation metadata or chunks array" }, { status: 400 });
    }

    const meta = voxelDoc.generationMetadata;
    const config: VoxelWorldGenerationConfig = {
      id: slug,
      name: slug,
      widthChunks: 1,
      depthChunks: 1,
      heightChunks: voxelDoc.dimensions?.heightChunks || 1,
      blockSizePx: 64,
      mode: meta.mode || 'procedural',
      seed: meta.seed || 1337,
      baseMaterial: meta.baseMaterial,
      baseElevation: meta.baseElevation,
      elevationRange: meta.elevationRange,
      waterLevel: meta.waterLevel,
    };

    const atlasContext = buildAtlasWorld(config.seed || 1337);
    const atlasResolver = new AtlasRegionResolver();

    // Map existing chunks by key to avoid overwriting modified chunks
    const existingChunkKeys = new Set<string>();
    if (voxelDoc.chunks) {
      for (const key of Object.keys(voxelDoc.chunks)) {
        existingChunkKeys.add(key);
      }
    } else {
      voxelDoc.chunks = {};
    }

    let generatedCount = 0;
    for (let cz = -radius; cz <= radius; cz++) {
      for (let cx = -radius; cx <= radius; cx++) {
        for (let cy = 0; cy < (config.heightChunks || 1); cy++) {
          const key = `${cx}_${cz}_${cy}`;
          if (existingChunkKeys.has(key)) {
            continue; // Skip already generated chunks
          }

          const chunk = generateChunkVoxels(cx, cz, cy, config, atlasContext, atlasResolver);
          voxelDoc.chunks[key] = Array.from(chunk.serializePaletteRLEBinary());
          existingChunkKeys.add(key);
          generatedCount++;
        }
      }
    }

    if (generatedCount > 0) {
      await prisma.worldMap.update({
        where: { id: slug },
        data: {
          version: { increment: 1 },
          updatedAt: new Date(),
        }
      });
      await (await import('@/server/services/VoxelStorageService')).VoxelStorageService.saveVoxelDoc(voxelDoc);
    }

    return NextResponse.json({ ok: true, generatedCount });
  } catch (err: any) {
    console.error("Failed to generate radius:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
