import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

/**
 * GET /api/maps/[slug] — Load a map from WorldMap (primary) or GameMap (fallback).
 * Campaign map payloads are no longer imported from the 12MB static module.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
    if (worldMap) {
      return NextResponse.json({
        id: worldMap.id,
        gameId: worldMap.gameId,
        name: worldMap.name,
        grid: JSON.parse(worldMap.gridData || "[]"),
        gates: JSON.parse(worldMap.gatesData || "{}"),
        npcs: JSON.parse(worldMap.npcsData || "[]"),
        encounterPool: JSON.parse(worldMap.encountersData || "[]"),
        tileLayers: JSON.parse(worldMap.tileLayersData || "[]"),
        tilesets: JSON.parse(worldMap.tilesetsData || "[]"),
        version: worldMap.version,
        source: "worldMap",
      });
    }

    const gameMap = await prisma.gameMap.findUnique({ where: { id: slug } });
    if (gameMap) {
      return NextResponse.json({
        id: gameMap.id,
        name: gameMap.name,
        width: gameMap.width,
        height: gameMap.height,
        grid: JSON.parse(gameMap.tilesetData || "[]"),
        gates: JSON.parse(gameMap.gates || "{}"),
        npcs: JSON.parse(gameMap.npcs || "[]"),
        encounterPool: JSON.parse(gameMap.encounters || "[]"),
        tileLayers: [],
        tilesets: [],
        source: "gameMap",
      });
    }

    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  } catch (error) {
    console.error("Failed to fetch map:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}

/**
 * POST /api/maps/[slug] — Upsert WorldMap (+ GameMap collision mirror). Admin/dev only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { slug } = await params;
    const body = await request.json();
    const grid = body.grid || [];
    const height = Array.isArray(grid) ? grid.length || body.height || 24 : body.height || 24;
    const width = Array.isArray(grid?.[0]) ? grid[0].length : body.width || 24;

    const worldMap = await prisma.worldMap.upsert({
      where: { id: slug },
      update: {
        name: body.name || slug,
        gameId: body.gameId || "tuxemon",
        ...(body.grid ? { gridData: JSON.stringify(body.grid) } : {}),
        ...(body.gates ? { gatesData: JSON.stringify(body.gates) } : {}),
        ...(body.npcs ? { npcsData: JSON.stringify(body.npcs) } : {}),
        ...(body.encounterPool ? { encountersData: JSON.stringify(body.encounterPool) } : {}),
        ...(body.tileLayers ? { tileLayersData: JSON.stringify(body.tileLayers) } : {}),
        ...(body.tilesets ? { tilesetsData: JSON.stringify(body.tilesets) } : {}),
        version: { increment: 1 },
      },
      create: {
        id: slug,
        gameId: body.gameId || "tuxemon",
        name: body.name || slug,
        gridData: JSON.stringify(body.grid || []),
        gatesData: JSON.stringify(body.gates || {}),
        npcsData: JSON.stringify(body.npcs || []),
        encountersData: JSON.stringify(body.encounterPool || []),
        tileLayersData: JSON.stringify(body.tileLayers || []),
        tilesetsData: JSON.stringify(body.tilesets || []),
      },
    });

    await prisma.gameMap.upsert({
      where: { id: slug },
      update: {
        name: body.name || slug,
        width,
        height,
        ...(body.grid ? { tilesetData: JSON.stringify(body.grid) } : {}),
        ...(body.gates ? { gates: JSON.stringify(body.gates) } : {}),
        ...(body.npcs ? { npcs: JSON.stringify(body.npcs) } : {}),
        ...(body.encounterPool ? { encounters: JSON.stringify(body.encounterPool) } : {}),
      },
      create: {
        id: slug,
        name: body.name || slug,
        width,
        height,
        tilesetData: JSON.stringify(body.grid || []),
        gates: JSON.stringify(body.gates || {}),
        npcs: JSON.stringify(body.npcs || []),
        encounters: JSON.stringify(body.encounterPool || []),
      },
    });

    return NextResponse.json({ success: true, map: { id: worldMap.id, version: worldMap.version } });
  } catch (error) {
    console.error("Failed to update map:", error);
    return NextResponse.json({ error: "Failed to update map" }, { status: 500 });
  }
}
