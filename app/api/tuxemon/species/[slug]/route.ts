import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

/**
 * GET /api/tuxemon/species/[slug] — Get a Tuxemon species with learnedAbilities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const species = await prisma.creatureTemplate.findUnique({
      where: { slug },
      include: {
        learnedAbilities: {
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