import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { MapSyncService } from "@/server/mapSyncService";
import { AuditService } from "@/server/audit/AuditService";

export const dynamic = "force-dynamic";

async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, permissionLevel: true },
  });
  if (!user || !canWriteStudioContent(user.permissionLevel)) {
    return { error: NextResponse.json({ error: "Forbidden — Admin+ required" }, { status: 403 }) };
  }
  return { user };
}

/**
 * GET /api/admin/sync
 * Returns sync overview for all maps and recent sync activity logs.
 */
export async function GET() {
  try {
    const authRes = await checkAdminAuth();
    if ("error" in authRes) return authRes.error;

    const overview = await MapSyncService.getMapSyncOverview();
    const syncMode = process.env.SYNC_MODE || "hybrid";

    return NextResponse.json({
      ok: true,
      syncMode,
      ...overview,
    });
  } catch (error) {
    console.error("Failed to fetch sync overview:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/sync
 * Manually trigger map sync for one map or all stale maps.
 * Body: { mapId?: string, all?: boolean, eagerPush?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const authRes = await checkAdminAuth();
    if ("error" in authRes) return authRes.error;
    const { user } = authRes;

    const body = await req.json();
    const { mapId, all, eagerPush } = body;

    if (all) {
      const overview = await MapSyncService.getMapSyncOverview();
      const staleOrFailedMaps = overview.maps.filter((m) => m.status === "STALE" || m.status === "FAILED");

      const enqueued = [];
      for (const map of staleOrFailedMaps) {
        const entry = await MapSyncService.enqueue({
          mapId: map.id,
          version: map.version,
          userId: user.id,
          eagerPush,
        });
        enqueued.push(entry);
      }

      await AuditService.write({
        userId: user.id,
        action: "maps.bulk_sync",
        resource: { type: "map_sync", id: "bulk" },
        after: {
          count: enqueued.length,
          mapIds: staleOrFailedMaps.map((m) => m.id),
        },
      });

      return NextResponse.json({
        ok: true,
        message: `Enqueued ${enqueued.length} maps for sync`,
        enqueuedCount: enqueued.length,
      });
    }

    if (!mapId) {
      return NextResponse.json({ error: "mapId or all: true is required" }, { status: 400 });
    }

    const map = await prisma.worldMap.findUnique({
      where: { id: mapId },
      select: { id: true, name: true, version: true },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const entry = await MapSyncService.enqueue({
      mapId: map.id,
      version: map.version,
      userId: user.id,
      eagerPush,
    });

    await AuditService.write({
      userId: user.id,
      action: "map.sync_trigger",
      resource: { type: "map_sync", id: map.id },
      after: {
        mapId: map.id,
        version: map.version,
        entryId: entry.id,
      },
    });

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error) {
    console.error("Failed to trigger sync:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
