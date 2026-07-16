"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function createRole(data: { name: string, level: number, color: string }) {
  const session = await auth();
  const currentUserLevel = ((session?.user as any  )?.permissionLevel as number) || 0;
  
  if (currentUserLevel < PERMISSION_LEVELS.DEVELOPER) {
    throw new Error("Only Developers can create new roles.");
  }

  await prisma.role.create({
    data
  });
  
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function deleteRole(id: string) {
  const session = await auth();
  const currentUserLevel = ((session?.user as any  )?.permissionLevel as number) || 0;
  
  if (currentUserLevel < PERMISSION_LEVELS.DEVELOPER) {
    throw new Error("Only Developers can delete roles.");
  }

  // Prevent deleting critical roles
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new Error("Role not found");
  if (role.level === 100 || role.level === 1100) {
    throw new Error("Cannot delete base User or Developer roles.");
  }

  await prisma.role.delete({
    where: { id }
  });
  
  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}
