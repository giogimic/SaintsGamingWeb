/**
 * GET /api/realtime/sync?since=<timestamp>
 *
 * Called by the client RealtimeProvider on socket reconnection.
 * Returns CRITICAL events for the authenticated user that occurred
 * after the given timestamp, so the client can catch up seamlessly.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = req.nextUrl.searchParams.get("since");
  const sinceDate = since ? new Date(parseInt(since, 10)) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const events = await prisma.realtimeEvent.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      take: 100, // Safety cap — never return unbounded rows
    });

    const formatted = events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      payload: JSON.parse(e.payload),
      priority: e.priority,
      createdAt: e.createdAt.getTime(),
    }));

    return NextResponse.json({ events: formatted });
  } catch (error) {
    console.error("[Realtime Sync] Error fetching missed events:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
