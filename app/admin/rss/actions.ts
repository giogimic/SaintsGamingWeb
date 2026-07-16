"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }
}

export async function addRssFeed(formData: FormData) {
  await verifyAdmin();

  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const category = formData.get("category") as string;
  const isActive = formData.get("isActive") === "on";

  if (!title || !url || !category) throw new Error("Missing required fields");

  await prisma.rssFeed.create({
    data: { title, url, category, isActive }
  });

  revalidatePath("/admin/rss");
  revalidatePath("/gaming-news");
}

export async function deleteRssFeed(id: string) {
  await verifyAdmin();
  await prisma.rssFeed.delete({ where: { id } });
  revalidatePath("/admin/rss");
  revalidatePath("/gaming-news");
}

export async function toggleRssFeed(id: string, currentStatus: boolean) {
  await verifyAdmin();
  await prisma.rssFeed.update({
    where: { id },
    data: { isActive: !currentStatus }
  });
  revalidatePath("/admin/rss");
  revalidatePath("/gaming-news");
}
