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
 * Returns the macro WorldAtlas node layout from WorldAtlas or SiteSetting fallback.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "tuxemon";

    let atlasRecord: any = null;
    let siteSettingRecord: any = null;

    // 1. Try WorldAtlas model
    try {
      if ((prisma as any).worldAtlas) {
        atlasRecord = await (prisma as any).worldAtlas.findUnique({
          where: { gameId },
        });
      }
    } catch (e) {
      console.warn("[Atlas] WorldAtlas table not accessible:", e);
    }

    // 2. Try SiteSetting fallback
    try {
      siteSettingRecord = await prisma.siteSetting.findUnique({
        where: { key: `WORLD_ATLAS_${gameId}` },
      });
    } catch (e) {
      console.warn("[Atlas] SiteSetting query failed:", e);
    }

    let finalAtlasData = DEFAULT_ATLAS_DATA;
    let finalLobbyMapId = "LOBBY";

    if (siteSettingRecord?.value) {
      try {
        const parsed = JSON.parse(siteSettingRecord.value);
        finalAtlasData = typeof parsed.atlasData === 'string' ? parsed.atlasData : JSON.stringify(parsed.atlasData || parsed);
        finalLobbyMapId = parsed.lobbyMapId || "LOBBY";
      } catch {
        finalAtlasData = siteSettingRecord.value;
      }
    }

    if (atlasRecord?.atlasData && atlasRecord.atlasData !== "{}" && atlasRecord.atlasData !== DEFAULT_ATLAS_DATA) {
      const isRecordNewer = !siteSettingRecord || (atlasRecord.updatedAt && siteSettingRecord.updatedAt && atlasRecord.updatedAt >= siteSettingRecord.updatedAt);
      if (isRecordNewer) {
        finalAtlasData = atlasRecord.atlasData;
        finalLobbyMapId = atlasRecord.lobbyMapId || "LOBBY";
      }
    }

    return NextResponse.json({
      ok: true,
      atlas: {
        gameId,
        lobbyMapId: finalLobbyMapId,
        atlasData: finalAtlasData,
      }
    });
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
 * Saves or updates the macro WorldAtlas node layout to WorldAtlas & SiteSetting.
 */
export async function POST(request: Request) {
  try {
    let session: any = null;
    try {
      session = await auth();
    } catch (authErr) {
      console.warn("[Atlas] auth() call failed:", authErr);
    }

    if (!session?.user?.id && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Unauthorized — please sign in" }, { status: 401 });
    }

    const body = await request.json();
    const gameId = body.gameId || "tuxemon";
    const lobbyMapId = body.lobbyMapId || "LOBBY";
    const atlasData = typeof body.atlasData === 'string'
      ? body.atlasData
      : JSON.stringify(body.atlasData || { nodes: [], edges: [] });
    const connectionsByMap = body.connectionsByMap as Record<string, { north?: string; south?: string; east?: string; west?: string }> | undefined;

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
          value: JSON.stringify({ lobbyMapId, atlasData, connectionsByMap }),
        },
        update: {
          value: JSON.stringify({ lobbyMapId, atlasData, connectionsByMap }),
        },
      });
    } catch (siteErr) {
      console.warn("[Atlas] SiteSetting mirror failed:", siteErr);
    }

    // 3. If adjacency connections are provided, sync them to WorldMap records
    if (connectionsByMap && typeof connectionsByMap === 'object') {
      try {
        for (const [mapId, conns] of Object.entries(connectionsByMap)) {
          const existing = await prisma.worldMap.findUnique({ where: { id: mapId } });
          let currentGates: any = {};
          if (existing?.gatesData) {
            try {
              currentGates = JSON.parse(existing.gatesData || "{}");
            } catch {}
          } else {
            const existingGameMap = await prisma.gameMap.findUnique({ where: { id: mapId } });
            if (existingGameMap?.gates) {
              try {
                currentGates = JSON.parse(existingGameMap.gates || "{}");
              } catch {}
            }
          }
          const actualGates = currentGates.gates !== undefined ? currentGates.gates : currentGates;
          const mergedGates = { gates: actualGates, connections: conns };
          const serializedGates = JSON.stringify(mergedGates);

          if (existing) {
            await prisma.worldMap.update({
              where: { id: mapId },
              data: { gatesData: serializedGates }
            });
          }
          await prisma.gameMap.updateMany({
            where: { id: mapId },
            data: { gates: serializedGates }
          });
        }
      } catch (connErr) {
        console.warn("[Atlas] Failed to sync map adjacency connections:", connErr);
      }
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
