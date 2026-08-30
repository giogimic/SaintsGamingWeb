"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { revalidatePath } from "next/cache";

export async function broadcastSystemNotification(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Insufficient permissions");
  }

  const title = (formData.get("title") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();
  const link = (formData.get("link") as string)?.trim() || null;
  const targetGroup = (formData.get("targetGroup") as string) || "ALL";

  if (!message) {
    throw new Error("Message is required");
  }

  const fullMessage = title ? `[${title}] ${message}` : message;

  let usersToNotify: { id: string }[] = [];

  if (targetGroup === "ALL") {
    usersToNotify = await prisma.user.findMany({ select: { id: true } });
  } else if (targetGroup === "STAFF") {
    usersToNotify = await prisma.user.findMany({
      where: { permissionLevel: { gte: PERMISSION_LEVELS.MODERATOR } },
      select: { id: true },
    });
  } else if (targetGroup === "VIP") {
    usersToNotify = await prisma.user.findMany({
      where: { OR: [{ isVIP: true }, { isFounder: true }] },
      select: { id: true },
    });
  }

  if (usersToNotify.length > 0) {
    await prisma.notification.createMany({
      data: usersToNotify.map((u) => ({
        userId: u.id,
        type: "SYSTEM",
        message: fullMessage,
        link,
      })),
    });
  }

  revalidatePath("/admin/notifications");
}

export async function deleteOldNotifications(days: number = 30): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Insufficient permissions");
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await prisma.notification.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  revalidatePath("/admin/notifications");
}
