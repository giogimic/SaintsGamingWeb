import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized — sign in required to publish maps." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true, username: true, email: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json(
        { error: "Forbidden — Admin+ (permission level 400) required to publish maps." },
        { status: 403 }
      );
    }

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
      publishedBy: user.username || user.email || session.user.id,
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
        publishedBy: user.username || user.email || session.user.id,
      },
      update: {
        data: serializedSnapshot,
        description,
        publishedBy: user.username || user.email || session.user.id,
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
      userId: session.user.id,
      eagerPush: true,
    });

    // 4. Audit Log
    await AuditService.write({
      userId: session.user.id,
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
