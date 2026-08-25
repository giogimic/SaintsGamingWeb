'use server';

import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';
import { PERMISSION_LEVELS } from '@/web/lib/permissions';
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
  name?: string;
  category?: string;
  subCategory?: string;
  filePath?: string;
  width?: number;
  height?: number;
  type?: string;
  source?: string;
  tags?: string[];
  categories?: string[];
  metadata?: any;
}) {
  try {
    const isDev = await verifyDevAdmin();
    if (!isDev) return { success: false, error: 'Unauthorized' };

    const type = data.type || (data.category?.toUpperCase() === 'TERRAIN' ? 'TILESET' : 'SPRITE');
    const source = data.source || data.filePath || '';
    const tags = data.tags || (data.category ? [data.category.toLowerCase()] : []);
    const categories = data.categories || (data.category ? [data.category.toLowerCase()] : []);
    const metadata = data.metadata || { width: data.width || 16, height: data.height || 16, name: data.name };

    const asset = await prisma.gameAsset.create({
      data: {
        type,
        source,
        tags: JSON.stringify(tags),
        categories: JSON.stringify(categories),
        metadata: JSON.stringify(metadata),
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
    const rawAssets = await prisma.gameAsset.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const assets = rawAssets.map((asset) => {
      let parsedMetadata: any = {};
      let parsedTags: string[] = [];
      let parsedCategories: string[] = [];

      try {
        parsedMetadata = asset.metadata ? JSON.parse(asset.metadata) : {};
      } catch {
        parsedMetadata = {};
      }

      try {
        parsedTags = asset.tags ? JSON.parse(asset.tags) : [];
      } catch {
        parsedTags = [];
      }

      try {
        parsedCategories = asset.categories ? JSON.parse(asset.categories) : [];
      } catch {
        parsedCategories = [];
      }

      const sourceUrl = asset.cdnUrl || asset.source || '';
      const filename = sourceUrl ? sourceUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') : '';
      const name = parsedMetadata.name || parsedMetadata.displayName || filename || `Asset ${asset.id.slice(-6)}`;

      let category = 'Environment';
      const catLower = [
        ...parsedCategories.map((c) => String(c).toLowerCase()),
        ...parsedTags.map((t) => String(t).toLowerCase()),
        (asset.type || '').toLowerCase(),
      ];

      if (catLower.some((c) => c.includes('terrain') || c.includes('tile') || c.includes('ground') || c.includes('floor') || c.includes('wall'))) {
        category = 'Terrain';
      } else if (catLower.some((c) => c.includes('monster') || c.includes('beast') || c.includes('creature'))) {
        category = 'Monsters/Beasts';
      } else if (catLower.some((c) => c.includes('npc') || c.includes('char') || c.includes('hero') || c.includes('player') || c.includes('sprite'))) {
        category = 'NPCs';
      } else if (catLower.some((c) => c.includes('item') || c.includes('icon') || c.includes('equipment') || c.includes('weapon') || c.includes('potion'))) {
        category = 'Items';
      } else if (catLower.some((c) => c.includes('env') || c.includes('prop') || c.includes('decor') || c.includes('building') || c.includes('tree'))) {
        category = 'Environment';
      } else if (asset.type === 'TILESET') {
        category = 'Terrain';
      } else if (asset.type === 'SPRITE') {
        category = 'NPCs';
      } else if (asset.type === 'ITEM_ICON') {
        category = 'Items';
      }

      const filePath = asset.cdnUrl || asset.source || '';

      return {
        id: asset.id,
        name,
        category,
        filePath,
        source: asset.source,
        cdnUrl: asset.cdnUrl,
        type: asset.type,
        tags: parsedTags,
        categories: parsedCategories,
        metadata: parsedMetadata,
        createdAt: asset.createdAt,
      };
    });

    return { success: true, data: assets };
  } catch (err) {
    console.error('Failed to fetch assets:', err);
    return { success: false, error: 'Failed to fetch assets', data: [] };
  }
}
