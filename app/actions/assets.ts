"use server";

import { prisma } from "@/web/lib/prisma";

export interface UsableAssetFilter {
  type?: string;
  category?: string;
  query?: string;
  facing?: string;
  animationState?: string;
  limit?: number;
}

export async function listUsableAssets(filter?: UsableAssetFilter) {
  try {
    const where: any = { isActive: true };
    if (filter?.type) where.type = filter.type;
    if (filter?.category) where.category = filter.category;
    if (filter?.facing) where.facing = filter.facing;
    if (filter?.animationState) where.animationState = filter.animationState;

    const rows = await prisma.usableAsset.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take: filter?.limit || 100,
    });

    const needle = (filter?.query || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(needle) ||
            (r.category && r.category.toLowerCase().includes(needle)) ||
            r.tags.toLowerCase().includes(needle)
        )
      : rows;

    return { success: true as const, data };
  } catch (err) {
    console.error("[listUsableAssets]", err);
    return { success: false as const, data: [], error: "Failed to list usable assets" };
  }
}

export async function getUsableAsset(id: string) {
  try {
    const row = await prisma.usableAsset.findUnique({
      where: { id },
      include: { sourceAsset: true },
    });
    if (!row) return { success: false as const, error: "Asset not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getUsableAsset]", err);
    return { success: false as const, error: "Failed to load asset" };
  }
}
