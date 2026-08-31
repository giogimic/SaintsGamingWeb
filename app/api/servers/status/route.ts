import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { GameDig } from "gamedig";
import { coalesceAsync } from "@/shared/lib/coalesce";
import { rateLimit, getClientIp, createRateLimitResponse } from "@/web/lib/rate-limit";

// Next.js config to cache this endpoint for 60 seconds
export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const limitCheck = rateLimit(`servers:status:${ip}`, 60, 60_000);
    if (!limitCheck.allowed) {
      return createRateLimitResponse(limitCheck, "Too many status checks. Please slow down.");
    }

    // Coalesce in-flight requests and micro-cache for 10s to avoid UDP sweep spikes
    const enrichedServers = await coalesceAsync(
      "servers:gamedig:status-all",
      async () => {
        const servers = await prisma.gameServer.findMany({
          orderBy: { order: "asc" },
        });

        return Promise.all(
          servers.map(async (server) => {
            if (!server.isActive) {
              return {
                ...server,
                status: "maintenance",
                players: 0,
                maxPlayers: 0,
                ping: 0,
              };
            }

            try {
              const type = server.game.toLowerCase();
              const state = await GameDig.query({
                type: type as any,
                host: server.ip,
                port: server.queryPort || server.port,
                maxRetries: 1,
                socketTimeout: 2000,
              });

              return {
                ...server,
                status: "online",
                players: state.players.length || (state.raw as any)?.numplayers || 0,
                maxPlayers: state.maxplayers,
                ping: state.ping,
              };
            } catch {
              // Silent fallback to offline if server is unreachable
              return {
                ...server,
                status: "offline",
                players: 0,
                maxPlayers: 0,
                ping: 0,
              };
            }
          })
        );
      },
      { ttlMs: 10_000 }
    );

    return NextResponse.json({ servers: enrichedServers });
  } catch (error) {
    console.error("Error fetching server status:", error);
    return NextResponse.json(
      { error: "Failed to fetch server status" },
      { status: 500 }
    );
  }
}
