"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function saveTier(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  const id = formData.get("id") as string | null;
  const level = parseInt(formData.get("level") as string);
  const name = formData.get("name") as string;
  const xpRequired = parseInt(formData.get("xpRequired") as string);
  const icon = formData.get("icon") as string;

  if (isNaN(level) || isNaN(xpRequired) || !name) {
    throw new Error("Invalid tier data provided");
  }

  if (id) {
    await prisma.levelTier.update({
      where: { id },
      data: { level, name, xpRequired, icon }
    });
  } else {
    // Check if level already exists
    const existing = await prisma.levelTier.findUnique({ where: { level } });
    if (existing) throw new Error("A tier for this level already exists");

    await prisma.levelTier.create({
      data: { level, name, xpRequired, icon }
    });
  }

  revalidatePath("/admin/tiers");
}

export async function deleteTier(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  await prisma.levelTier.delete({ where: { id } });
  revalidatePath("/admin/tiers");
}
