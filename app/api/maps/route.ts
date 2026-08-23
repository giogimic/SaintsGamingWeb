import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { ensureStudioMapFoundation } from "@/server/DemoBootstrap";
import { getSystemSetupStatus } from "@/shared/game/setup/setupDetection";

export const dynamic = 'force-dynamic';

/**
 * GET /api/maps?gameId=tuxemon
 * Lists WorldMap index rows for lobby/editor map pickers.
 * On existing servers (not fresh install), empty index triggers lazy DemoBootstrap so production hosts without a
 * successful boot seed still get DEMO_SANDBOX.
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
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    if (maps.length === 0) {
      await ensureStudioMapFoundation();
    }

    return NextResponse.json({ maps, count: maps.length });
  } catch (error) {
    console.error("Failed to fetch maps index:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
