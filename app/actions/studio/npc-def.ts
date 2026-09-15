'use server';

import { prisma } from '@/web/lib/prisma';
import { checkAdminPermission } from '../admin/game-admin';

export interface NpcDefPayload {
  slug: string;
  name: string;
  description?: string;
  componentsData: string;
}

export async function listNpcDefs(gameId: string = 'saints') {
  try {
    const npcs = await prisma.npcDef.findMany({
      where: { gameId },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: npcs };
  } catch (error: any) {
    console.error('[listNpcDefs]', error);
    return { success: false, error: error.message };
  }
}

export async function upsertNpcDef(gameId: string, payload: NpcDefPayload) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const npc = await prisma.npcDef.upsert({
      where: { slug: payload.slug },
      create: {
        gameId,
        slug: payload.slug,
        name: payload.name,
        description: payload.description,
        componentsData: payload.componentsData,
      },
      update: {
        name: payload.name,
        description: payload.description,
        componentsData: payload.componentsData,
        version: { increment: 1 },
      },
    });

    return { success: true, data: npc };
  } catch (error: any) {
    console.error('[upsertNpcDef]', error);
    return { success: false, error: error.message };
  }
}

export async function deleteNpcDef(slug: string) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    await prisma.npcDef.delete({
      where: { slug },
    });
    return { success: true };
  } catch (error: any) {
    console.error('[deleteNpcDef]', error);
    return { success: false, error: error.message };
  }
}
