"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";

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
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteWorldEvent] Error:", err.message);
    return { success: false as const, error: "Failed to delete world event" };
  }
}

/**
 * Live Operations: Triggers an active world event and activates its realm mutations.
 */
export async function triggerLiveWorldEvent(slug: string, durationSeconds?: number) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const template = await prisma.worldEventTemplate.findUnique({ where: { slug } });
    if (!template) return { success: false, error: `Event template '${slug}' not found` };

    const dur = durationSeconds ?? template.durationSeconds ?? 3600;

    const updated = await prisma.worldEventTemplate.update({
      where: { slug },
      data: {
        isActive: true,
        durationSeconds: dur,
      },
    });
    revalidatePath("/lobby");
    return {
      success: true as const,
      data: {
        slug: updated.slug,
        name: updated.name,
        isActive: true,
        durationSeconds: dur,
        startedAt: Date.now(),
        endsAt: Date.now() + dur * 1000,
        mutations: JSON.parse(updated.mutationsData || "{}"),
      },
    };
  } catch (err: any) {
    console.error("[triggerLiveWorldEvent] Error:", err.message);
    return { success: false as const, error: "Failed to trigger live world event" };
  }
}

/**
 * Live Operations: Manually stops an active world event.
 */
export async function stopLiveWorldEvent(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    await prisma.worldEventTemplate.update({
      where: { slug },
      data: { isActive: false },
    });
    revalidatePath("/lobby");
    return { success: true as const, slug };
  } catch (err: any) {
    console.error("[stopLiveWorldEvent] Error:", err.message);
    return { success: false as const, error: "Failed to stop live world event" };
  }
}
