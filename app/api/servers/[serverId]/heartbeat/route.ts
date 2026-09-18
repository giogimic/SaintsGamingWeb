import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { serverId: string } }
) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.server.id !== params.serverId) {
      return NextResponse.json({ error: "API Key does not match server ID" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { agentVersion } = body;

    const server = await prisma.gameServer.update({
      where: { id: params.serverId },
      data: {
        lastSeen: new Date(),
        agentVersion: agentVersion || auth.server.agentVersion,
      },
    });

    return NextResponse.json({ success: true, server });
  } catch (error) {
    console.error("[API_SERVERS_HEARTBEAT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
