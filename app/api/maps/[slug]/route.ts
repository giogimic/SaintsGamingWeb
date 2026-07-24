import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/maps/[slug] — Get a specific map
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const map = await prisma.tuxemonMap.findUnique({
      where: { slug },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    return NextResponse.json(map);
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