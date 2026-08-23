import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { normalizeAtlasGridData } from "@/shared/game/atlas/spatialAtlas";

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
 * Returns the macro WorldAtlas node layout from the canonical WorldAtlas table,
 * with legacy SiteSetting fallback/migration only if WorldAtlas is unpopulated.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "tuxemon";

    let atlasRecord: any = null;
    let finalAtlasData: string | null = null;
    let finalLobbyMapId: string = "LOBBY";

    // 1. Canonical source of truth: WorldAtlas model
    try {
      if ((prisma as any).worldAtlas) {
        atlasRecord = await (prisma as any).worldAtlas.findUnique({
          where: { gameId },
        });
      }
    } catch (e) {
      console.warn("[Atlas] WorldAtlas table query error:", e);
    }

    if (atlasRecord?.atlasData && atlasRecord.atlasData !== "{}" && atlasRecord.atlasData !== DEFAULT_ATLAS_DATA) {
      finalAtlasData = atlasRecord.atlasData;
      finalLobbyMapId = atlasRecord.lobbyMapId || "LOBBY";
    } else {
      // 2. Legacy migration fallback: read SiteSetting only if WorldAtlas has no record
      try {
        const siteSettingRecord = await prisma.siteSetting.findUnique({
          where: { key: `WORLD_ATLAS_${gameId}` },
        });
        if (siteSettingRecord?.value) {
          try {
            const parsed = JSON.parse(siteSettingRecord.value);
            finalAtlasData = typeof parsed.atlasData === 'string'
              ? parsed.atlasData
              : JSON.stringify(parsed.atlasData || parsed);
            finalLobbyMapId = parsed.lobbyMapId || "LOBBY";
          } catch {
            finalAtlasData = siteSettingRecord.value;
          }

          // Auto-migrate legacy SiteSetting data into WorldAtlas if table exists
          if (finalAtlasData && (prisma as any).worldAtlas) {
            try {
              await (prisma as any).worldAtlas.upsert({
                where: { gameId },
                create: { gameId, lobbyMapId: finalLobbyMapId, atlasData: finalAtlasData },
                update: { lobbyMapId: finalLobbyMapId, atlasData: finalAtlasData },
              });
            } catch (migErr) {
              console.warn("[Atlas] Auto-migration to WorldAtlas table failed:", migErr);
            }
          }
        }
      } catch (siteErr) {
        console.warn("[Atlas] Legacy SiteSetting fallback query failed:", siteErr);
      }
    }

    if (!finalAtlasData) {
      finalAtlasData = DEFAULT_ATLAS_DATA;
    }

    // Guarantee all nodes in payload have stable node IDs
    try {
      const parsedObj = typeof finalAtlasData === 'string' ? JSON.parse(finalAtlasData) : finalAtlasData;
      finalAtlasData = JSON.stringify(normalizeAtlasGridData(parsedObj));
    } catch {}

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
 * Saves the canonical WorldAtlas node layout directly to WorldAtlas.
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
    const rawAtlasData = typeof body.atlasData === 'string'
      ? JSON.parse(body.atlasData || '{"nodes":[]}')
      : (body.atlasData || { nodes: [], edges: [] });
    
    // Normalize and assign permanent IDs to any newly added nodes
    const normalizedData = normalizeAtlasGridData(rawAtlasData);
    const atlasData = JSON.stringify(normalizedData);

    let atlasResult: any = null;

    // 1. Save directly to canonical WorldAtlas table
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
      console.warn("[Atlas] WorldAtlas table upsert failed, attempting SiteSetting fallback:", err);
    }

    // 2. Fallback to SiteSetting only if WorldAtlas table is not available
    if (!atlasResult) {
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
        atlasResult = { gameId, lobbyMapId, atlasData };
      } catch (siteErr) {
        console.error("[Atlas] SiteSetting save failed:", siteErr);
        throw siteErr;
      }
    }

    return NextResponse.json({
      ok: true,
      atlas: {
        gameId: atlasResult.gameId || gameId,
        lobbyMapId: atlasResult.lobbyMapId || lobbyMapId,
        atlasData: atlasResult.atlasData || atlasData,
      }
    });
  } catch (error) {
    console.error("Failed to save world atlas:", error);
    return NextResponse.json({ error: "Failed to save atlas" }, { status: 500 });
  }
}
