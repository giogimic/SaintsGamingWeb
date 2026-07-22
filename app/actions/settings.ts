"use server";

import { prisma } from "@/lib/prisma";

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

export async function getSiteVersion() {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    return setting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "1.6.5";
  } catch {
    return "1.6.5";
  }
}
