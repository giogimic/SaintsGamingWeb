"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { revalidatePath } from "next/cache";

export async function togglePinPost(postId: string, currentPinned: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    throw new Error("Insufficient permissions");
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { isPinned: !currentPinned },
  });

  revalidatePath("/admin/feed");
  return { success: true };
}

export async function toggleCopyrightStrike(postId: string, currentStrike: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    throw new Error("Insufficient permissions");
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { 
      copyrightStrike: !currentStrike,
      throttleStatus: !currentStrike ? "FLAGGED_COPYRIGHT" : null,
    },
  });

  revalidatePath("/admin/feed");
  return { success: true };
}

export async function deleteSocialPost(postId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    throw new Error("Insufficient permissions");
  }

  await prisma.socialPost.delete({
    where: { id: postId },
  });

  revalidatePath("/admin/feed");
  return { success: true };
}
