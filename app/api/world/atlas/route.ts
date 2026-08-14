import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/world/atlas?gameId=tuxemon
 * Returns or initializes the macro WorldAtlas node connections.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "tuxemon";

    let atlas = await prisma.worldAtlas.findUnique({
      where: { gameId },
    });

    if (!atlas) {
      atlas = await prisma.worldAtlas.create({
        data: {
          gameId,
          lobbyMapId: "LOBBY",
          atlasData: JSON.stringify({
            nodes: [
              { id: 'node_lobby', mapId: 'LOBBY', x: 0, y: 0, label: 'Central Hub' }
            ],
            edges: [],
          }),
        },
      });
    }

    return NextResponse.json({ ok: true, atlas });
  } catch (error) {
    console.error("Failed to fetch world atlas:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/world/atlas
 * Saves or updates the macro WorldAtlas node layout.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const gameId = body.gameId || "tuxemon";
    const lobbyMapId = body.lobbyMapId || "LOBBY";
    const atlasData = typeof body.atlasData === 'string'
      ? body.atlasData
      : JSON.stringify(body.atlasData || { nodes: [], edges: [] });

    const atlas = await prisma.worldAtlas.upsert({
      where: { gameId },
      create: {
        gameId,
        lobbyMapId,
        atlasData,
      },
      update: {
        lobbyMapId,
        atlasData,
      },
    });

    return NextResponse.json({ ok: true, atlas });
  } catch (error) {
    console.error("Failed to save world atlas:", error);
    return NextResponse.json({ error: "Failed to save atlas" }, { status: 500 });
  }
}
