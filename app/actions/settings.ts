"use server";

import { prisma } from "@/web/lib/prisma";

export async function getDiscordInviteUrl() {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "DISCORD_INVITE_URL" }
    });
    return setting?.value || "https://discord.saintsgaming.net";
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
  if (isStatic) return process.env.NEXT_PUBLIC_SITE_VERSION || "v2.1.764";
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "SITE_VERSION" } });
    return setting?.value || process.env.NEXT_PUBLIC_SITE_VERSION || "v2.1.764";
  } catch (e) {
    console.error("Failed to fetch site version", e);
    return process.env.NEXT_PUBLIC_SITE_VERSION || "v2.1.764";
  }
}

export async function getSpawnMapId() {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "SPAWN_MAP_ID" }
    });
    return setting?.value || "DEMO_SANDBOX";
  } catch (e) {
    console.error("Failed to fetch spawn map ID", e);
    return "DEMO_SANDBOX";
  }
}
