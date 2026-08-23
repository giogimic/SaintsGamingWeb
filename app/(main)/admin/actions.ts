"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
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

const FORUM_AI_SETTING_KEYS = new Set([
  "forum_ai_enabled",
  "forum_ai_provider",
  "forum_ai_ollama_url",
  "forum_ai_ollama_model",
  "gemini_api_key",
  "GEMINI_API_KEY",
]);

/** Forum Settings → text enhance provider (Developer+). */
export async function updateForumAiSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
    throw new Error("Forbidden");
  }

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || !FORUM_AI_SETTING_KEYS.has(key)) continue;
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  revalidatePath("/admin/forum");
  revalidatePath("/admin/forum/settings");
}
