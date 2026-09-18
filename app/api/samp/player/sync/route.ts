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
    const session = await prisma.sampPlayerSession.findFirst({
      where: { playerName, serverId: auth.server.id },
    });

    if (session) {
      await prisma.sampPlayerSession.update({
        where: { id: session.id },
        data: {
          score: score ?? session.score,
          money: money ?? session.money,
          posX: posX ?? session.posX,
          posY: posY ?? session.posY,
          posZ: posZ ?? session.posZ,
          interior: interior ?? session.interior,
          isOnline: isOnline ?? true,
        },
      });
    } else {
      await prisma.sampPlayerSession.create({
        data: {
          serverId: auth.server.id,
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
    }

    // Also update server lastSeen
    await prisma.gameServer.update({
      where: { id: auth.server.id },
      data: { lastSeen: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_SAMP_PLAYER_SYNC]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
