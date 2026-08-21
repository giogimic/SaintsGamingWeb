import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { validateMapSave } from "@/shared/game/mapSaveValidation";
import { normalizeStudioMapVisuals } from "@/shared/game/studioMapCreate";
import { ensureStudioMapFoundation } from "@/server/DemoBootstrap";
import { notifyGoMapSynced } from "@/server/goMmoNotify";
import { DEMO_MAP_ID } from "@/server/demoMapSeed";
import { resolveMapDimensions } from "@/shared/game/mapDocVisual";
import { npcToEntity } from "@/shared/game/entities";

export const dynamic = 'force-dynamic';

async function loadMapPayload(slug: string) {
  const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
  if (worldMap) {
    const grid = JSON.parse(worldMap.gridData || "[]");
    const tileLayers = JSON.parse(worldMap.tileLayersData || "[]");
    const tilesets = JSON.parse(worldMap.tilesetsData || "[]");
    const dims = resolveMapDimensions({ grid, tileLayers });
    const rawGates = JSON.parse(worldMap.gatesData || "{}");
    const connections = rawGates.connections || undefined;
    const actualGates = rawGates.gates !== undefined ? rawGates.gates : rawGates;
    const spawnPoint = rawGates.spawnPoint || (Array.isArray(actualGates) ? actualGates.find((g: any) => g.id === 'spawn' || g.category === 'SPAWN')?.position : undefined) || { x: Math.floor(dims.width / 2), y: Math.floor(dims.height / 2) };
    return {
      id: worldMap.id,
      gameId: worldMap.gameId,
      name: worldMap.name,
      width: dims.width,
      height: dims.height,
      grid: grid,
      gates: actualGates,
      connections: connections,
      spawnPoint,
      npcs: JSON.parse(worldMap.npcsData || "[]"),
      encounterPool: JSON.parse(worldMap.encountersData || "[]"),
      tileLayers,
      tilesets,
      version: worldMap.version,
      source: "worldMap" as const,
    };
  }

  const gameMap = await prisma.gameMap.findUnique({ where: { id: slug } });
  if (gameMap) {
    const rawGates = JSON.parse(gameMap.gates || "{}");
    const connections = rawGates.connections || undefined;
    const actualGates = rawGates.gates !== undefined ? rawGates.gates : rawGates;
    const spawnPoint = rawGates.spawnPoint || (Array.isArray(actualGates) ? actualGates.find((g: any) => g.id === 'spawn' || g.category === 'SPAWN')?.position : undefined) || { x: Math.floor(gameMap.width / 2), y: Math.floor(gameMap.height / 2) };
    return {
      id: gameMap.id,
      name: gameMap.name,
      width: gameMap.width,
      height: gameMap.height,
      grid: JSON.parse(gameMap.tilesetData || "[]"),
      gates: actualGates,
      connections: connections,
      spawnPoint,
      npcs: JSON.parse(gameMap.npcs || "[]"),
      encounterPool: JSON.parse(gameMap.encounters || "[]"),
      tileLayers: [],
      tilesets: [],
      source: "gameMap" as const,
    };
  }

  return null;
}

