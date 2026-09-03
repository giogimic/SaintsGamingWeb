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
      include: { mapReferences: true }
    });
    const needle = (searchQuery || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.slug.toLowerCase().includes(needle) ||
            r.name.toLowerCase().includes(needle)
        )
      : rows;
      
    const transformedData = data.map(r => {
      const { mapReferences, ...rest } = r;
      // Sort by orderIndex to ensure stable order
      const sortedRefs = [...mapReferences].sort((a, b) => a.orderIndex - b.orderIndex);
      return {
        ...rest,
        mapReferences: JSON.stringify(sortedRefs.map((ref: any) => ref.mapSlug))
      };
    });
    return { success: true as const, data: transformedData };
  } catch (err) {
    console.error("[listDungeons]", err);
    return { success: false as const, data: [], error: "Failed to list dungeons" };
  }
}

export async function getDungeon(slug: string) {
  try {
    const row = await prisma.dungeonTemplate.findUnique({ 
      where: { slug },
      include: { mapReferences: true }
    });
    if (!row) return { success: false as const, error: "Not found" };
    
    const { mapReferences, ...rest } = row;
    const sortedRefs = [...mapReferences].sort((a, b) => a.orderIndex - b.orderIndex);
    const transformedRow = {
      ...rest,
      mapReferences: JSON.stringify(sortedRefs.map((ref: any) => ref.mapSlug))
    };
    
    return { success: true as const, data: transformedRow };
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
    let parsedMapRefs: string[] = [];
    try {
      if (input.mapReferences) {
        parsedMapRefs = JSON.parse(input.mapReferences);
      }
    } catch (e) {
      console.error("Invalid mapReferences JSON", e);
    }
    
    const mapRefsToCreate = parsedMapRefs.map((slug, index) => ({
      mapSlug: slug,
      orderIndex: index
    }));

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
        clearConditions: input.clearConditions || "{}",
        mapReferences: {
          create: mapRefsToCreate
        }
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        entryLevelReq: input.entryLevelReq || 1,
        maxPartySize: input.maxPartySize || 4,
        rewardLootPoolId: input.rewardLootPoolId,
        clearConditions: input.clearConditions || "{}",
        mapReferences: {
          deleteMany: {},
          create: mapRefsToCreate
        }
      },
    });
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
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteDungeon] Error:", err.message);
    return { success: false as const, error: "Failed to delete dungeon" };
  }
}
