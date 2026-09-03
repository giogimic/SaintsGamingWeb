import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent, STUDIO_CONTENT_WRITE_LEVEL } from "@/shared/game/studioPermissions";
import { verifyStudioPermission } from "@/server/auth/studioApiAuth";
import { AuditService } from "@/server/audit/AuditService";
import { MapSyncService } from "@/server/mapSyncService";

export const dynamic = 'force-dynamic';

/**
 * POST /api/maps/[slug]/publish
 * Promotes the current saved editor draft of a map to an immutable published release version,
 * archives a snapshot in WorldMapVersion for rollback, and synchronizes with live runtime shards.
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
    const body = await request.json().catch(() => ({}));
    const description = typeof body.description === 'string' ? body.description.trim() : 'Published release';

    const worldMap = await prisma.worldMap.findUnique({ where: { id: slug } });
    if (!worldMap) {
      return NextResponse.json({ error: `Map not found: ${slug}` }, { status: 404 });
    }

    const nextPublishedVersion = (worldMap.publishedVersion ?? 0) + 1;

    // Complete snapshot payload of this map at publication time
    const snapshotPayload = {
      id: worldMap.id,
      name: worldMap.name,
      gameId: worldMap.gameId,
      gridData: worldMap.gridData,
      gatesData: worldMap.gatesData,
      npcsData: worldMap.npcsData,
      encountersData: worldMap.encountersData,
      entitiesData: worldMap.entitiesData,
      tileLayersData: worldMap.tileLayersData,
      freeformLayersData: worldMap.freeformLayersData,
      tilesetsData: worldMap.tilesetsData,
      voxelData: worldMap.voxelData,
      version: worldMap.version,
      publishedVersion: nextPublishedVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: user.username || user.email || user.id,
    };

    const serializedSnapshot = JSON.stringify(snapshotPayload);

    // 1. Create or upsert immutable snapshot record in WorldMapVersion
    await prisma.worldMapVersion.upsert({
      where: {
        mapId_version: {
          mapId: slug,
          version: nextPublishedVersion,
        },
      },
      create: {
        mapId: slug,
        version: nextPublishedVersion,
        name: worldMap.name,
        data: serializedSnapshot,
        description,
        publishedBy: user.username || user.email || user.id,
      },
      update: {
        data: serializedSnapshot,
        description,
        publishedBy: user.username || user.email || user.id,
      },
    });

    // 2. Update WorldMap with new publishedVersion and active publishedData
    await prisma.worldMap.update({
      where: { id: slug },
      data: {
        publishedVersion: nextPublishedVersion,
        publishedData: serializedSnapshot,
      },
    });

    // 3. Synchronize with live game engine / Go MMO shards
    await MapSyncService.enqueue({
      mapId: slug,
      version: nextPublishedVersion,
      userId: user.id,
      eagerPush: true,
    });

    // 4. Audit Log
    await AuditService.write({
      userId: user.id,
      action: "map.publish",
      resource: { type: "map", id: slug },
      after: {
        version: nextPublishedVersion,
        description,
      },
    });

    return NextResponse.json({
      ok: true,
      mapId: slug,
      publishedVersion: nextPublishedVersion,
      message: `Map ${slug} published successfully as v${nextPublishedVersion}`,
    });
  } catch (error: any) {
    console.error("Failed to publish map:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish map" },
      { status: 500 }
    );
  }
}
