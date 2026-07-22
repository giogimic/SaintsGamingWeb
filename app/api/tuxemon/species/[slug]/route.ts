import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tuxemon/species/[slug] — Get a Tuxemon species with moveset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const species = await prisma.tuxemonSpecies.findUnique({
      where: { slug },
      include: {
        moveset: {
          orderBy: { levelLearned: "asc" },
        },
        evolutions: true,
        stats: true,
      },
    });

    if (!species) {
      return NextResponse.json({ error: "Species not found" }, { status: 404 });
    }

    return NextResponse.json(species);
  } catch (error) {
    console.error("Failed to fetch species:", error);
    return NextResponse.json({ error: "Failed to fetch species" }, { status: 500 });
  }
}