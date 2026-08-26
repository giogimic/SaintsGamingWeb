"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";

export type ProfessionTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  iconAssetId?: string;
  xpCurve: string;
  maxLevel: number;
};

export async function listProfessionTemplates(searchQuery?: string) {
  try {
    const rows = await prisma.professionTemplate.findMany({
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
    console.error("[listProfessionTemplates]", err);
    return { success: false as const, data: [], error: "Failed to list profession templates" };
  }
}

export async function getProfessionTemplate(slug: string) {
  try {
    const row = await prisma.professionTemplate.findUnique({ where: { slug } });
    if (!row) return { success: false as const, error: "Not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getProfessionTemplate]", err);
    return { success: false as const, error: "Failed to load profession template" };
  }
}

export async function upsertProfessionTemplate(input: ProfessionTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim();
  if (!slug) return { success: false, error: "slug required" };

  try {
    const saved = await prisma.professionTemplate.upsert({
      where: { slug },
      create: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        slug,
        name: input.name.trim() || slug,
        description: input.description,
        iconAssetId: input.iconAssetId,
        xpCurve: input.xpCurve || "exponential",
        maxLevel: input.maxLevel || 99,
      },
      update: {
        gameId: input.gameId || "saints",
        profileId: input.profileId,
        name: input.name.trim() || slug,
        description: input.description,
        iconAssetId: input.iconAssetId,
        xpCurve: input.xpCurve || "exponential",
        maxLevel: input.maxLevel || 99,
      },
    });

    revalidatePath("/studio");
    revalidatePath("/lobby");
    return { success: true, data: saved };
  } catch (err) {
    console.error("[upsertProfessionTemplate]", err);
    return { success: false, error: "Failed to save profession template" };
  }
}

export async function deleteProfessionTemplate(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };
  try {
    await prisma.professionTemplate.delete({ where: { slug } });
    revalidatePath("/studio");
    return { success: true };
  } catch (err) {
    console.error("[deleteProfessionTemplate]", err);
    return { success: false, error: "Failed to delete" };
  }
}
