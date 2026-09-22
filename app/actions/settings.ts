"use server";

import { prisma } from "@/web/lib/prisma";

export async function getDiscordInviteUrl() {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "DISCORD_INVITE_URL" }
    });
    return setting?.value || "https://discord.saintsgaming.net";

  } catch {
    return "https://discord.saintsgaming.net";
  }
}

export async function getSiteVersion(isStatic = false): Promise<string> {
  if (isStatic) return process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.939";

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'SITE_VERSION' }
    });
    return setting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.939";
  } catch (error) {
    return process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.939";
  }
}
