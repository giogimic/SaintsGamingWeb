import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { AuditService } from "@/server/audit/AuditService";
import { MapSyncService } from "@/server/mapSyncService";

export const dynamic = 'force-dynamic';

/**
 * POST /api/maps/[slug]/rollback
 * Restores a map definition to a previously published snapshot from WorldMapVersion.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized — sign in required to rollback maps." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json(
        { error: "Forbidden — Admin+ (permission level 400) required to rollback maps." },
        { status: 403 }
      );
    }

    const { slug } = await params;
    const body = await request.json();
    const targetVersion = Number(body.targetVersion);

    if (!targetVersion || targetVersion < 1) {
      return NextResponse.json(
        { error: "Invalid targetVersion specified for rollback." },
        { status: 400 }
      );
    }

    // 1. Fetch the target historical snapshot
    const versionEntry = await prisma.worldMapVersion.findUnique({
      where: {
        mapId_version: {
          mapId: slug,
          version: targetVersion,
        },
      },
    });

    if (!versionEntry) {
      return NextResponse.json(
        { error: `Version ${targetVersion} not found for map ${slug}.` },
        { status: 404 }
      );
    }

    let snapshot: any;
    try {
      snapshot = JSON.parse(versionEntry.data);
    } catch {
      return NextResponse.json(
        { error: `Corrupted snapshot data for version ${targetVersion}.` },
        { status: 500 }
      );
    }

    // 2. Restore data into active WorldMap record
    const updatedMap = await prisma.worldMap.update({
      where: { id: slug },
      data: {
        name: snapshot.name || slug,
        gridData: snapshot.gridData || "[]",
        gatesData: snapshot.gatesData || "{}",
        npcsData: snapshot.npcsData || "[]",
        encountersData: snapshot.encountersData || "[]",
        entitiesData: snapshot.entitiesData || "[]",
        tileLayersData: snapshot.tileLayersData || "[]",
        freeformLayersData: snapshot.freeformLayersData || "[]",
        tilesetsData: snapshot.tilesetsData || "[]",
        voxelData: snapshot.voxelData || null,
        publishedVersion: targetVersion,
        publishedData: versionEntry.data,
        version: { increment: 1 }, // editor draft version increments to track rollback edit
      },
    });

    // 3. Mirror collision into GameMap
    try {
      const grid = JSON.parse(snapshot.gridData || "[]");
      const height = grid.length || 20;
      const width = grid[0]?.length || 20;
      await prisma.gameMap.upsert({
        where: { id: slug },
        update: {
          name: snapshot.name || slug,
          width,
          height,
          tilesetData: snapshot.gridData || "[]",
          gates: snapshot.gatesData || "{}",
          npcs: snapshot.npcsData || "[]",
          encounters: snapshot.encountersData || "[]",
        },
        create: {
          id: slug,
          name: snapshot.name || slug,
          width,
          height,
          tilesetData: snapshot.gridData || "[]",
          gates: snapshot.gatesData || "{}",
          npcs: snapshot.npcsData || "[]",
          encounters: snapshot.encountersData || "[]",
        },
      });
    } catch (gmErr) {
      console.warn("[Rollback] GameMap collision mirror error:", gmErr);
    }

    // 4. Synchronize restored version with live shards
    await MapSyncService.enqueue({
      mapId: slug,
      version: targetVersion,
      userId: session.user.id,
      eagerPush: true,
    });

    // 5. Audit Log
    await AuditService.write({
      userId: session.user.id,
      action: "map.rollback",
      resource: { type: "map", id: slug },
      after: {
        restoredVersion: targetVersion,
      },
    });

    return NextResponse.json({
      ok: true,
      mapId: slug,
      restoredVersion: targetVersion,
      message: `Map ${slug} successfully rolled back to published version v${targetVersion}`,
    });
  } catch (error: any) {
    console.error("Failed to rollback map:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to rollback map" },
      { status: 500 }
    );
  }
}
