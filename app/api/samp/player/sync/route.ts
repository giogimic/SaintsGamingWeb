import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { playerName, score, money, posX, posY, posZ, interior, isOnline } = body;

    if (!playerName) {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    // Upsert the player session
    await prisma.sampPlayerSession.upsert({
      where: {
        serverId_playerName: {
          serverId: auth.server!.id,
          playerName,
        },
      },
      update: {
        score: score ?? undefined,
        money: money ?? undefined,
        posX: posX ?? undefined,
        posY: posY ?? undefined,
        posZ: posZ ?? undefined,
        interior: interior ?? undefined,
        isOnline: isOnline ?? true,
      },
      create: {
        serverId: auth.server!.id,
        playerName,
        score: score ?? 0,
        money: money ?? 0,
        posX: posX ?? 0,
        posY: posY ?? 0,
        posZ: posZ ?? 0,
        interior: interior ?? 0,
        isOnline: isOnline ?? true,
      },
    });

    // Also update server lastSeen
    await prisma.gameServer.update({
      where: { id: auth.server!.id },
      data: { lastSeen: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_SAMP_PLAYER_SYNC]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
