import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { compressChunkData, decompressChunkData } from "@/shared/game/voxel/chunkSerialization";
import { CHUNK_TOTAL_CELLS } from "@/shared/game/voxel/VoxelChunk";

export const dynamic = 'force-dynamic';

/**
 * GET /api/maps/[slug]/chunks
 * Retrieves overridden (modified) chunks for a specific map within a radius.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const cxStr = searchParams.get('cx');
    const czStr = searchParams.get('cz');
    const radiusStr = searchParams.get('radius');

    if (!cxStr || !czStr || !radiusStr) {
      return NextResponse.json({ error: 'Missing cx, cz, or radius parameters' }, { status: 400 });
    }

    const cx = parseInt(cxStr, 10);
    const cz = parseInt(czStr, 10);
    const radius = parseInt(radiusStr, 10);

    const minCx = cx - radius;
    const maxCx = cx + radius;
    const minCz = cz - radius;
    const maxCz = cz + radius;

    const chunks = await prisma.mapChunk.findMany({
      where: {
        mapId: params.slug,
        cx: { gte: minCx, lte: maxCx },
        cz: { gte: minCz, lte: maxCz }
      }
    });

    const responseChunks = chunks.map(chunk => {
      const data = decompressChunkData(chunk.data);
      return {
        cx: chunk.cx,
        cy: chunk.cy,
        cz: chunk.cz,
        data: Array.from(data) // Convert to standard array for JSON transport
      };
    });

    return NextResponse.json({ chunks: responseChunks }, { status: 200 });
  } catch (error: any) {
    console.error("[MapChunk API] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/maps/[slug]/chunks
 * Saves delta modifications to specific chunks.
 */
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    // Basic auth check
    // In production, we'd use verifyStudioPermission here
    
    const body = await req.json();
    if (!Array.isArray(body.chunks)) {
      return NextResponse.json({ error: 'Expected chunks array' }, { status: 400 });
    }

    for (const chunk of body.chunks) {
      if (typeof chunk.cx !== 'number' || typeof chunk.cz !== 'number' || !Array.isArray(chunk.data)) {
        continue;
      }
      
      const cy = chunk.cy || 0;
      const dataArray = new Uint32Array(chunk.data);
      if (dataArray.length !== CHUNK_TOTAL_CELLS) continue;

      const compressedData = compressChunkData(dataArray);

      await prisma.mapChunk.upsert({
        where: {
          mapId_cx_cy_cz: {
            mapId: params.slug,
            cx: chunk.cx,
            cy: cy,
            cz: chunk.cz
          }
        },
        update: {
          data: compressedData,
          updatedAt: new Date()
        },
        create: {
          mapId: params.slug,
          cx: chunk.cx,
          cy: cy,
          cz: chunk.cz,
          data: compressedData
        }
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("[MapChunk API] PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
