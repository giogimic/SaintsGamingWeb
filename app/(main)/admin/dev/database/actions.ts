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

export async function clearExpiredSessions() {
 await verifyDev();
 
 const result = await prisma.session.deleteMany({
 where: { expires: { lt: new Date() } }
 });
 
 revalidatePath("/admin/dev/database");
 return { success: true, count: result.count };
}

export async function clearAllNotifications() {
 await verifyDev();
 
 const result = await prisma.notification.deleteMany({});
 
 revalidatePath("/admin/dev/database");
 return { success: true, count: result.count };
}

export async function nukeAllThreads() {
  await verifyDev();
  // Deleting a thread will cascade and delete its replies
  const result = await prisma.thread.deleteMany({});
  revalidatePath("/admin/dev/database");
  return { success: true, count: result.count };
}

export async function seedDummyThreads() {
  await verifyDev();
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const subCat = await prisma.subCategory.findFirst();
  if (!subCat) return { success: false, message: "No subcategories exist to attach threads to. Please use the 'Push Dummy Content' button first to generate categories." };

  const authorId = session.user.id as string;

  const dummyData = Array.from({ length: 5 }).map((_, i) => ({
    title: `Dummy Test Thread ${Math.random().toString(36).substring(7)}`,
    slug: `dummy-test-thread-${Date.now()}-${i}`,
    body: "This is a rapidly injected test thread for UI debugging purposes. It contains absolutely no substance.",
    subcategoryId: subCat.id,
    authorId: authorId,
    isPinned: false,
    isLocked: false,
  }));
  
  const result = await prisma.thread.createMany({ data: dummyData });
  revalidatePath("/admin/dev/database");
  return { success: true, count: result.count };
}
