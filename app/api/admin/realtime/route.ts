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
  if ((globalThis as any).__sg_realtime_service) {
    return (globalThis as any).__sg_realtime_service;
  }
  try {
    const { getRealtimeService } = await import("../../../../server");
    return getRealtimeService();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const gate = await requireDeveloper();
    if ("error" in gate) return gate.error;

    let realtime: any = null;
    try {
      realtime = await getService();
    } catch {
      // non-fatal fallback
    }

    let recentCriticalEvents: any[] = [];
    try {
      recentCriticalEvents = await prisma.realtimeEvent.findMany({
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
    } catch (dbErr) {
      console.warn("Could not query realtimeEvent table:", dbErr);
    }

    if (!realtime) {
      return NextResponse.json({
        ready: false,
        message: "RealtimeService socket cluster initialized or standby.",
        circuitBreakerOpen: false,
        metrics: {
          totalEmits: 0,
          failedValidations: 0,
          connectedUsers: 0,
          rooms: 0,
        },
        recentCriticalEvents,
      });
    }

    const circuitBreakerOpen = typeof realtime.isCircuitBreakerOpen === "function" 
      ? Boolean(realtime.isCircuitBreakerOpen()) 
      : false;

    const metrics = typeof realtime.getMetrics === "function"
      ? realtime.getMetrics()
      : { totalEmits: 0, failedValidations: 0, connectedUsers: 0, rooms: 0 };

    return NextResponse.json({
      ready: true,
      circuitBreakerOpen,
      metrics,
      recentCriticalEvents,
    });
  } catch (err) {
    console.error("Admin realtime GET error:", err);
    return NextResponse.json(
      {
        ready: false,
        message: "Realtime diagnostics loaded in fallback mode.",
        circuitBreakerOpen: false,
        metrics: {
          totalEmits: 0,
          failedValidations: 0,
          connectedUsers: 0,
          rooms: 0,
        },
        recentCriticalEvents: [],
      },
      { status: 200 }
    );
  }
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
  try {
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
      if (typeof realtime.setCircuitBreaker === "function") {
        realtime.setCircuitBreaker(parsed.data.open);
      }
      return NextResponse.json({ 
        ok: true, 
        circuitBreakerOpen: typeof realtime.isCircuitBreakerOpen === "function" ? realtime.isCircuitBreakerOpen() : false 
      });
    }

    if (typeof realtime.disconnectUser === "function") {
      realtime.disconnectUser(parsed.data.userId, parsed.data.reason ?? "Disconnected by admin");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin realtime POST error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
