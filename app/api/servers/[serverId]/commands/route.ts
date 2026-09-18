import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/web/lib/auth";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function GET(req: NextRequest, { params }: { params: { serverId: string } }) {
  try {
    // Authenticate Agent via API Key
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.server.id !== params.serverId) {
      return NextResponse.json({ error: "API Key does not match server ID" }, { status: 403 });
    }

    // Get pending commands
    const pendingCommands = await prisma.serverCommand.findMany({
      where: {
        serverId: params.serverId,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark as RUNNING immediately so they aren't fetched twice
    if (pendingCommands.length > 0) {
      await prisma.serverCommand.updateMany({
        where: { id: { in: pendingCommands.map((c) => c.id) } },
        data: { status: "RUNNING" },
      });
    }

    return NextResponse.json({ commands: pendingCommands });
  } catch (error) {
    console.error("[API_SERVERS_COMMANDS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { serverId: string } }) {
  try {
    // Authenticate Admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    if (!user || user.permissionLevel < 80) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json({ error: "Missing type or payload" }, { status: 400 });
    }

    const command = await prisma.serverCommand.create({
      data: {
        serverId: params.serverId,
        type,
        payload: JSON.stringify(payload),
        status: "PENDING",
      },
    });

    return NextResponse.json({ command });
  } catch (error) {
    console.error("[API_SERVERS_COMMANDS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
