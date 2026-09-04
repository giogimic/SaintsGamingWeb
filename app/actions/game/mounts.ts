"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";

export type MountTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  speedMultiplier: number;
  canFly: boolean;
  canSwim: boolean;
  acquisitionData: string;
  restrictionsData: string;
  visualData: string;
  collectionCategory: string;
};

export async function listMounts(searchQuery?: string) {
  try {
    const rows = await prisma.mountTemplate.findMany({
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
    console.error("[listMounts]", err);
    return { success: false as const, data: [], error: "Failed to list mounts" };
  }
}

export async function getMount(slug: string) {
  try {
    const row = await prisma.mountTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getMount]", err);
    return { success: false as const, error: "Failed to load mount" };
  }
}

export async function upsertMount(input: MountTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.mountTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        speedMultiplier: input.speedMultiplier ?? 1.5,
        canFly: input.canFly ?? false,
        canSwim: input.canSwim ?? false,
        acquisitionData: input.acquisitionData || "{}",
        restrictionsData: input.restrictionsData || "{}",
        visualData: input.visualData || "{}",
        collectionCategory: input.collectionCategory || "mount",
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        speedMultiplier: input.speedMultiplier ?? 1.5,
        canFly: input.canFly ?? false,
        canSwim: input.canSwim ?? false,
        acquisitionData: input.acquisitionData || "{}",
        restrictionsData: input.restrictionsData || "{}",
        visualData: input.visualData || "{}",
        collectionCategory: input.collectionCategory || "mount",
      },
    });
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertMount] Error:", err.message);
    return { success: false as const, error: "Database error saving mount" };
  }
}

export async function deleteMount(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.mountTemplate.delete({
      where: { slug },
    });
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteMount] Error:", err.message);
    return { success: false as const, error: "Failed to delete mount" };
  }
}
