import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { z } from "zod";

async function requireDeveloper() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });
  if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

async function getService() {
  const { getRealtimeService } = await import("../../../../server");
  return getRealtimeService();
}

export async function GET() {
  const gate = await requireDeveloper();
  if ("error" in gate) return gate.error;

  const realtime = await getService();
  if (!realtime) {
    return NextResponse.json({
      ready: false,
      message: "RealtimeService not running (start via `npx tsx server.ts`).",
      metrics: null,
      recentCriticalEvents: [],
    });
  }

  const recentCriticalEvents = await prisma.realtimeEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      eventType: true,
      userId: true,
      priority: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ready: true,
    circuitBreakerOpen: realtime.isCircuitBreakerOpen(),
    metrics: realtime.getMetrics(),
    recentCriticalEvents,
  });
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setCircuitBreaker"),
    open: z.boolean(),
  }),
  z.object({
    action: z.literal("disconnectUser"),
    userId: z.string().min(1),
    reason: z.string().max(200).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const gate = await requireDeveloper();
  if ("error" in gate) return gate.error;

  const realtime = await getService();
  if (!realtime) {
    return NextResponse.json({ error: "RealtimeService not ready" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.action === "setCircuitBreaker") {
    realtime.setCircuitBreaker(parsed.data.open);
    return NextResponse.json({ ok: true, circuitBreakerOpen: realtime.isCircuitBreakerOpen() });
  }

  realtime.disconnectUser(parsed.data.userId, parsed.data.reason ?? "Disconnected by admin");
  return NextResponse.json({ ok: true });
}
