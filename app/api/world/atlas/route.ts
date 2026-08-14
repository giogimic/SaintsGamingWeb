import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

const DEFAULT_ATLAS_DATA = JSON.stringify({
  nodes: [
    { id: 'node_lobby', mapId: 'LOBBY', x: 0, y: 0, label: 'Central Hub' }
  ],
  edges: [],
  bufferPresets: [],
  options: {
    defaultZoneSize: { w: 30, h: 30 },
    bufferSize: { w: 5, h: 5 },
    softTransition: true,
    zeroFade: false,
    renderNeighborStripTiles: 3
  }
});

/**
 * GET /api/world/atlas?gameId=tuxemon
 * Returns or initializes the macro WorldAtlas node connections.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "tuxemon";

    let atlas: any = null;

    // 1. Try WorldAtlas model
    try {
      if ((prisma as any).worldAtlas) {
        atlas = await (prisma as any).worldAtlas.findUnique({
          where: { gameId },
        });
      }
    } catch (e) {
      console.warn("[Atlas] WorldAtlas table not accessible, checking SiteSetting fallback:", e);
    }

    // 2. Try SiteSetting fallback if table not yet migrated
    if (!atlas) {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: `WORLD_ATLAS_${gameId}` },
      });
      if (setting) {
        try {
          const parsed = JSON.parse(setting.value);
          atlas = {
            gameId,
            lobbyMapId: parsed.lobbyMapId || "LOBBY",
            atlasData: typeof parsed.atlasData === 'string' ? parsed.atlasData : JSON.stringify(parsed.atlasData || parsed),
          };
        } catch {
          atlas = {
            gameId,
            lobbyMapId: "LOBBY",
            atlasData: setting.value,
          };
        }
      }
    }

    // 3. If neither exists, return default
    if (!atlas) {
      atlas = {
        gameId,
        lobbyMapId: "LOBBY",
        atlasData: DEFAULT_ATLAS_DATA,
      };

      // Best effort seed
      try {
        if ((prisma as any).worldAtlas) {
          atlas = await (prisma as any).worldAtlas.create({
            data: {
              gameId,
              lobbyMapId: "LOBBY",
              atlasData: DEFAULT_ATLAS_DATA,
            },
          });
        }
      } catch {
        // Ignore seed failure
      }
    }

    return NextResponse.json({ ok: true, atlas });
  } catch (error) {
    console.error("Failed to fetch world atlas:", error);
    return NextResponse.json({
      ok: true,
      atlas: {
        gameId: "tuxemon",
        lobbyMapId: "LOBBY",
        atlasData: DEFAULT_ATLAS_DATA,
      }
    });
  }
}

/**
 * POST /api/world/atlas
 * Saves or updates the macro WorldAtlas node layout.
 */
export async function POST(request: Request) {
  try {
    let session: any = null;
    try {
      session = await auth();
    } catch (authErr) {
      console.warn("[Atlas] auth() call failed:", authErr);
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
    }

    const body = await request.json();
    const gameId = body.gameId || "tuxemon";
    const lobbyMapId = body.lobbyMapId || "LOBBY";
    const atlasData = typeof body.atlasData === 'string'
      ? body.atlasData
      : JSON.stringify(body.atlasData || { nodes: [], edges: [] });

    let atlasResult: any = null;

    // 1. Try WorldAtlas model
    try {
      if ((prisma as any).worldAtlas) {
        atlasResult = await (prisma as any).worldAtlas.upsert({
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
      }
    } catch (err) {
      console.warn("[Atlas] WorldAtlas table upsert failed, using SiteSetting fallback:", err);
    }

    // 2. Ensure SiteSetting persistent mirror
    try {
      await prisma.siteSetting.upsert({
        where: { key: `WORLD_ATLAS_${gameId}` },
        create: {
          key: `WORLD_ATLAS_${gameId}`,
          value: JSON.stringify({ lobbyMapId, atlasData }),
        },
        update: {
          value: JSON.stringify({ lobbyMapId, atlasData }),
        },
      });
    } catch (siteErr) {
      console.warn("[Atlas] SiteSetting mirror failed:", siteErr);
    }

    if (!atlasResult) {
      atlasResult = {
        gameId,
        lobbyMapId,
        atlasData,
      };
    }

    return NextResponse.json({ ok: true, atlas: atlasResult });
  } catch (error) {
    console.error("Failed to save world atlas:", error);
    return NextResponse.json({ error: "Failed to save atlas" }, { status: 500 });
  }
}
