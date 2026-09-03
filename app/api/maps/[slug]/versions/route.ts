import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/maps/[slug]/versions
 * Lists all historical published versions of a map.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [worldMap, history] = await Promise.all([
      prisma.worldMap.findUnique({
        where: { id: slug },
        select: { version: true, publishedVersion: true, updatedAt: true },
      }),
      prisma.worldMapVersion.findMany({
        where: { mapId: slug },
        select: {
          version: true,
          name: true,
          description: true,
          publishedBy: true,
          createdAt: true,
        },
        orderBy: { version: 'desc' },
      }),
    ]);

    if (!worldMap) {
      return NextResponse.json({ error: `Map not found: ${slug}` }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mapId: slug,
      currentEditorVersion: worldMap.version,
      currentPublishedVersion: worldMap.publishedVersion ?? 0,
      versions: history,
    });
  } catch (error: any) {
    console.error("Failed to fetch map versions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch map versions" },
      { status: 500 }
    );
  }
}
