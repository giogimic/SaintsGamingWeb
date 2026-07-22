import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/maps/[slug] — Get a specific map
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const map = await prisma.tuxemonMap.findUnique({
      where: { slug },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error("Failed to fetch map:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}