"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { revalidatePath } from "next/cache";

export const ALLOWED_SEO_KEYS = [
  "SITE_NAME",
  "META_DESCRIPTION",
  "SEO_TITLE_TEMPLATE",
  "SEO_KEYWORDS",
  "SEO_CANONICAL_URL",
  "SEO_OG_IMAGE",
  "SEO_TWITTER_HANDLE",
  "SEO_TWITTER_CARD_TYPE",
  "SEO_GOOGLE_VERIFICATION",
  "SEO_BING_VERIFICATION",
  "SEO_ROBOTS_CUSTOM",
  "SEO_BLOCK_AI_CRAWLERS",
  "SEO_STRUCTURED_DATA_CUSTOM",
  "SEO_FAQ_DATA",
  "SEO_INDEXNOW_KEY",
] as const;

export type SeoSettingKey = (typeof ALLOWED_SEO_KEYS)[number];

export interface SitemapInventoryStats {
  staticCount: number;
  newsCount: number;
  modpacksCount: number;
  forumCategoriesCount: number;
  threadsCount: number;
  usersCount: number;
  totalUrls: number;
  lastUpdated: string;
}

/**
 * Fetch live database record counts for all sitemap categories.
 */
export async function getSitemapStats(): Promise<SitemapInventoryStats> {
  try {
    const [newsCount, modpacksCount, forumCategoriesCount, threadsCount, usersCount] =
      await Promise.all([
        prisma.newsArticle.count({ where: { isPublished: true } }),
        prisma.modpack.count({ where: { status: "Active" } }),
        prisma.subCategory.count({
          where: { isLocked: false, reqVIP: false, reqFounder: false, reqTrusted: false },
        }),
        prisma.thread.count({
          where: {
            subcategory: { isLocked: false, reqVIP: false, reqFounder: false, reqTrusted: false },
          },
        }),
        prisma.user.count({
          where: { isBanned: false },
        }),
      ]);

    const staticCount = 10;
    const totalUrls =
      staticCount +
      newsCount +
      modpacksCount +
      forumCategoriesCount +
      Math.min(threadsCount, 1000) +
      Math.min(usersCount, 5000);

    return {
      staticCount,
      newsCount,
      modpacksCount,
      forumCategoriesCount,
      threadsCount: Math.min(threadsCount, 1000),
      usersCount: Math.min(usersCount, 5000),
      totalUrls,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[SEO] Failed to calculate sitemap statistics:", err);
    return {
      staticCount: 10,
      newsCount: 0,
      modpacksCount: 0,
      forumCategoriesCount: 0,
      threadsCount: 0,
      usersCount: 0,
      totalUrls: 10,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Save SEO and Search Engine configurations to SiteSetting key-value table.
 */
export async function saveSeoConfiguration(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true, isWriter: true },
  });

  if (!user || (user.permissionLevel < PERMISSION_LEVELS.ADMIN && !user.isWriter)) {
    return { success: false, error: "Forbidden: Insufficient privileges" };
  }

  const allowedKeySet = new Set<string>(ALLOWED_SEO_KEYS);

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && allowedKeySet.has(key)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }

  revalidatePath("/admin/seo");
  revalidatePath("/admin/settings");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/llms.txt");
  revalidatePath("/BingSiteAuth.xml");
  revalidatePath("/", "layout");

  return { success: true, message: "SEO settings and search engine configuration updated." };
}
