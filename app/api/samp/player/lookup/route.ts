import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { requireServerApiKey } from "@/web/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireServerApiKey(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const playerName = searchParams.get("playerName");

    if (!playerName) {
      return NextResponse.json({ error: "playerName is required" }, { status: 400 });
    }

    // Try to find if this player has an active session or is linked to a user
    const session = await prisma.sampPlayerSession.findFirst({
      where: { playerName },
      include: { user: true },
    });

    // Check if the user is banned on Saints Web
    let isBanned = false;
    let banReason = null;
    let permissionLevel = 0;

    if (session?.user) {
      isBanned = session.user.isBanned;
      banReason = session.user.banReason;
      permissionLevel = session.user.permissionLevel;
    }

    return NextResponse.json({
      playerName,
      isLinked: !!session?.user,
      userId: session?.userId || null,
      isBanned,
      banReason,
      permissionLevel,
      score: session?.score || 0,
      money: session?.money || 0,
    });
  } catch (error) {
    console.error("[API_SAMP_PLAYER_LOOKUP]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
