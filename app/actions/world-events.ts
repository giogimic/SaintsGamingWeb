"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type WorldEventInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  scheduleCron?: string;
  durationSeconds?: number;
  mutationsData: string;
};

export async function listWorldEvents(searchQuery?: string) {
  try {
    const rows = await prisma.worldEventTemplate.findMany({
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
    console.error("[listWorldEvents]", err);
    return { success: false as const, data: [], error: "Failed to list world events" };
  }
}

export async function getWorldEvent(slug: string) {
  try {
    const row = await prisma.worldEventTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getWorldEvent]", err);
    return { success: false as const, error: "Failed to load world event" };
  }
}

export async function upsertWorldEvent(input: WorldEventInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.worldEventTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        isActive: input.isActive ?? false,
        scheduleCron: input.scheduleCron || null,
        durationSeconds: input.durationSeconds || null,
        mutationsData: input.mutationsData || "{}",
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        isActive: input.isActive ?? false,
        scheduleCron: input.scheduleCron || null,
        durationSeconds: input.durationSeconds || null,
        mutationsData: input.mutationsData || "{}",
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertWorldEvent] Error:", err.message);
    return { success: false as const, error: "Database error saving world event" };
  }
}

export async function deleteWorldEvent(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.worldEventTemplate.delete({
      where: { slug },
    });
    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteWorldEvent] Error:", err.message);
    return { success: false as const, error: "Failed to delete world event" };
  }
}
