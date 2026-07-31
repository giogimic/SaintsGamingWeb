import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { creature_CAMPAIGN_MAPS } from "@/web/components/the-lobby/data/campaign-maps";

/**
 * GET /api/maps/[slug] — Get a specific map by slug (CreatureMap) or id (WorldMap)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Try WorldMap first — our batch importer stores complete TMX data here
    const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
    const campaignMap = (creature_CAMPAIGN_MAPS as any)[slug];

    if (worldMap) {
      const dbLayers = JSON.parse(worldMap.tileLayersData || '[]');
      const dbTilesets = JSON.parse(worldMap.tilesetsData || '[]');

      return NextResponse.json({
        id: worldMap.id,
        gameId: worldMap.gameId,
        name: worldMap.name,
        grid: JSON.parse(worldMap.gridData || '[]'),
        gates: JSON.parse(worldMap.gatesData || '{}'),
        npcs: JSON.parse(worldMap.npcsData || '[]'),
        encounterPool: JSON.parse(worldMap.encountersData || '[]'),
        tileLayers: dbLayers.length > 0 ? dbLayers : (campaignMap?.tileLayers || []),
        tilesets: dbTilesets.length > 0 ? dbTilesets : (campaignMap?.tilesets || []),
        version: worldMap.version,
      });
    }

    // Fall back to GameMap by id
    const gameMap = await prisma.gameMap.findUnique({ where: { id: slug } });
    if (gameMap) {
      return NextResponse.json({
        id: gameMap.id,
        name: gameMap.name,
        grid: JSON.parse(gameMap.tilesetData || '[]'),
        gates: JSON.parse(gameMap.gates || '{}'),
        npcs: JSON.parse(gameMap.npcs || '[]'),
        encounterPool: JSON.parse(gameMap.encounters || '[]'),
        tileLayers: [],
        tilesets: [],
      });
    }

    // Last resort: static campaign map data
    if (campaignMap) {
      return NextResponse.json(campaignMap);
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

    const updated = await prisma.gameMap.upsert({
      where: { id: slug },
      update: {
        tilesetData: body.grid ? JSON.stringify(body.grid) : undefined,
        npcs: body.npcs ? JSON.stringify(body.npcs) : undefined,
        encounters: body.encounterPool ? JSON.stringify(body.encounterPool) : undefined,
      },
      create: {
        id: slug,
        name: body.name || slug,
        width: body.width || 24,
        height: body.height || 24,
        tilesetData: JSON.stringify(body.grid || []),
        npcs: JSON.stringify(body.npcs || []),
        encounters: JSON.stringify(body.encounterPool || []),
      }
    });

    return NextResponse.json({ success: true, map: updated });
  } catch (error) {
    console.error("Failed to update map:", error);
    return NextResponse.json({ error: "Failed to update map" }, { status: 500 });
  }
}