"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type ShopTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  currency: string;
  refreshInterval?: number;
  itemsSoldData: string;
};

export async function listShops(searchQuery?: string) {
  try {
    const rows = await prisma.shopTemplate.findMany({
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
    console.error("[listShops]", err);
    return { success: false as const, data: [], error: "Failed to list shops" };
  }
}

export async function getShop(slug: string) {
  try {
    const row = await prisma.shopTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getShop]", err);
    return { success: false as const, error: "Failed to load shop" };
  }
}

export async function upsertShop(input: ShopTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.shopTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        currency: input.currency || "gold",
        refreshInterval: input.refreshInterval,
        itemsSoldData: input.itemsSoldData || "[]",
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId || "default",
        name: input.name.trim() || slug,
        description: input.description,
        currency: input.currency || "gold",
        refreshInterval: input.refreshInterval,
        itemsSoldData: input.itemsSoldData || "[]",
      },
    });

    revalidatePath("/studio");
    return { success: true as const, data: saved };
  } catch (err: any) {
    console.error("[upsertShop] Error:", err.message);
    return { success: false as const, error: "Database error saving shop" };
  }
}

export async function deleteShop(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  if (!slug) return { success: false, error: "slug required" };

  try {
    await prisma.shopTemplate.delete({
      where: { slug },
    });
    revalidatePath("/studio");
    return { success: true as const };
  } catch (err: any) {
    console.error("[deleteShop] Error:", err.message);
    return { success: false as const, error: "Failed to delete shop" };
  }
}
