import { NextRequest, NextResponse } from "next/server";
import { requireServerApiKey } from "@/web/lib/server-auth";
import { prisma } from "@/web/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { eventType, payload } = body;

    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    // Generic event hook - could store in a log table or trigger Discord webhooks
    console.log(`[SAMP_EVENT] Server ${auth.server!.id} | Event: ${eventType}`, payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_SAMP_EVENT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
