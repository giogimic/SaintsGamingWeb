import { NextRequest, NextResponse } from "next/server";
import { MapSyncService } from "@/server/mapSyncService";

export const dynamic = "force-dynamic";

function checkInternalAuth(req: NextRequest): boolean {
  const secret =
    process.env.GO_MMO_INTERNAL_SECRET ||
    process.env.SAINTS_INTERNAL_SECRET ||
    process.env.AUTH_SECRET ||
    "";
  if (!secret) return false;

  const authz = req.headers.get("Authorization");
  const prefix = "Bearer ";
  if (authz && authz.startsWith(prefix) && authz.slice(prefix.length).trim() === secret) {
    return true;
  }
  if (req.headers.get("X-Saints-Internal-Secret") === secret) {
    return true;
  }
  return false;
}

/**
 * GET /api/internal/sync-queue
 * Shards / Go MMO poller calls this to pull pending map sync tasks.
 */
export async function GET(req: NextRequest) {
  try {
    if (!checkInternalAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const pending = await MapSyncService.getPending(limit);

    return NextResponse.json({
      ok: true,
      pending,
      count: pending.length,
    });
  } catch (error) {
    console.error("Failed to get sync queue:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/internal/sync-queue
 * Shards call this to acknowledge completion of map syncs.
 * Body: { entryIds: string[], status: "SYNCED" | "FAILED", error?: string }
 */
export async function POST(req: NextRequest) {
  try {
    if (!checkInternalAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const entryIds = Array.isArray(body.entryIds) ? body.entryIds : body.id ? [body.id] : [];
    if (entryIds.length === 0) {
      return NextResponse.json({ error: "No entryIds provided" }, { status: 400 });
    }

    const status = body.status === "FAILED" ? "FAILED" : "SYNCED";
    await MapSyncService.acknowledge(entryIds, status, body.error);

    return NextResponse.json({ ok: true, count: entryIds.length });
  } catch (error) {
    console.error("Failed to acknowledge sync queue:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
