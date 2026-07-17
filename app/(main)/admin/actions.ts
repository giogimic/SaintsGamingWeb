"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_LEVELS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

export async function updateSiteSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    throw new Error("Forbidden");
  }

  // Iterate over all form data keys and upsert the site settings
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }
  }

  revalidatePath("/admin/settings");
  revalidatePath("/ucp");
  revalidatePath("/ucp/register");
  revalidatePath("/", "layout");
}
