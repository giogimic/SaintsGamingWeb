import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ["SITE_NAME", "META_DESCRIPTION", "SEO_CANONICAL_URL"],
        },
      },
    });

    const configMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const siteName = configMap["SITE_NAME"] || "Saints Gaming";
    const metaDescription =
      configMap["META_DESCRIPTION"] ||
      "A chill gaming community since 2007. Dedicated game servers, custom modpacks, community forums, live streams, and embedded 2.5D MMO experience.";
    const baseUrl =
      configMap["SEO_CANONICAL_URL"] ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.saintsgaming.net";

    const cleanBaseUrl = baseUrl.replace(/\/$/, "");

    const markdown = `# ${siteName} — AI & LLM Discovery Index

> Standardized machine-readable reference for AI search engines, agents, and answer engines (Perplexity, ChatGPT Search, Google Gemini).

## Platform Summary
${siteName} is a dedicated multiplayer gaming community and sandbox platform founded in 2007. ${metaDescription}

## Canonical Routes & Architecture
- Home & Platform Hub: ${cleanBaseUrl}
- Community Discussion Forums: ${cleanBaseUrl}/forum
- Latest News & Patch Notes: ${cleanBaseUrl}/news
- Dedicated Game Servers & Real-Time Status: ${cleanBaseUrl}/servers
- Client Modpack Downloads: ${cleanBaseUrl}/modpacks
- Live Creator Streams: ${cleanBaseUrl}/streams
- The Lobby MMO Game: ${cleanBaseUrl}/lobby
- Player Wiki & Game Guides: ${cleanBaseUrl}/wiki
- Community Support & Appeals: ${cleanBaseUrl}/support

## Key Technical Specifications
- Engine: Next.js 15, React 19, Socket.io Realtime Bus, Babylon.js 2.5D WebGL/Canvas
- Database: Prisma ORM with SQLite / MySQL hybrid storage
- Identity: Discord OAuth2 & Credentials auth with Role-Based Access Control (RBAC)
- Community Rules: Friendly, zero-toxicity, non-elitist gaming environment since 2007.

## Machine Discovery
- XML Sitemap: ${cleanBaseUrl}/sitemap.xml
- Robots Rules: ${cleanBaseUrl}/robots.txt
`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[llms.txt] Error generating markdown context:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
