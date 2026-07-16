import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js config to cache this endpoint for 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    const servers = await prisma.gameServer.findMany({
      orderBy: { order: 'asc' },
    });

    const enrichedServers = await Promise.all(
      servers.map(async (server) => {
        if (!server.isActive) {
          return {
            ...server,
            status: "maintenance",
            players: 0,
            maxPlayers: 32,
            ping: 0,
          };
        }

        // TODO: In a production environment, implement Battlemetrics API or GameDig here.
        // Example with GameDig:
        // const state = await Gamedig.query({ type: 'palworld', host: server.ip, port: server.queryPort || server.port });
        // return { ...server, status: "online", players: state.players.length, maxPlayers: state.maxplayers, ping: state.ping };

        // For now, return a simulated active state
        return {
          ...server,
          status: "online",
          players: Math.floor(Math.random() * 32),
          maxPlayers: 32,
          ping: Math.floor(Math.random() * 50) + 10,
        };
      })
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
