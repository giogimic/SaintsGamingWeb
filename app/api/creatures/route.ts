import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

/**
 * GET /api/creatures — Get all Creature species for Tuxepedia
 */
export async function GET() {
  try {
    const speciesList = await prisma.creatureTemplate.findMany({
      include: {
        stats: true,
        learnedAbilities: true,
        evolutions: true,
      },
      orderBy: {
        dexNumber: "asc",
      },
    });

    return NextResponse.json(speciesList);
  } catch (error) {
    console.error("Failed to fetch Creature species list:", error);
    return NextResponse.json({ error: "Failed to fetch Creature list" }, { status: 500 });
  }
}
