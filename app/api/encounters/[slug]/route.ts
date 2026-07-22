import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/encounters/[slug] — Get encounter table for a zone
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const encounter = await prisma.tuxemonEncounter.findUnique({
      where: { slug },
    });

    if (!encounter) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    return NextResponse.json(encounter);
  } catch (error) {
    console.error("Failed to fetch encounter:", error);
    return NextResponse.json({ error: "Failed to fetch encounter" }, { status: 500 });
  }
}