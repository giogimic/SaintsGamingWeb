import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

/**
 * GET /api/tuxemon — Get all Tuxemon species for Tuxepedia
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
    console.error("Failed to fetch Tuxemon species list:", error);
    return NextResponse.json({ error: "Failed to fetch Tuxemon list" }, { status: 500 });
  }
}
