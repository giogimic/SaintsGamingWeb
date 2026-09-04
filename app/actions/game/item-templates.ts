"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";

export type ItemTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  tier: number;
  baseDurability?: number;
  baseStats?: string;
  stackable: boolean;
  iconAssetId?: string;
};

export async function listItemTemplates(searchQuery?: string) {
  try {
    const rows = await prisma.itemTemplate.findMany({
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
    console.error("[listItemTemplates]", err);
    return { success: false as const, data: [], error: "Failed to list item templates" };
  }
}

export async function getItemTemplate(slug: string) {
  try {
    const row = await prisma.itemTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getItemTemplate]", err);
    return { success: false as const, error: "Failed to load item template" };
  }
}

export async function upsertItemTemplate(input: ItemTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.itemTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        category: input.category,
        subCategory: input.subCategory,
        tier: input.tier,
        baseDurability: input.baseDurability,
        baseStats: input.baseStats,
        stackable: input.stackable,
        iconAssetId: input.iconAssetId,
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        name: input.name.trim() || slug,
        description: input.description,
        category: input.category,
        subCategory: input.subCategory,
        tier: input.tier,
        baseDurability: input.baseDurability,
        baseStats: input.baseStats,
        stackable: input.stackable,
        iconAssetId: input.iconAssetId,
      },
    });
    revalidatePath("/lobby");
    return { success: true, data: saved };
  } catch (err) {
    console.error("[upsertItemTemplate]", err);
    return { success: false, error: "Failed to save item template" };
  }
}

export async function deleteItemTemplate(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };
  try {
    await prisma.itemTemplate.delete({ where: { slug } });
    return { success: true };
  } catch (err) {
    console.error("[deleteItemTemplate]", err);
    return { success: false, error: "Failed to delete" };
  }
}

export async function getItemDependencies(slug: string) {
  try {
    // Look in LootTables
    const lootTables = await prisma.lootTable.findMany({
      select: { id: true, name: true, entries: true },
    });
    const lootMatches = lootTables.filter(lt => {
      if (!lt.entries) return false;
      try {
        const parsed = JSON.parse(lt.entries);
        if (Array.isArray(parsed)) {
          return parsed.some((e: any) => e.itemId === slug);
        }
      } catch (e) {
        // ignore invalid json
      }
      return false;
    }).map(lt => ({ type: 'LootTable', id: lt.id, name: lt.name }));

    // Look in CraftingRecipes
    const recipes = await prisma.craftingRecipe.findMany({
      where: {
        OR: [
          { outputItemSlug: slug },
          { ingredients: { some: { itemSlug: slug } } }
        ]
      },
      include: { ingredients: true }
    });
    
    // We already filtered via the DB query
    const recipeMatches = recipes.map(r => ({ type: 'Recipe', id: r.slug, name: r.slug }));

    return { success: true as const, data: [...lootMatches, ...recipeMatches] };
  } catch (err) {
    console.error("[getItemDependencies]", err);
    return { success: false as const, error: "Failed to load dependencies" };
  }
}
