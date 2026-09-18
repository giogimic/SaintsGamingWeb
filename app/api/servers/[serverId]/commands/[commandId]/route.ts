import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string; commandId: string }> }
) {
  try {
    const { serverId, commandId } = await params;
    // Authenticate Agent via API Key
    const agentAuth = await requireServerApiKey(req);
    if (agentAuth.error) {
      return NextResponse.json({ error: agentAuth.error }, { status: agentAuth.status });
    }

    if (agentAuth.server.id !== serverId) {
      return NextResponse.json({ error: "API Key does not match server ID" }, { status: 403 });
    }

    const body = await req.json();
    const { status, result } = body;

    if (!status || !["DONE", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const command = await prisma.serverCommand.update({
      where: {
        id: params.commandId,
        serverId: params.serverId, // double check it belongs to this server
      },
      data: {
        status,
        result: result ? String(result) : null,
      },
    });

    return NextResponse.json({ command });
  } catch (error) {
    console.error("[API_SERVERS_COMMANDS_PUT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
