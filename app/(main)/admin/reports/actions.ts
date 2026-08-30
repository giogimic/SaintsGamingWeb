"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateReportStatus(reportId: string, status: "RESOLVED" | "DISMISSED") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const viewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });

  if (!viewer || viewer.permissionLevel < PERMISSION_LEVELS.MODERATOR) {
    throw new Error("Insufficient permissions");
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { status },
  });

  revalidatePath("/admin/reports");
  return { success: true };
}
