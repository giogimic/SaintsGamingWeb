import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

/**
 * POST /api/creatures/evolve — Trigger Creature Evolution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { speciesSlug, level } = body;

    if (!speciesSlug) {
      return NextResponse.json({ error: "speciesSlug is required" }, { status: 400 });
    }

    const species = await prisma.creatureTemplate.findUnique({
      where: { slug: speciesSlug },
      include: { evolutions: true },
    });

    if (!species || !species.evolutions || species.evolutions.length === 0) {
      return NextResponse.json({ canEvolve: false, message: "No evolutions found for this species." });
    }

    const currentLevel = level || 1;
    const validEvolution = species.evolutions.find((evo) => {
      if (evo.atLevel && currentLevel >= evo.atLevel) return true;
      return false;
    });

    if (!validEvolution) {
      return NextResponse.json({ canEvolve: false, message: "Evolution requirements not met." });
    }

    const targetSpecies = await prisma.creatureTemplate.findUnique({
      where: { slug: validEvolution.targetSlug },
      include: { stats: true, learnedAbilities: true },
    });

    return NextResponse.json({
      canEvolve: true,
      targetSlug: validEvolution.targetSlug,
      targetSpecies,
    });
  } catch (error) {
    console.error("Evolution API error:", error);
    return NextResponse.json({ error: "Failed to process evolution" }, { status: 500 });
  }
}
