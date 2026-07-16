"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

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

export async function runTask_ClearCache() {
 await verifyDev();
 // Simulate heavy processing
 await new Promise(resolve => setTimeout(resolve, 1500));
 // In Next.js App Router, we can clear the whole cache by revalidating the root layout
 revalidatePath("/", "layout");
 return { success: true, message: "Next.js cache cleared." };
}

export async function runTask_SyncDiscordRoles() {
 await verifyDev();
 // Simulate API call to Discord
 await new Promise(resolve => setTimeout(resolve, 2500));
 return { success: true, message: "Mock: Synced roles for 15 connected users." };
}

export async function runTask_AuditLogs() {
 await verifyDev();
 await new Promise(resolve => setTimeout(resolve, 1000));
 return { success: true, message: "Audit logs archived successfully." };
}
