"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type CraftingRecipeInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  outputItemSlug: string;
  outputQuantity: number;
  skillSlug: string;
  levelReq: number;
  xpReward: number;
  ingredients: string; // JSON string
  timeMs: number;
};

export async function listCraftingRecipes(searchQuery?: string) {
  try {
    const rows = await prisma.craftingRecipe.findMany({
      orderBy: { slug: "asc" },
      take: 200,
    });
    const needle = (searchQuery || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.slug.toLowerCase().includes(needle) ||
            r.outputItemSlug.toLowerCase().includes(needle)
        )
      : rows;
    return { success: true as const, data };
  } catch (err) {
    console.error("[listCraftingRecipes]", err);
    return { success: false as const, data: [], error: "Failed to list crafting recipes" };
  }
}

export async function getCraftingRecipe(slug: string) {
  try {
    const row = await prisma.craftingRecipe.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getCraftingRecipe]", err);
    return { success: false as const, error: "Failed to load crafting recipe" };
  }
}

export async function upsertCraftingRecipe(input: CraftingRecipeInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.craftingRecipe.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        slug,
        outputItemSlug: input.outputItemSlug,
        outputQuantity: input.outputQuantity || 1,
        skillSlug: input.skillSlug,
        levelReq: input.levelReq || 1,
        xpReward: input.xpReward || 10,
        ingredients: input.ingredients || "[]",
        timeMs: input.timeMs || 3000,
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        outputItemSlug: input.outputItemSlug,
        outputQuantity: input.outputQuantity || 1,
        skillSlug: input.skillSlug,
        levelReq: input.levelReq || 1,
        xpReward: input.xpReward || 10,
        ingredients: input.ingredients || "[]",
        timeMs: input.timeMs || 3000,
      },
    });

    revalidatePath("/studio");
    revalidatePath("/lobby");
    return { success: true, data: saved };
  } catch (err) {
    console.error("[upsertCraftingRecipe]", err);
    return { success: false, error: "Failed to save crafting recipe" };
  }
}

export async function deleteCraftingRecipe(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };
  try {
    await prisma.craftingRecipe.delete({ where: { slug } });
    revalidatePath("/studio");
    return { success: true };
  } catch (err) {
    console.error("[deleteCraftingRecipe]", err);
    return { success: false, error: "Failed to delete" };
  }
}
