"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type DungeonTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  entryLevelReq: number;
  maxPartySize: number;
  rewardLootPoolId?: string;
  mapReferences: string;
  clearConditions: string;
};

export async function listDungeons(searchQuery?: string) {
  try {
    const rows = await prisma.dungeonTemplate.findMany({
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
    console.error("[listDungeons]", err);
    return { success: false as const, data: [], error: "Failed to list dungeons" };
  }
}

export async function getDungeon(slug: string) {
  try {
    const row = await prisma.dungeonTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getDungeon]", err);
    return { success: false as const, error: "Failed to load dungeon" };
  }
}

export async function upsertDungeon(input: DungeonTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.dungeonTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        entryLevelReq: input.entryLevelReq || 1,
        maxPartySize: input.maxPartySize || 4,
        rewardLootPoolId: input.rewardLootPoolId,
        mapReferences: input.mapReferences || "[]",
        clearConditions: input.clearConditions || "{}",
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        entryLevelReq: input.entryLevelReq || 1,
        maxPartySize: input.maxPartySize || 4,
        rewardLootPoolId: input.rewardLootPoolId,
        mapReferences: input.mapReferences || "[]",
        clearConditions: input.clearConditions || "{}",
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertDungeon] Error:", err.message);
    return { success: false as const, error: "Database error saving dungeon" };
  }
}

export async function deleteDungeon(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.dungeonTemplate.delete({
      where: { slug },
    });
    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteDungeon] Error:", err.message);
    return { success: false as const, error: "Failed to delete dungeon" };
  }
}
