"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type SimulationPresetInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  xpMultiplier: number;
  dropMultiplier: number;
  goldMultiplier: number;
};

export async function listSimulationPresets(searchQuery?: string) {
  try {
    const rows = await prisma.simulationPreset.findMany({
      orderBy: { name: "asc" },
      take: 200,
    });
    const needle = (searchQuery || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.slug.toLowerCase().includes(needle) ||
            r.name.toLowerCase().includes(needle)
        )
      : rows;
    return { success: true as const, data };
  } catch (err) {
    console.error("[listSimulationPresets]", err);
    return { success: false as const, data: [], error: "Failed to list simulation presets" };
  }
}

export async function getSimulationPreset(slug: string) {
  try {
    const row = await prisma.simulationPreset.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getSimulationPreset]", err);
    return { success: false as const, error: "Failed to load simulation preset" };
  }
}

export async function upsertSimulationPreset(input: SimulationPresetInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.simulationPreset.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        isActive: input.isActive ?? false,
        xpMultiplier: input.xpMultiplier ?? 1.0,
        dropMultiplier: input.dropMultiplier ?? 1.0,
        goldMultiplier: input.goldMultiplier ?? 1.0,
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        isActive: input.isActive ?? false,
        xpMultiplier: input.xpMultiplier ?? 1.0,
        dropMultiplier: input.dropMultiplier ?? 1.0,
        goldMultiplier: input.goldMultiplier ?? 1.0,
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertSimulationPreset] Error:", err.message);
    return { success: false as const, error: "Database error saving simulation preset" };
  }
}

export async function deleteSimulationPreset(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.simulationPreset.delete({
      where: { slug },
    });
    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteSimulationPreset] Error:", err.message);
    return { success: false as const, error: "Failed to delete simulation preset" };
  }
}

/**
 * Live Operations: Exclusively activates one baseline simulation preset.
 */
export async function setActiveSimulationPreset(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const target = await prisma.simulationPreset.findUnique({ where: { slug } });
    if (!target) return { success: false, error: `Simulation preset '${slug}' not found` };

    // Deactivate all presets for the gameId
    await prisma.simulationPreset.updateMany({
      where: { gameId: target.gameId },
      data: { isActive: false },
    });

    // Exclusively activate the selected preset
    const active = await prisma.simulationPreset.update({
      where: { slug },
      data: { isActive: true },
    });

    revalidatePath("/studio");
    revalidatePath("/lobby");
    return {
      success: true as const,
      data: {
        slug: active.slug,
        name: active.name,
        isActive: true,
        xpMultiplier: active.xpMultiplier,
        dropMultiplier: active.dropMultiplier,
        goldMultiplier: active.goldMultiplier,
      },
    };
  } catch (err: any) {
    console.error("[setActiveSimulationPreset] Error:", err.message);
    return { success: false as const, error: "Failed to set active simulation preset" };
  }
}
