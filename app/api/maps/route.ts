import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

/**
 * GET /api/maps?gameId=tuxemon
 * Lists WorldMap index rows for lobby/editor map pickers.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    const maps = await prisma.worldMap.findMany({
      where: gameId ? { gameId } : undefined,
      select: {
        id: true,
        name: true,
        gameId: true,
        version: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ maps, count: maps.length });
  } catch (error) {
    console.error("Failed to fetch maps index:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
