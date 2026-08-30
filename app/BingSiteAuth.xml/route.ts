import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "SEO_BING_VERIFICATION" },
    });

    const code = setting?.value?.trim();
    if (!code) {
      return new NextResponse("Bing verification not configured", { status: 404 });
    }

    const xml = `<?xml version="1.0"?>
<users>
\t<user>${code}</user>
</users>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[BingSiteAuth] Error generating verification XML:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
