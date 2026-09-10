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

export async function getSiteVersion(isStatic = false) {
  if (isStatic) return process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.826";
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    return setting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.826";
  } catch (error) {
    console.error("Failed to load SITE_VERSION, falling back:", error);
    return process.env.NEXT_PUBLIC_SITE_VERSION || "2.1.826";
  }
}

export async function getSpawnMapId() {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "SPAWN_MAP_ID" }
    });
    if (setting?.value) return setting.value;

    const defaultSetting = await prisma.siteSetting.findUnique({
      where: { key: "DEFAULT_MAP_ID" }
    });
    return defaultSetting?.value || "STARTING_MEADOW";
  } catch (e) {
    console.error("Failed to fetch spawn map ID", e);
    return "STARTING_MEADOW";
  }
}
