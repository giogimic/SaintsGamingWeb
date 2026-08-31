import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { coalesceAsync } from "@/shared/lib/coalesce";
import { rateLimit, getClientIp, createRateLimitResponse } from "@/web/lib/rate-limit";

export const revalidate = 60;

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const limitCheck = rateLimit(`fivem:status:${ip}`, 60, 60_000);
    if (!limitCheck.allowed) {
      return createRateLimitResponse(limitCheck, "Too many FiveM status checks. Please slow down.");
    }

    const formattedData = await coalesceAsync(
      "fivem:dynamic:status",
      async () => {
        // 1. Get the FiveM Server IP from SiteSettings
        const setting = await prisma.siteSetting.findUnique({
          where: { key: "fivem_server_ip" },
        });

        const serverIp = setting?.value;

        const fallbackOfflineData = {
          server: {
            hostname: "Saints Gaming RP",
            online: false,
            players: 0,
            maxClients: 128,
            uptime: "0h",
            mapname: "Unknown",
          },
          jobs: { police: 0, ems: 0, mechanic: 0, taxi: 0 },
        };

        if (!serverIp) {
          return fallbackOfflineData;
        }

        // 2. Fetch from the actual FiveM server (Timeout after 3 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const response = await fetch(`http://${serverIp}/dynamic.json`, {
            signal: controller.signal,
            next: { revalidate: 60 },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            return fallbackOfflineData;
          }

          const data = await response.json();

          return {
            server: {
              hostname: data.hostname || "Saints Gaming RP",
              online: true,
              players: data.clients || 0,
              maxClients: data.sv_maxclients || 128,
              uptime: "Online",
              mapname: data.mapname || "Los Santos",
            },
            jobs: {
              police: 0,
              ems: 0,
              mechanic: 0,
              taxi: 0,
            },
          };
        } catch {
          clearTimeout(timeoutId);
          return fallbackOfflineData;
        }
      },
      { ttlMs: 15_000 }
    );

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("FiveM Status Fetch Error:", error);
    return NextResponse.json({
      server: {
        hostname: "Saints Gaming RP",
        online: false,
        players: 0,
        maxClients: 128,
        uptime: "0h",
        mapname: "Unknown",
      },
      jobs: { police: 0, ems: 0, mechanic: 0, taxi: 0 },
    });
  }
}