/**
 * GET /api/maps/[slug] — Load a map from WorldMap (primary) or GameMap (fallback).
 * Campaign map payloads are no longer imported from the 12MB static module.
 * Missing DEMO_SANDBOX triggers lazy DemoBootstrap (production empty-DB heal).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let payload = await loadMapPayload(slug);
    if (!payload && (slug === DEMO_MAP_ID || slug.toUpperCase() === DEMO_MAP_ID || slug.toUpperCase() === 'LOBBY')) {
      await ensureStudioMapFoundation();
      payload = await loadMapPayload(slug.toUpperCase());
      if (!payload) {
        payload = await loadMapPayload(slug);
      }
    }

    if (!payload) {
      return NextResponse.json({ error: `Map '${slug}' not found` }, { status: 404 });
    }
    return NextResponse.json(payload);
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
      return NextResponse.json(
        { error: "Unauthorized — sign in required to create or save maps." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json(
        {
          error:
            "Forbidden — Admin+ (permission level 400) required to create or save maps.",
        },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const body = await request.json();
    const grid = body.grid || [];
    const dims = resolveMapDimensions({
      grid: Array.isArray(grid) ? grid : [],
      tileLayers: Array.isArray(body.tileLayers) ? body.tileLayers : undefined,
      width: body.width,
      height: body.height,
    });
    const width = dims.width;
    const height = dims.height;

    // Bible 08/16: reject trapped spawns, unknown logic ids, bad NPC placement when grid is sent.
    if (Array.isArray(body.grid)) {
      let logicTiles = await prisma.mapLogicTile.findMany({
        select: { id: true, isSolid: true },
      });
      // Empty logic catalog → create map always 400; heal from demo seed first.
      if (logicTiles.length === 0) {
        await ensureStudioMapFoundation();
        logicTiles = await prisma.mapLogicTile.findMany({
          select: { id: true, isSolid: true },
        });
      }
      const check = validateMapSave(
        { grid: body.grid, npcs: Array.isArray(body.npcs) ? body.npcs : [] },
        logicTiles
      );
      if (!check.ok) {
        return NextResponse.json(
          { error: check.error, details: check.details },
          { status: 400 }
        );
      }
    }

    // Repair missing tilesets / blank Ground / logic→visual copies when visuals
    // are part of this write. Do not invent layers on grid-only updates.
    const writingVisuals =
      Array.isArray(body.tileLayers) || Array.isArray(body.tilesets);
    const visualsForWrite = writingVisuals
      ? normalizeStudioMapVisuals({
          grid: Array.isArray(body.grid) ? body.grid : undefined,
          tileLayers: Array.isArray(body.tileLayers) ? body.tileLayers : [],
          tilesets: Array.isArray(body.tilesets) ? body.tilesets : [],
        })
      : null;
    // New maps always get a visible Ground + tilesets even if the client omitted them.
    const visualsForCreate =
      visualsForWrite ??
      normalizeStudioMapVisuals({
        grid: Array.isArray(body.grid) ? body.grid : undefined,
        tileLayers: [],
        tilesets: [],
      });

    // Dual-write entitiesData (Bible 20 §20 E2)
    const entitiesPayload = Array.isArray(body.entities)
      ? body.entities
      : (body.npcs || []).map((npc: any) => npcToEntity(npc));

    // Preserve existing Atlas connections if not explicitly overwritten
    let existingConns = body.connections;
    if (!existingConns) {
      try {
        const existingRow = await prisma.worldMap.findUnique({ where: { id: slug }, select: { gatesData: true } });
        if (existingRow?.gatesData) {
          const parsed = JSON.parse(existingRow.gatesData);
          if (parsed?.connections) existingConns = parsed.connections;
        }
      } catch {}
    }

    const rawGatesToSave = body.gates;
    let serializedGatesData: string | undefined = undefined;
    if (rawGatesToSave !== undefined || existingConns !== undefined) {
      if (existingConns) {
        const baseGates = rawGatesToSave !== undefined 
          ? (Array.isArray(rawGatesToSave) ? rawGatesToSave : (rawGatesToSave?.gates || rawGatesToSave))
          : [];
        serializedGatesData = JSON.stringify({ gates: baseGates, connections: existingConns });
      } else if (rawGatesToSave !== undefined) {
        serializedGatesData = typeof rawGatesToSave === 'string' ? rawGatesToSave : JSON.stringify(rawGatesToSave);
      }
    }

    const worldMap = await prisma.worldMap.upsert({
      where: { id: slug },
      update: {
        name: body.name || slug,
        gameId: body.gameId || "tuxemon",
        ...(body.grid ? { gridData: JSON.stringify(body.grid) } : {}),
        ...(serializedGatesData !== undefined ? { gatesData: serializedGatesData } : {}),
        ...(body.npcs ? { npcsData: JSON.stringify(body.npcs) } : {}),
        ...(body.encounterPool ? { encountersData: JSON.stringify(body.encounterPool) } : {}),
        entitiesData: JSON.stringify(entitiesPayload),
        ...(visualsForWrite
          ? {
              tileLayersData: JSON.stringify(visualsForWrite.tileLayers || []),
              tilesetsData: JSON.stringify(visualsForWrite.tilesets || []),
            }
          : {}),
        version: { increment: 1 },
      },
      create: {
        id: slug,
        gameId: body.gameId || "tuxemon",
        name: body.name || slug,
        gridData: JSON.stringify(body.grid || []),
        gatesData: serializedGatesData || JSON.stringify(body.gates || {}),
        npcsData: JSON.stringify(body.npcs || []),
        encountersData: JSON.stringify(body.encounterPool || []),
        entitiesData: JSON.stringify(entitiesPayload),
        tileLayersData: JSON.stringify(visualsForCreate.tileLayers || []),
        tilesetsData: JSON.stringify(visualsForCreate.tilesets || []),
      },
    });

    await prisma.gameMap.upsert({
      where: { id: slug },
      update: {
        name: body.name || slug,
        width,
        height,
        ...(body.grid ? { tilesetData: JSON.stringify(body.grid) } : {}),
        ...(serializedGatesData !== undefined ? { gates: serializedGatesData } : {}),
        ...(body.npcs ? { npcs: JSON.stringify(body.npcs) } : {}),
        ...(body.encounterPool ? { encounters: JSON.stringify(body.encounterPool) } : {}),
      },
      create: {
        id: slug,
        name: body.name || slug,
        width,
        height,
        tilesetData: JSON.stringify(body.grid || []),
        gates: serializedGatesData || JSON.stringify(body.gates || {}),
        npcs: JSON.stringify(body.npcs || []),
        encounters: JSON.stringify(body.encounterPool || []),
      },
    });

    // Hybrid: Next remains map writer; push live world to Go when enabled.
    void notifyGoMapSynced({
      id: worldMap.id,
      name: worldMap.name,
      gridData: body.grid ?? JSON.parse(worldMap.gridData || "[]"),
      npcsData: body.npcs ?? JSON.parse(worldMap.npcsData || "[]"),
      tileLayersData: visualsForWrite?.tileLayers ?? JSON.parse(worldMap.tileLayersData || "[]"),
      tilesetsData: visualsForWrite?.tilesets ?? JSON.parse(worldMap.tilesetsData || "[]"),
    });

    return NextResponse.json({ success: true, map: { id: worldMap.id, version: worldMap.version } });
  } catch (error) {
    console.error("Failed to update map:", error);
    const message = error instanceof Error ? error.message : "Failed to update map";
    return NextResponse.json(
      { error: "Failed to update map", details: [message] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/maps/[slug] — Delete a map from WorldMap and GameMap tables. Admin/dev only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized — sign in required to delete maps." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json(
        { error: "Forbidden — Admin+ (permission level 400) required to delete maps." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
      return NextResponse.json({ error: "Invalid map identifier" }, { status: 400 });
    }

    if (normalizedSlug.toUpperCase() === 'LOBBY') {
      return NextResponse.json(
        { error: "Cannot delete the default root hub map." },
        { status: 400 }
      );
    }

    await prisma.worldMap.deleteMany({ where: { id: normalizedSlug } });
    await prisma.gameMap.deleteMany({ where: { id: normalizedSlug } });

    return NextResponse.json({ success: true, deleted: normalizedSlug });
  } catch (error) {
    console.error("Failed to delete map:", error);
    const message = error instanceof Error ? error.message : "Failed to delete map";
    return NextResponse.json(
      { error: "Failed to delete map", details: [message] },
      { status: 500 }
    );
  }
}

