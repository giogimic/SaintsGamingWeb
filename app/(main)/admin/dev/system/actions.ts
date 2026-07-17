"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";

async function verifyDev() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true }
  });
  
  if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    throw new Error("Forbidden");
  }
}

export async function clearEntireCache() {
  await verifyDev();
  // Clears the entire Next.js router cache
  revalidatePath("/", "layout");
  return { success: true, message: "Full layout cache cleared." };
}

export async function clearPathCache(path: string) {
  await verifyDev();
  revalidatePath(path);
  return { success: true, message: `Cache for path '${path}' cleared.` };
}
