"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function deleteCharacter(characterId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  await prisma.character.delete({
    where: { id: characterId }
  });

  revalidatePath("/admin/characters");
}
