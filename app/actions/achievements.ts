"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function grantAchievement(username: string, badgeId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Verify admin permissions
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!adminUser || adminUser.permissionLevel < 50) {
    return { error: "Permission denied. Must be an administrator." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { username }
  });

  if (!targetUser) return { error: "User not found." };

  try {
    await prisma.userAchievement.create({
      data: {
        userId: targetUser.id,
        badgeId
      }
    });

    revalidatePath(`/user/${username}`);
    revalidatePath("/admin/achievements");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "User already has this achievement." };
    }
    return { error: "Failed to grant achievement." };
  }
}

export async function revokeAchievement(achievementId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Verify admin permissions
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!adminUser || adminUser.permissionLevel < 50) {
    return { error: "Permission denied." };
  }

  try {
    const deleted = await prisma.userAchievement.delete({
      where: { id: achievementId },
      include: { user: true }
    });

    revalidatePath(`/user/${deleted.user.username}`);
    revalidatePath("/admin/achievements");
    return { success: true };
  } catch (_error) {
    return { error: "Failed to revoke achievement." };
  }
}

export async function getRecentAchievements() {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Verify admin permissions
  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });

  if (!adminUser || adminUser.permissionLevel < 50) {
    return [];
  }

  const achievements = await prisma.userAchievement.findMany({
    orderBy: { earnedAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          username: true,
          image: true
        }
      }
    }
  });

  return achievements;
}
