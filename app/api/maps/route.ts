import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/maps — List all maps
 */
export async function GET() {
  try {
    const maps = await prisma.tuxemonMap.findMany({
      select: {
        slug: true,
        name: true,
        width: true,
        height: true,
        environment: true,
        isIndoors: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(maps);
  } catch (error) {
    console.error("Failed to fetch maps:", error);
    return NextResponse.json({ error: "Failed to fetch maps" }, { status: 500 });
  }
}

/**
 * POST /api/maps — Create or update a map
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, name, width, height, tileSize, tilesetData, collisionData, npcData, triggerData, encounterZone, music, environment, isIndoors } = body;

    if (!slug || !name || !width || !height) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const map = await prisma.tuxemonMap.upsert({
      where: { slug },
      update: {
        name,
        width,
        height,
        tileSize: tileSize || 16,
        tilesetData,
        collisionData,
        npcData,
        triggerData,
        encounterZone,
        music,
        environment,
        isIndoors: isIndoors || false,
        version: { increment: 1 },
      },
      create: {
        slug,
        name,
        width,
        height,
        tileSize: tileSize || 16,
        tilesetData,
        collisionData,
        npcData,
        triggerData,
        encounterZone,
        music,
        environment,
        isIndoors: isIndoors || false,
      },
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Failed to save map:", error);
    return NextResponse.json({ error: "Failed to save map" }, { status: 500 });
  }
}