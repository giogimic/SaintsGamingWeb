import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/maps/[slug] — Get a specific map by slug (TuxemonMap) or id (WorldMap)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Try TuxemonMap by slug first
    const tuxMap = await prisma.tuxemonMap.findUnique({ where: { slug } });
    if (tuxMap) {
      return NextResponse.json(tuxMap);
    }

    // Fall back to WorldMap by id (supports numeric/uuid lookups)
    const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
    if (worldMap) {
      return NextResponse.json({
        id: worldMap.id,
        gameId: worldMap.gameId,
        name: worldMap.name,
        grid: JSON.parse(worldMap.gridData || '[]'),
        gates: JSON.parse(worldMap.gatesData || '{}'),
        npcs: JSON.parse(worldMap.npcsData || '[]'),
        encounterPool: JSON.parse(worldMap.encountersData || '[]'),
        tileLayers: JSON.parse(worldMap.tileLayersData || '[]'),
        tilesets: JSON.parse(worldMap.tilesetsData || '[]'),
        version: worldMap.version,
      });
    }

    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to fetch map:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}

/**
 * POST /api/maps/[slug] — Update or create map configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const updated = await prisma.tuxemonMap.upsert({
      where: { slug },
      update: {
        tilesetData: body.grid ? JSON.stringify(body.grid) : undefined,
        npcData: body.npcs ? JSON.stringify(body.npcs) : undefined,
        encounterZone: body.encounterPool ? JSON.stringify(body.encounterPool) : undefined,
      },
      create: {
        slug,
        name: body.name || slug,
        width: body.width || 24,
        height: body.height || 24,
        tilesetData: JSON.stringify(body.grid || []),
        collisionData: JSON.stringify([]),
        npcData: JSON.stringify(body.npcs || []),
        encounterZone: JSON.stringify(body.encounterPool || []),
      }
    });

    return NextResponse.json({ success: true, map: updated });
  } catch (error) {
    console.error("Failed to update map:", error);
    return NextResponse.json({ error: "Failed to update map" }, { status: 500 });
  }
}