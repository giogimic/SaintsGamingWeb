import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { generateChunkVoxels, type VoxelWorldGenerationConfig } from "@/shared/game/voxel/VoxelWorldGenerator";
import { buildAtlasWorld } from "@/shared/game/atlas/world/AtlasWorldBuilder";
import { AtlasRegionResolver } from "@/shared/game/atlas/world/AtlasRegionResolver";

/**
 * POST /api/internal/generate-chunks
 * Internal JIT Chunk Generation API for the Go Server.
 * Secures access via an internal secret instead of cookies.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify Internal Secret
    const internalSecret = req.headers.get("x-internal-secret");
    if (!internalSecret || internalSecret !== process.env.INTERNAL_RPC_SECRET) {
      return NextResponse.json({ error: "Unauthorized Internal RPC" }, { status: 401 });
    }

    const body = await req.json();
    const mapId = body.mapId;
    const requestedChunks: {cx: number, cz: number}[] = body.chunks;

    if (!mapId || !Array.isArray(requestedChunks) || requestedChunks.length === 0) {
      return NextResponse.json({ error: "Invalid payload. Expected mapId and chunks array" }, { status: 400 });
    }

    // 2. Fetch Map
    const map = await prisma.worldMap.findUnique({
      where: { id: mapId },
      select: { voxelData: true, mapType: true }
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    if (map.mapType !== 'FRACTAL') {
      return NextResponse.json({ error: "Only FRACTAL maps support JIT generation" }, { status: 400 });
    }

    const voxelDoc = map.voxelData as any;
    if (!voxelDoc || !voxelDoc.chunks || !voxelDoc.generationMetadata) {
      return NextResponse.json({ error: "Map is missing generation metadata or chunks array" }, { status: 400 });
    }

    const meta = voxelDoc.generationMetadata;
    const config: VoxelWorldGenerationConfig = {
      id: mapId,
      name: mapId,
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

    // Map existing chunks by key to avoid overwriting
    const existingChunkKeys = new Set<string>();
    if (voxelDoc.chunks) {
      for (const key of Object.keys(voxelDoc.chunks)) {
        existingChunkKeys.add(key);
      }
    } else {
      voxelDoc.chunks = {};
    }

    const generatedChunks = [];

    // 3. Generate requested chunks
    for (const reqChunk of requestedChunks) {
      const cx = reqChunk.cx;
      const cz = reqChunk.cz;

      for (let cy = 0; cy < (config.heightChunks || 1); cy++) {
        const key = `${cx}_${cz}_${cy}`;
        if (existingChunkKeys.has(key)) {
          continue; 
        }

        const chunk = generateChunkVoxels(cx, cz, cy, config, atlasContext, atlasResolver);
        const serialized = Array.from(chunk.serializePaletteRLEBinary());
        voxelDoc.chunks[key] = serialized;
        generatedChunks.push(serialized);
        existingChunkKeys.add(key);
      }
    }

    if (generatedChunks.length > 0) {
      await prisma.worldMap.update({
        where: { id: mapId },
        data: {
          voxelData: voxelDoc,
          version: { increment: 1 },
          updatedAt: new Date(),
        }
      });
    }

    // 4. Return the new chunks to the Go server
    return NextResponse.json({ ok: true, generatedChunks });
  } catch (err: any) {
    console.error("Failed to generate chunks via internal RPC:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
