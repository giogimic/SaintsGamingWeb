"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function getGameServers() {
  return await prisma.gameServer.findMany({
    orderBy: { order: 'asc' }
  });
}

export async function addGameServer(data: { name: string; game: string; ip: string; port: number }) {
  const session = await auth();
  const dbUser = await prisma.user.findUnique({ where: { id: session?.user?.id } });
  if (!dbUser || dbUser.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Unauthorized");
  }

  await prisma.gameServer.create({
    data: {
      ...data,
      order: 0,
      isActive: true,
    }
  });

  revalidatePath("/admin/game-servers");
  revalidatePath("/servers");
}

export async function toggleMaintenance(id: string, isActive: boolean) {
  const session = await auth();
  const dbUser = await prisma.user.findUnique({ where: { id: session?.user?.id } });
  if (!dbUser || dbUser.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Unauthorized");
  }

  await prisma.gameServer.update({
    where: { id },
    data: { isActive }
  });

  revalidatePath("/admin/game-servers");
  revalidatePath("/servers");
}

export async function deleteGameServer(id: string) {
  const session = await auth();
  const dbUser = await prisma.user.findUnique({ where: { id: session?.user?.id } });
  if (!dbUser || dbUser.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Unauthorized");
  }

  await prisma.gameServer.delete({
    where: { id }
  });

  revalidatePath("/admin/game-servers");
  revalidatePath("/servers");
}
