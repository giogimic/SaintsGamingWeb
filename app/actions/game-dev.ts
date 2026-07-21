'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSION_LEVELS } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

async function verifyDevAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return false;
  return user.permissionLevel >= PERMISSION_LEVELS.DEVELOPER;
}

// ─── QUEST ACTIONS ──────────────────────────────────────────────

export async function createGameQuest(data: {
  name: string;
  npcId: string;
  description: string;
  dialogStart: string;
  dialogProgress: string;
  dialogComplete: string;
  reqItemId?: string;
  reqAmount?: number;
  reqSkillId?: string;
  reqLevel?: number;
  rewardXp?: number;
  rewardCredits?: number;
  rewardItemId?: string;
  rewardAmount?: number;
}) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    const quest = await prisma.gameQuest.create({
      data: {
        name: data.name,
        npcId: data.npcId,
        description: data.description,
        dialogStart: data.dialogStart,
        dialogProgress: data.dialogProgress,
        dialogComplete: data.dialogComplete,
        reqItemId: data.reqItemId || null,
        reqAmount: data.reqAmount || 0,
        reqSkillId: data.reqSkillId || null,
        reqLevel: data.reqLevel || 0,
        rewardXp: data.rewardXp || 0,
        rewardCredits: data.rewardCredits || 0,
        rewardItemId: data.rewardItemId || null,
        rewardAmount: data.rewardAmount || 0,
      }
    });

    revalidatePath('/admin/game-dev/quests');
    return { success: true, quest };
  } catch (err) {
    console.error('Failed to create quest:', err);
    return { success: false, error: 'Failed to create quest' };
  }
}

export async function deleteGameQuest(id: string) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    await prisma.gameQuest.delete({ where: { id } });
    revalidatePath('/admin/game-dev/quests');
    return { success: true };
  } catch (err) {
    console.error('Failed to delete quest:', err);
    return { success: false, error: 'Failed to delete quest' };
  }
}

export async function fetchAllGameQuests() {
  try {
    const quests = await prisma.gameQuest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: quests };
  } catch (err) {
    console.error('Failed to fetch quests:', err);
    return { success: false, error: 'Failed to fetch quests', data: [] };
  }
}

// ─── ASSET ACTIONS ──────────────────────────────────────────────

export async function createGameAsset(data: {
  name: string;
  category: string;
  subCategory?: string;
  filePath: string;
  width?: number;
  height?: number;
}) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    const asset = await prisma.gameAsset.create({
      data: {
        name: data.name,
        category: data.category,
        subCategory: data.subCategory || null,
        filePath: data.filePath,
        width: data.width || 16,
        height: data.height || 16,
      }
    });

    revalidatePath('/admin/game-dev/assets');
    return { success: true, asset };
  } catch (err) {
    console.error('Failed to create asset:', err);
    return { success: false, error: 'Failed to create asset' };
  }
}

export async function deleteGameAsset(id: string) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    await prisma.gameAsset.delete({ where: { id } });
    revalidatePath('/admin/game-dev/assets');
    return { success: true };
  } catch (err) {
    console.error('Failed to delete asset:', err);
    return { success: false, error: 'Failed to delete asset' };
  }
}

export async function fetchAllGameAssets() {
  try {
    const assets = await prisma.gameAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: assets };
  } catch (err) {
    console.error('Failed to fetch assets:', err);
    return { success: false, error: 'Failed to fetch assets', data: [] };
  }
}
