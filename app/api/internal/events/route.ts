/**
 * POST /api/internal/events
 *
 * Secure HTTP event ingestion for external Saints Gaming services:
 *   - FiveM server scripts
 *   - Discord bot
 *   - Admin tools
 *   - Future launcher / mobile
 *
 * Authentication: Authorization: Bearer <SAINTS_INTERNAL_SECRET>
 *                 + X-Service-Name header identifying the producer.
 *
 * ⛔ Never expose this endpoint publicly without the auth header.
 */

import { NextRequest, NextResponse } from "next/server";
import { EventEnvelopeSchema } from "@/shared/events/registry";
import { ZodError } from "zod";

// Lazy-import the realtime service singleton from the running server process.
// This works because Next.js API routes and server.ts run in the same process.
async function getService() {
  // Dynamic import to avoid circular dependency during Next.js build
  const { getRealtimeService } = await import("@/../../server");
  return getRealtimeService();
}

export async function POST(req: NextRequest) {
  // 1. Validate secret
  const authHeader = req.headers.get("authorization");
  const secret = process.env.SAINTS_INTERNAL_SECRET;

  if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceName = req.headers.get("x-service-name") ?? "unknown";

  // 2. Parse + validate envelope
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let envelope: typeof EventEnvelopeSchema._type;
  try {
    envelope = EventEnvelopeSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Invalid event envelope", details: err.issues }, { status: 422 });
    }
    return NextResponse.json({ error: "Validation error" }, { status: 422 });
  }

  // 3. Publish via RealtimeService
  const realtime = await getService();
  if (!realtime) {
    // Server may be starting up — log and return 503
    console.warn(`[Internal Events] RealtimeService not ready (from ${serviceName})`);
    return NextResponse.json({ error: "Realtime service not available" }, { status: 503 });
  }

  const userId = typeof envelope.payload?.userId === "string" ? envelope.payload.userId : undefined;

  await realtime.publishEvent(
    envelope.type,
    envelope.payload as Record<string, unknown>,
    {
      userId,
      source: envelope.source,
      // Broadcast globally when no specific user target (community events)
      ...(userId ? {} : { global: true }),
    }
  );

  console.log(`[Internal Events] Published "${envelope.type}" from service: ${serviceName}`);
  return NextResponse.json({ ok: true });
}
