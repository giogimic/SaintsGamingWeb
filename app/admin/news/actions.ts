"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { awardXP, XP_VALUES } from "@/lib/xp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "crypto";

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const hash = crypto.randomBytes(3).toString("hex");
  return `${base}-${hash}`;
}

export async function saveNewsArticle(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  const id = formData.get("id") as string | null;
  const title = formData.get("title") as string;
  const excerpt = formData.get("excerpt") as string;
  const body = formData.get("body") as string;
  const coverImage = formData.get("coverImage") as string;
  const isPublished = formData.get("isPublished") === "on";
  const publishedAtStr = formData.get("publishedAt") as string;

  let publishedAt = null;
  if (isPublished) {
    publishedAt = publishedAtStr ? new Date(publishedAtStr) : new Date();
  }

  if (!title || !body) throw new Error("Title and body are required");

  // Format promo links and media assets from JSON strings if provided
  const promoLinksJson = formData.get("promoLinks") as string;
  const mediaAssetsJson = formData.get("mediaAssets") as string;

  const promoLinks = promoLinksJson ? JSON.parse(promoLinksJson) : [];
  const mediaAssets = mediaAssetsJson ? JSON.parse(mediaAssetsJson) : [];



  if (id) {
    // Update existing
    await prisma.promoLink.deleteMany({ where: { articleId: id } });
    await prisma.mediaAsset.deleteMany({ where: { articleId: id } });

    await prisma.newsArticle.update({
      where: { id },
      data: {
        title,
        excerpt,
        body,
        coverImage,
        isPublished,
        publishedAt,
        promoLinks: { create: promoLinks.map((l: any  ) => ({ title: l.title, url: l.url, type: l.type })) },
        mediaAssets: { create: mediaAssets.map((a: any  ) => ({ title: a.title, url: a.url, type: a.type })) },
      }
    });
  } else {
    // Create new
    const newSlug = generateSlug(title);
    await prisma.newsArticle.create({
      data: {
        title,
        slug: newSlug,
        excerpt,
        body,
        coverImage,
        isPublished,
        publishedAt,
        authorId: session.user.id,
        promoLinks: { create: promoLinks.map((l: any  ) => ({ title: l.title, url: l.url, type: l.type })) },
        mediaAssets: { create: mediaAssets.map((a: any  ) => ({ title: a.title, url: a.url, type: a.type })) },
      }
    });

    await awardXP(session.user.id, XP_VALUES.NEWS_CREATE);
  }

  revalidatePath("/admin/news");
  revalidatePath("/news");
  redirect("/admin/news");
}

export async function deleteNewsArticle(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  await prisma.newsArticle.delete({ where: { id } });
  revalidatePath("/admin/news");
  revalidatePath("/news");
}
