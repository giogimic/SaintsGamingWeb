import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { serverId: string; commandId: string } }
) {
  try {
    // Authenticate Agent via API Key
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.server.id !== params.serverId) {
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
