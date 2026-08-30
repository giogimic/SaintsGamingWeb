"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";
import { revalidatePath } from "next/cache";

export interface PromoCampaign {
  id: string;
  code: string;
  partnerName: string;
  rewardType: "COINS" | "XP" | "ITEM";
  rewardValue: number;
  rewardItemName?: string;
  clicks: number;
  redemptions: number;
  isActive: boolean;
  createdAt: string;
}

const PROMO_SETTINGS_KEY = "PROMO_CAMPAIGNS_JSON";

export async function createPromoCampaign(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  const code = (formData.get("code") as string)?.toUpperCase().trim();
  const partnerName = (formData.get("partnerName") as string)?.trim() || "Community General";
  const rewardType = ((formData.get("rewardType") as string) || "COINS") as "COINS" | "XP" | "ITEM";
  const rewardValue = parseInt(formData.get("rewardValue") as string, 10) || 500;
  const rewardItemName = (formData.get("rewardItemName") as string)?.trim() || undefined;

  if (!code) throw new Error("Promo code is required.");

  const currentSetting = await prisma.siteSetting.findUnique({
    where: { key: PROMO_SETTINGS_KEY },
  });

  let campaigns: PromoCampaign[] = [];
  if (currentSetting?.value) {
    try {
      campaigns = JSON.parse(currentSetting.value);
    } catch {
      campaigns = [];
    }
  }

  // Check duplicate
  if (campaigns.some((c) => c.code === code)) {
    throw new Error(`Promo code "${code}" already exists.`);
  }

  const newCampaign: PromoCampaign = {
    id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    code,
    partnerName,
    rewardType,
    rewardValue,
    rewardItemName,
    clicks: 0,
    redemptions: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  campaigns.unshift(newCampaign);

  await prisma.siteSetting.upsert({
    where: { key: PROMO_SETTINGS_KEY },
    update: { value: JSON.stringify(campaigns) },
    create: { key: PROMO_SETTINGS_KEY, value: JSON.stringify(campaigns) },
  });

  revalidatePath("/admin/promo");
}

export async function togglePromoCampaign(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  const campaignId = formData.get("campaignId") as string;
  if (!campaignId) return;

  const currentSetting = await prisma.siteSetting.findUnique({
    where: { key: PROMO_SETTINGS_KEY },
  });

  if (!currentSetting?.value) return;

  try {
    let campaigns: PromoCampaign[] = JSON.parse(currentSetting.value);
    campaigns = campaigns.map((c) => (c.id === campaignId ? { ...c, isActive: !c.isActive } : c));

    await prisma.siteSetting.update({
      where: { key: PROMO_SETTINGS_KEY },
      data: { value: JSON.stringify(campaigns) },
    });
  } catch {
    // ignore
  }

  revalidatePath("/admin/promo");
}

export async function deletePromoCampaign(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.permissionLevel < PERMISSION_LEVELS.ADMIN) {
    throw new Error("Forbidden");
  }

  const campaignId = formData.get("campaignId") as string;
  if (!campaignId) return;

  const currentSetting = await prisma.siteSetting.findUnique({
    where: { key: PROMO_SETTINGS_KEY },
  });

  if (!currentSetting?.value) return;

  try {
    let campaigns: PromoCampaign[] = JSON.parse(currentSetting.value);
    campaigns = campaigns.filter((c) => c.id !== campaignId);

    await prisma.siteSetting.update({
      where: { key: PROMO_SETTINGS_KEY },
      data: { value: JSON.stringify(campaigns) },
    });
  } catch {
    // ignore
  }

  revalidatePath("/admin/promo");
}
