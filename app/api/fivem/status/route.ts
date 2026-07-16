import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Get the FiveM Server IP from SiteSettings
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "fivem_server_ip" }
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
      jobs: { police: 0, ems: 0, mechanic: 0, taxi: 0 }
    };

    if (!serverIp) {
      return NextResponse.json(fallbackOfflineData);
    }

    // 2. Fetch from the actual FiveM server (Timeout after 3 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`http://${serverIp}/dynamic.json`, {
      signal: controller.signal,
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(fallbackOfflineData);
    }

    const data = await response.json();

    // 3. Format the data to match our frontend widget schema
    const formattedData = {
      server: {
        hostname: data.hostname || "Saints Gaming RP",
        online: true,
        players: data.clients || 0,
        maxClients: data.sv_maxclients || 128,
        uptime: "Online", // We can't get exact uptime from dynamic.json easily without a custom resource
        mapname: data.mapname || "Los Santos",
      },
      jobs: {
        // dynamic.json doesn't export jobs by default unless you have a custom FiveM resource exposing it
        // We will default to 0, which the frontend handles gracefully
        police: 0,
        ems: 0,
        mechanic: 0,
        taxi: 0
      }
    };

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
      jobs: { police: 0, ems: 0, mechanic: 0, taxi: 0 }
    });
  }
}
