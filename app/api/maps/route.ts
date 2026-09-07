import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { getSystemSetupStatus } from "@/shared/game/setup/setupDetection";

export const dynamic = 'force-dynamic';

/**
 * GET /api/maps?gameId=saints
 * Lists WorldMap index rows for lobby/editor map pickers.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    let maps = await prisma.worldMap.findMany({
      where: gameId ? { gameId } : undefined,
      select: {
        id: true,
        name: true,
        gameId: true,
        version: true,
        publishedVersion: true,
        updatedAt: true,
        mapType: true,
      },
      orderBy: { name: "asc" },
    });

    // If maps.length === 0, it means the user hasn't run the setup process or wiped the DB.
    // The Lobby UI handles this by prompting the user to run setup.

    return NextResponse.json({ maps, count: maps.length });
  } catch (error) {
    console.error("Failed to fetch maps index:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
