import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent, STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { validateMapSave, validateVoxelDocSave } from "@/shared/game/mapSaveValidation";
import { normalizeStudioMapVisuals, buildBorderedLogicGrid } from "@/shared/game/studioMapCreate";
import { notifyGoMapSynced } from "@/server/goMmoNotify";
import { resolveMapDimensions } from "@/shared/game/mapDocVisual";
import { DEFAULT_STUDIO_TILESETS } from "@/shared/game/studioTilesetBootstrap";
import { npcToEntity } from "@/shared/game/entities";
import { AuditService } from "@/server/audit/AuditService";
import { MapSyncService } from "@/server/mapSyncService";
import { generateDefaultWorldDoc } from "@/shared/game/voxel/VoxelWorldDoc";
import { generateGridFromVoxelDoc } from "@/shared/game/voxel/voxelToGrid";
import { migrateLegacyDocTo32Cubic } from "@/shared/game/voxel/chunkMigration";
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from "@/shared/game/voxel/VoxelChunk";


export const dynamic = 'force-dynamic';

async function loadMapPayload(slug: string, isDraft?: boolean) {
  let worldMap;
  if (isDraft) {
    worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
  }
  if (!worldMap) {
    worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
  }
  if (worldMap) {
    let grid = [];
    try {
      grid = JSON.parse(worldMap.gridData || "[]");
    } catch {
      grid = [];
    }

    let tileLayers: any[] = [];
    let voxelDoc: any = undefined;

    // 1. Authoritative native voxelData column
    if (worldMap.voxelData) {
      try {
        const parsedNative = JSON.parse(worldMap.voxelData);
        if (parsedNative && parsedNative.formatVersion === 3) {
          voxelDoc = parsedNative;
        }
      } catch (e) {
        console.warn(`[MapAPI] Failed to parse native voxelData for ${slug}:`, e);
      }
    }

    try {
      const parsed = JSON.parse(worldMap.tileLayersData || "[]");
      if (Array.isArray(parsed)) {
        tileLayers = parsed;
      } else if (!voxelDoc && parsed && typeof parsed === 'object' && parsed.formatVersion === 3) {
        voxelDoc = parsed;
      }
    } catch {
      tileLayers = [];
    }

    if (!voxelDoc) {
      try {
        const parsedGrid = JSON.parse(worldMap.gridData || "{}");
        if (parsedGrid && typeof parsedGrid === 'object' && parsedGrid.formatVersion === 3) {
          voxelDoc = parsedGrid;
        }
      } catch {}
    }

    let tilesets = [];
    try {
      tilesets = JSON.parse(worldMap.tilesetsData || "[]");
    } catch {
      tilesets = [];
    }
    if (!Array.isArray(tilesets) || tilesets.length === 0) {
      tilesets = DEFAULT_STUDIO_TILESETS;
    }

    const dims = resolveMapDimensions({ grid, tileLayers });

    let freeformLayers: any[] = [];
    try {
      freeformLayers = JSON.parse(worldMap.freeformLayersData || "[]");
    } catch {
      freeformLayers = [];
    }

    if (!voxelDoc && Array.isArray(freeformLayers)) {
      const voxelLayer = freeformLayers.find((l: any) => l.type === 'voxel' || l.id === 'voxel_world_doc');
      if (voxelLayer && voxelLayer.voxelDoc) {
        voxelDoc = voxelLayer.voxelDoc;
      }
    }
    const cleanFreeformLayers = Array.isArray(freeformLayers)
      ? freeformLayers.filter((l: any) => l.type !== 'voxel' && l.id !== 'voxel_world_doc')
      : [];

    if (voxelDoc) {
      voxelDoc = migrateLegacyDocTo32Cubic(voxelDoc);
      voxelDoc.mapWidth = dims.width;
      voxelDoc.mapHeight = dims.height;
    } else {
      voxelDoc = generateDefaultWorldDoc(
        Math.max(1, Math.ceil(dims.width / CHUNK_SIZE_X)),
        Math.max(1, Math.ceil(dims.height / CHUNK_SIZE_Z)),
        64,
        dims.width,
        dims.height
      );
      voxelDoc.id = worldMap.id;
      voxelDoc.name = worldMap.name;
    }

    const rawGates = JSON.parse(worldMap.gatesData || "{}");
    const connections = rawGates.connections || undefined;
    const actualGates = rawGates.gates !== undefined ? rawGates.gates : rawGates;
    const spawnPoint = rawGates.spawnPoint || (Array.isArray(actualGates) ? actualGates.find((g: any) => g.id === 'spawn' || g.category === 'SPAWN')?.position : undefined) || { x: Math.floor(dims.width / 2), y: Math.floor(dims.height / 2) };
    const cameraStyle = rawGates.cameraStyle || undefined;
    const allowCustomCamera = rawGates.allowCustomCamera ?? undefined;
    const defaultCameraStyle = rawGates.defaultCameraStyle || cameraStyle;
    
    if (!Array.isArray(grid) || grid.length === 0) {
      grid = generateGridFromVoxelDoc(voxelDoc, dims.width, dims.height);
    }

    let parsedProceduralConfig: any = undefined;
    if ((worldMap as any).proceduralConfig) {
      try {
        parsedProceduralConfig = JSON.parse((worldMap as any).proceduralConfig);
      } catch {}
    }

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
      cameraStyle,
      allowCustomCamera,
      allowCustomPlayerCamera: allowCustomCamera,
      defaultCameraStyle,
      npcs: JSON.parse(worldMap.npcsData || "[]"),
      encounterPool: JSON.parse(worldMap.encountersData || "[]"),
      tileLayers,
      freeformLayers: cleanFreeformLayers,
      tilesets,
      voxelDoc,
      regionClass: (worldMap as any).regionClass || "authored",
      proceduralConfig: parsedProceduralConfig,
      mapType: (worldMap as any).mapType || "HYBRID",
      version: worldMap.version,
      publishedVersion: (worldMap as any).publishedVersion ?? 0,
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
      cameraStyle: rawGates.cameraStyle || undefined,
      allowCustomCamera: rawGates.allowCustomCamera ?? undefined,
      allowCustomPlayerCamera: rawGates.allowCustomCamera ?? undefined,
      defaultCameraStyle: rawGates.defaultCameraStyle || rawGates.cameraStyle || undefined,
      npcs: JSON.parse(gameMap.npcs || "[]"),
      encounterPool: JSON.parse(gameMap.encounters || "[]"),
      tileLayers: [],
      tilesets: [],
      voxelDoc: generateDefaultWorldDoc(
        Math.max(1, Math.ceil(gameMap.width / 32)),
        Math.max(1, Math.ceil(gameMap.height / 32)),
        64
      ),
      mapType: "TILE",
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
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const isDraft = request.nextUrl.searchParams.get("draft") === "true";

    let payload = await loadMapPayload(slug, isDraft);
    if (!payload) {
      payload = await loadMapPayload(slug.toUpperCase(), isDraft);
    }

    if (!payload) {
      // Pristine realm / missing map — return a blank canvas instead of 404
      // so the lobby and Studio can always render something interactive.
      const blankW = 30, blankH = 30;
      payload = {
        id: slug,
        gameId: 'saints',
        name: slug.replace(/_/g, ' '),
        width: blankW,
        height: blankH,
        grid: Array.from({ length: blankH }, () => Array(blankW).fill(0)),
        gates: [],
        connections: undefined,
        spawnPoint: { x: Math.floor(blankW / 2), y: Math.floor(blankH / 2) },
        cameraStyle: undefined,
        allowCustomCamera: undefined,
        allowCustomPlayerCamera: undefined,
        defaultCameraStyle: undefined,
        npcs: [],
        encounterPool: [],
        tileLayers: [],
        freeformLayers: [],
        tilesets: [],
        voxelDoc: generateDefaultWorldDoc(
          Math.max(1, Math.ceil(blankW / CHUNK_SIZE_X)),
          Math.max(1, Math.ceil(blankH / CHUNK_SIZE_Z)),
          64,
          blankW,
          blankH
        ),
        regionClass: 'authored',
        proceduralConfig: undefined,
        mapType: "HYBRID",
        version: 0,
        publishedVersion: 0,
        source: 'worldMap' as const,
      };
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
    const authCheck = await verifyStudioPermission(request, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }
    const user = authCheck.user;

    const { slug } = await params;
    const body = await request.json();
    const rawGrid = body.grid;
    const dims = resolveMapDimensions({
      grid: Array.isArray(rawGrid) && rawGrid.length > 0 ? rawGrid : [],
      tileLayers: Array.isArray(body.tileLayers) ? body.tileLayers : undefined,
      width: body.width,
      height: body.height,
    });
    const width = dims.width;
    const height = dims.height;

    let grid = rawGrid;

    let voxelDoc = body.voxelDoc;
    if (voxelDoc && typeof voxelDoc === 'object') {
      voxelDoc = migrateLegacyDocTo32Cubic(voxelDoc);
      voxelDoc.mapWidth = width;
      voxelDoc.mapHeight = height;
      body.voxelDoc = voxelDoc;
      if (!rawGrid || !Array.isArray(rawGrid) || rawGrid.length === 0) {
        grid = generateGridFromVoxelDoc(voxelDoc, width, height);
        body.grid = grid;
      }
    } else {
      voxelDoc = generateDefaultWorldDoc(
        Math.max(1, Math.ceil(width / CHUNK_SIZE_X)),
        Math.max(1, Math.ceil(height / CHUNK_SIZE_Z)),
        64,
        width,
        height
      );
      voxelDoc.id = slug;
      voxelDoc.name = body.name || slug;
      body.voxelDoc = voxelDoc;
    }

    // Auto-heal empty or missing grid so saving never fails with "Map grid is empty"
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0]) || grid[0].length === 0) {
      grid = generateGridFromVoxelDoc(voxelDoc, width, height);
      body.grid = grid;
    }

    // Bible 08/16: reject trapped spawns, unknown logic ids, bad NPC placement when grid is sent.
    let logicTiles = await prisma.mapLogicTile.findMany({
      select: { id: true, isSolid: true },
    });
    if (logicTiles.length === 0) {
      // Logic tiles must be created during /setup. If missing, we cannot save properly.
      return NextResponse.json({ error: "Missing MapLogicTile catalog. Please run the setup initialization." }, { status: 500 });
    }

    // Sanitize any unrecognized logic tile IDs (e.g. painted visual GIDs like 17) to prevent fatal save rejection
    const knownLogicIds = new Set<number>(logicTiles.map((t) => t.id));
    knownLogicIds.add(0);

    for (let r = 0; r < grid.length; r++) {
      if (Array.isArray(grid[r])) {
        for (let c = 0; c < grid[r].length; c++) {
          const val = Number(grid[r][c]);
          if (!knownLogicIds.has(val)) {
            // Remap unknown / visual GID to walkable (0) or solid border (1)
            grid[r][c] = (r === 0 || r === grid.length - 1 || c === 0 || c === grid[r].length - 1) ? 1 : 0;
          }
        }
      }
    }

    const check = validateMapSave(
      { grid, npcs: Array.isArray(body.npcs) ? body.npcs : [] },
      logicTiles
    );
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error, details: check.details },
        { status: 400 }
      );
    }

    if (body.voxelDoc) {
      const voxelCheck = validateVoxelDocSave(body.voxelDoc);
      if (!voxelCheck.ok) {
        return NextResponse.json(
          { error: voxelCheck.error, details: voxelCheck.details },
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
    if (
      rawGatesToSave !== undefined ||
      existingConns !== undefined ||
      body.cameraStyle !== undefined ||
      body.allowCustomCamera !== undefined ||
      body.allowCustomPlayerCamera !== undefined
    ) {
      let gatesObj: any = {};
      if (typeof rawGatesToSave === 'string') {
        try { gatesObj = JSON.parse(rawGatesToSave); } catch { gatesObj = {}; }
      } else if (Array.isArray(rawGatesToSave)) {
        gatesObj = { gates: rawGatesToSave };
      } else if (typeof rawGatesToSave === 'object' && rawGatesToSave !== null) {
        gatesObj = { ...rawGatesToSave };
      }
      if (existingConns && !gatesObj.connections) {
        gatesObj.connections = existingConns;
      }
      if (body.cameraStyle !== undefined) {
        gatesObj.cameraStyle = body.cameraStyle;
      }
      if (body.allowCustomCamera !== undefined) {
        gatesObj.allowCustomCamera = body.allowCustomCamera;
      } else if (body.allowCustomPlayerCamera !== undefined) {
        gatesObj.allowCustomCamera = body.allowCustomPlayerCamera;
      }
      serializedGatesData = JSON.stringify(gatesObj);
    }

    // Security compliance audit record prior to DB write
    try {
      await AuditService.write({
        userId: user.id,
        action: "map.upsert",
        resource: { type: "map", id: slug },
        after: {
          name: body.name || slug,
          width,
          height,
          gameId: body.gameId || "saints",
          entityCount: entitiesPayload?.length || 0,
        },
      });
    } catch (auditErr: any) {
      console.warn("[MapRoute] Audit logging failed non-fatally:", auditErr?.message);
    }

    let freeformLayersForSave = Array.isArray(body.freeformLayers) ? [...body.freeformLayers] : [];
    if (body.voxelDoc) {
      freeformLayersForSave = freeformLayersForSave.filter((l: any) => l.type !== 'voxel' && l.id !== 'voxel_world_doc');
      freeformLayersForSave.push({
        id: 'voxel_world_doc',
        name: 'Voxel World Model',
        type: 'voxel',
        voxelDoc: body.voxelDoc,
      });
    }

    let worldMap: any;
    try {
      worldMap = await prisma.worldMap.upsert({
        where: { id: slug },
        update: {
          name: body.name || slug,
          gameId: body.gameId || "saints",
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
          ...(body.freeformLayers || body.voxelDoc ? { freeformLayersData: JSON.stringify(freeformLayersForSave) } : {}),
          voxelData: JSON.stringify(body.voxelDoc),
          regionClass: body.regionClass || "authored",
          ...(body.proceduralConfig !== undefined
            ? { proceduralConfig: typeof body.proceduralConfig === 'string' ? body.proceduralConfig : JSON.stringify(body.proceduralConfig) }
            : {}),
          mapType: body.mapType || "HYBRID",
          version: { increment: 1 },
        },
        create: {
          id: slug,
          gameId: body.gameId || "saints",
          name: body.name || slug,
          gridData: JSON.stringify(body.grid || []),
          gatesData: serializedGatesData || JSON.stringify(body.gates || {}),
          npcsData: JSON.stringify(body.npcs || []),
          encountersData: JSON.stringify(body.encounterPool || []),
          entitiesData: JSON.stringify(entitiesPayload),
          tileLayersData: JSON.stringify(visualsForCreate.tileLayers || []),
          freeformLayersData: JSON.stringify(freeformLayersForSave),
          tilesetsData: JSON.stringify(visualsForCreate.tilesets || []),
          voxelData: JSON.stringify(body.voxelDoc),
          regionClass: body.regionClass || "authored",
          mapType: body.mapType || "HYBRID",
          proceduralConfig: body.proceduralConfig
            ? (typeof body.proceduralConfig === 'string' ? body.proceduralConfig : JSON.stringify(body.proceduralConfig))
            : null,
        },
      });
    } catch (upsertErr: any) {
      console.warn("[MapRoute] Primary worldMap upsert failed, attempting fallback without voxelData column:", upsertErr?.message);
      // Fallback in case database column voxelData is missing or has a character limit
      worldMap = await prisma.worldMap.upsert({
        where: { id: slug },
        update: {
          name: body.name || slug,
          gameId: body.gameId || "saints",
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
          ...(body.freeformLayers || body.voxelDoc ? { freeformLayersData: JSON.stringify(freeformLayersForSave) } : {}),
          regionClass: body.regionClass || "authored",
          mapType: body.mapType || "HYBRID",
          version: { increment: 1 },
        },
        create: {
          id: slug,
          gameId: body.gameId || "saints",
          name: body.name || slug,
          gridData: JSON.stringify(body.grid || []),
          gatesData: serializedGatesData || JSON.stringify(body.gates || {}),
          npcsData: JSON.stringify(body.npcs || []),
          encountersData: JSON.stringify(body.encounterPool || []),
          entitiesData: JSON.stringify(entitiesPayload),
          tileLayersData: JSON.stringify(visualsForCreate.tileLayers || []),
          freeformLayersData: JSON.stringify(freeformLayersForSave),
          tilesetsData: JSON.stringify(visualsForCreate.tilesets || []),
          regionClass: body.regionClass || "authored",
          mapType: body.mapType || "HYBRID",
        },
      });
    }

    if (prisma.gameMap?.upsert) {
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
      }).catch((gmErr: any) => {
        console.warn("[MapRoute] Secondary gameMap upsert failed non-fatally:", gmErr?.message);
      });
    }

    // Enqueue sync for game engine / Go MMO shards if explicitly published or if live sync requested
    if (body.isPublish) {
      await MapSyncService.enqueue({
        mapId: worldMap.id,
        version: worldMap.version,
        userId: user.id,
      });
    }

    // Realtime bus broadcast: notify all live game clients and studio viewports
    try {
      const { getRealtimeService } = await import("../../../../server");
      const realtime = getRealtimeService();
      if (realtime) {
        if (body.isPublish) {
          await realtime.emitGlobal("content_reload", {
            type: "map",
            mapId: worldMap.id,
            id: worldMap.id,
            version: worldMap.version,
            timestamp: Date.now(),
          }, { source: "system" });
          await realtime.emitGlobal("admin_save_map", {
            mapId: worldMap.id,
            timestamp: Date.now(),
          }, { source: "system" });
        } else {
          // It's a draft update. Just notify studio viewports if they are listening to drafts.
          await realtime.emitGlobal("admin_save_map_draft", {
            mapId: worldMap.id,
            timestamp: Date.now(),
          }, { source: "system" });
        }
      }
    } catch {
      // Non-fatal if running in plain Next.js test/worker mode without custom server
    }

    return NextResponse.json({ success: true, map: { id: worldMap.id, version: worldMap.version } });
  } catch (error) {
    console.error("[MapRoute] Failed to update map:", error);
    const message = error instanceof Error ? error.message : "Failed to update map";
    return NextResponse.json(
      { error: message, details: [message] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/maps/[slug] — Delete a map from WorldMap and GameMap tables. Admin/dev only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const authCheck = await verifyStudioPermission(request, STUDIO_CONTENT_WRITE_LEVEL);
    if ("errorResponse" in authCheck) {
      return authCheck.errorResponse;
    }
    const user = authCheck.user;

    const { slug } = await params;
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
      return NextResponse.json({ error: "Invalid map identifier" }, { status: 400 });
    }

    // Dynamic spawn hub protection — look up the active spawn map from realm settings
    const spawnSetting = await prisma.siteSetting.findUnique({ where: { key: 'SPAWN_MAP_ID' } });
    const activeSpawnMapId = (spawnSetting?.value || 'DEMO_SANDBOX').toUpperCase();
    if (normalizedSlug.toUpperCase() === activeSpawnMapId) {
      return NextResponse.json(
        { error: "Cannot delete the active Spawn Hub map. Change the spawn hub in Realm Settings first." },
        { status: 400 }
      );
    }

    // Security compliance audit record prior to DB write
    await AuditService.write({
      userId: user.id,
      action: "map.delete",
      resource: { type: "map", id: normalizedSlug },
    });

    await prisma.worldMap.deleteMany({ where: { id: normalizedSlug } });
    await prisma.gameMap.deleteMany({ where: { id: normalizedSlug } });

    // Remove from WorldAtlas if present
    try {
      const atlasRecords = await (prisma as any).worldAtlas?.findMany() || [];
      for (const record of atlasRecords) {
        if (!record.atlasData) continue;
        let changed = false;
        let data: any;
        try { data = JSON.parse(record.atlasData); } catch { continue; }
        
        if (data.nodes && Array.isArray(data.nodes)) {
          const originalLen = data.nodes.length;
          data.nodes = data.nodes.filter((n: any) => n.mapId !== normalizedSlug);
          if (data.nodes.length < originalLen) changed = true;
        }
        
        if (changed) {
          await (prisma as any).worldAtlas.update({
            where: { id: record.id },
            data: { atlasData: JSON.stringify(data) }
          });
        }
      }
    } catch (err) {
      console.warn("[MapRoute] Failed to remove map from atlas:", err);
    }

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

