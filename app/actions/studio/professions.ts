"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import { getProfessionDef, getAllProfessionDefs } from "@/shared/game/professions/professionRegistry";
import { getSkillGuide } from "@/shared/game/skillGuideData";

export type ProfessionTemplateInput = {
  gameId?: string;
  profileId?: string;
  slug: string;
  name: string;
  description?: string;
  iconAssetId?: string;
  category?: string;
  themeColor?: string;
  tagline?: string;
  stationTags?: string[] | string;
  xpCurve: string;
  maxLevel: number;
  trainingMethodsJson?: string;
  perksJson?: string;
  milestonesJson?: string;
  battlepassTiersJson?: string;
};

function buildFallbackTemplate(slug: string) {
  const profDef = getProfessionDef(slug);
  const guide = getSkillGuide(slug);

  if (!profDef && !guide) return null;

  return {
    id: `canonical_${slug}`,
    gameId: "saints",
    profileId: "default",
    slug,
    name: profDef?.name || guide?.name || slug,
    description: profDef?.description || guide?.summary || "",
    iconAssetId: profDef?.iconName || guide?.iconName || "Zap",
    category: profDef?.subCategory || guide?.category || "Artisan",
    themeColor: profDef?.themeColor || guide?.themeColor || "#64748b",
    tagline: profDef?.tagline || guide?.tagline || "",
    stationTags: JSON.stringify(profDef?.stationTags || []),
    xpCurve: "exponential",
    maxLevel: profDef?.maxLevel || guide?.maxLevel || 99,
    trainingMethodsJson: JSON.stringify(guide?.trainingMethods || []),
    perksJson: JSON.stringify(guide?.perLevelPerks || []),
    milestonesJson: JSON.stringify(guide?.staticMilestones || []),
    battlepassTiersJson: JSON.stringify(guide?.battlepassTiers || []),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function listProfessionTemplates(searchQuery?: string) {
  try {
    const rows = await prisma.professionTemplate.findMany({
      orderBy: { name: "asc" },
      take: 200,
    });

    const dbSlugs = new Set(rows.map((r) => r.slug.toLowerCase()));
    const merged = [...rows];

    // Merge in any canonical 27 professions not yet stored in DB
    const allDefs = getAllProfessionDefs();
    for (const def of allDefs) {
      if (!dbSlugs.has(def.id.toLowerCase())) {
        const fallback = buildFallbackTemplate(def.id);
        if (fallback) merged.push(fallback as any);
      }
    }

    const needle = (searchQuery || "").trim().toLowerCase();
    const data = needle
      ? merged.filter(
          (r) =>
            r.slug.toLowerCase().includes(needle) ||
            r.name.toLowerCase().includes(needle) ||
            (r.category && r.category.toLowerCase().includes(needle))
        )
      : merged;

    return { success: true as const, data };
  } catch (err) {
    console.error("[listProfessionTemplates]", err);
    return { success: false as const, data: [], error: "Failed to list profession templates" };
  }
}

export async function getProfessionTemplate(slug: string) {
  try {
    const row = await prisma.professionTemplate.findUnique({ where: { slug } });
    if (row) return { success: true as const, data: row };

    const fallback = buildFallbackTemplate(slug);
    if (fallback) return { success: true as const, data: fallback as any };

    return { success: false as const, error: "Not found" };
  } catch (err) {
    console.error("[getProfessionTemplate]", err);
    return { success: false as const, error: "Failed to load profession template" };
  }
}

export async function upsertProfessionTemplate(input: ProfessionTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const slug = input.slug.trim().toLowerCase();
  if (!slug) return { success: false, error: "slug required" };

  const stationTagsStr = Array.isArray(input.stationTags)
    ? JSON.stringify(input.stationTags)
    : typeof input.stationTags === "string"
    ? input.stationTags
    : "[]";

  try {
    const dataPayload = {
      gameId: input.gameId || "saints",
      profileId: input.profileId || "default",
      name: input.name.trim() || slug,
      description: input.description,
      iconAssetId: input.iconAssetId,
      category: input.category || "Artisan",
      themeColor: input.themeColor || "#64748b",
      tagline: input.tagline,
      stationTags: stationTagsStr,
      xpCurve: input.xpCurve || "exponential",
      maxLevel: input.maxLevel || 99,
      trainingMethodsJson: input.trainingMethodsJson || "[]",
      perksJson: input.perksJson || "[]",
      milestonesJson: input.milestonesJson || "[]",
      battlepassTiersJson: input.battlepassTiersJson || "[]",
    };

    const saved = await prisma.professionTemplate.upsert({
      where: { slug },
      create: {
        slug,
        ...dataPayload,
      },
      update: dataPayload,
    });
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
    return { success: true };
  } catch (err) {
    console.error("[deleteProfessionTemplate]", err);
    return { success: false, error: "Failed to delete" };
  }
}
