import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/web/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admins only (permissionLevel >= 80)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });

    if (!user || user.permissionLevel < 80) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, game, ip, port, queryPort } = body;

    if (!name || !game || !ip || !port) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate raw key
    const rawKey = crypto.randomBytes(32).toString("hex");
    // Hash key for storage
    const apiKeyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const server = await prisma.gameServer.create({
      data: {
        name,
        game,
        ip,
        port: parseInt(port),
        queryPort: queryPort ? parseInt(queryPort) : null,
        isRemote: true,
        isActive: true,
        apiKeyHash,
      },
    });

    return NextResponse.json({
      message: "Server registered successfully",
      server,
      rawKey, // IMPORTANT: only shown once
    });
  } catch (error) {
    console.error("[API_SERVERS_REGISTER]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
