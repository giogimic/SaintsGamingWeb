import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { normalizeGatesToArray, type NormalizedGate } from "@/shared/game/mapGates";
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
 * GET /api/admin/gates?mapId=X
 * Returns list of maps with their gate counts, or gates for a specific map.
 */
export async function GET(req: NextRequest) {
  try {
    const authRes = await checkAdminAuth();
    if ("error" in authRes) return authRes.error;

    const { searchParams } = new URL(req.url);
    const mapId = searchParams.get("mapId");

    if (mapId) {
      const worldMap = await prisma.worldMap.findUnique({
        where: { id: mapId },
        select: { id: true, name: true, version: true, gatesData: true, gridData: true },
      });

      if (!worldMap) {
        return NextResponse.json({ error: "Map not found" }, { status: 404 });
      }

      const rawGates = JSON.parse(worldMap.gatesData || "{}");
      const actualGates = rawGates.gates !== undefined ? rawGates.gates : rawGates;
      const normalized = normalizeGatesToArray(actualGates);

      return NextResponse.json({
        mapId: worldMap.id,
        mapName: worldMap.name,
        mapVersion: worldMap.version,
        gates: normalized,
        totalGates: normalized.length,
        activeGates: normalized.filter((g) => !g.disabled).length,
        disabledGates: normalized.filter((g) => g.disabled).length,
      });
    }

    // List all maps and their gate summaries
    const maps = await prisma.worldMap.findMany({
      select: { id: true, name: true, version: true, gatesData: true, updatedAt: true },
      orderBy: { name: "asc" },
    });

    const summary = maps.map((m) => {
      let gates: NormalizedGate[] = [];
      try {
        const raw = JSON.parse(m.gatesData || "{}");
        const act = raw.gates !== undefined ? raw.gates : raw;
        gates = normalizeGatesToArray(act);
      } catch {
        gates = [];
      }
      return {
        id: m.id,
        name: m.name,
        version: m.version,
        updatedAt: m.updatedAt,
        totalGates: gates.length,
        activeGates: gates.filter((g) => !g.disabled).length,
        disabledGates: gates.filter((g) => g.disabled).length,
      };
    });

    return NextResponse.json({ maps: summary });
  } catch (error) {
    console.error("Failed to query admin gates:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/gates
 * Toggle active/disabled status on a single gate or all gates on a map.
 * Body: { mapId: string, gateId?: string, disabled: boolean, all?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const authRes = await checkAdminAuth();
    if ("error" in authRes) return authRes.error;
    const { user } = authRes;

    const body = await req.json();
    const { mapId, gateId, disabled, all } = body;

    if (!mapId) {
      return NextResponse.json({ error: "mapId is required" }, { status: 400 });
    }

    const worldMap = await prisma.worldMap.findUnique({
      where: { id: mapId },
      select: { id: true, name: true, version: true, gatesData: true },
    });

    if (!worldMap) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    let rawGatesObj = JSON.parse(worldMap.gatesData || "{}");
    const connections = rawGatesObj.connections || undefined;
    let actualGates = rawGatesObj.gates !== undefined ? rawGatesObj.gates : rawGatesObj;

    const normalized = normalizeGatesToArray(actualGates);

    let modified = false;
    const updatedGates = normalized.map((g) => {
      if (all || (gateId && g.id === gateId)) {
        modified = true;
        return {
          ...g,
          disabled: Boolean(disabled),
        };
      }
      return g;
    });

    if (!modified && !all) {
      return NextResponse.json({ error: "Gate not found on this map" }, { status: 404 });
    }

    // Reserialize gatesData preserving connections
    let serializedGatesData: string;
    if (connections) {
      serializedGatesData = JSON.stringify({ gates: updatedGates, connections });
    } else {
      serializedGatesData = JSON.stringify(updatedGates);
    }

    // Write audit record
    await AuditService.write({
      userId: user.id,
      action: all ? (disabled ? "gates.disable_all" : "gates.enable_all") : (disabled ? "gate.disable" : "gate.enable"),
      resource: { type: "gate", id: gateId || mapId },
      after: {
        mapId,
        gateId,
        disabled: Boolean(disabled),
        all: Boolean(all),
      },
    });

    // Update DB & bump version
    const updated = await prisma.worldMap.update({
      where: { id: mapId },
      data: {
        gatesData: serializedGatesData,
        version: { increment: 1 },
      },
    });

    await prisma.gameMap.updateMany({
      where: { id: mapId },
      data: {
        gates: serializedGatesData,
      },
    });

    // Enqueue sync task for shards
    await MapSyncService.enqueue({
      mapId: updated.id,
      version: updated.version,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      mapId: updated.id,
      mapVersion: updated.version,
      updatedGatesCount: all ? updatedGates.length : 1,
      disabled: Boolean(disabled),
    });
  } catch (error) {
    console.error("Failed to update admin gates:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
