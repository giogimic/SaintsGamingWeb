'use server';

import { prisma } from '@/web/lib/prisma';
import { checkAdminPermission } from '../admin/game-admin';

export async function listFoliageDefs() {
  try {
    const list = await prisma.foliageDef.findMany({
      orderBy: { name: 'asc' },
    });
    return { success: true, data: list };
  } catch (error: any) {
    console.error('[listFoliageDefs]', error);
    return { success: false, error: error.message };
  }
}

export async function upsertFoliageDef(payload: {
  id?: string;
  name: string;
  description?: string;
  category: string;
  isInvincible: boolean;
  health: number | null;
  respawnRate: number | null;
  visualData?: string | null;
}) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    let record;
    if (payload.id) {
      record = await prisma.foliageDef.update({
        where: { id: payload.id },
        data: payload,
      });
    } else {
      record = await prisma.foliageDef.create({
        data: payload,
      });
    }
    return { success: true, data: record };
  } catch (error: any) {
    console.error('[upsertFoliageDef]', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFoliageDef(id: string) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    await prisma.foliageDef.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('[deleteFoliageDef]', error);
    return { success: false, error: error.message };
  }
}

export async function listBiomes() {
  try {
    const list = await prisma.biome.findMany({
      include: {
        foliageItems: {
          include: { foliage: true }
        }
      },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: list };
  } catch (error: any) {
    console.error('[listBiomes]', error);
    return { success: false, error: error.message };
  }
}

export async function upsertBiome(payload: any) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    let record;
    const { id, foliageItems, ...data } = payload;
    
    if (id) {
      record = await prisma.biome.update({
        where: { id },
        data,
      });
    } else {
      record = await prisma.biome.create({
        data,
      });
    }
    return { success: true, data: record };
  } catch (error: any) {
    console.error('[upsertBiome]', error);
    return { success: false, error: error.message };
  }
}

export async function upsertBiomeFoliage(payload: { id?: string, biomeId: string, foliageId: string, spawnWeight: number }) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    let record;
    if (payload.id) {
      record = await prisma.biomeFoliage.update({
        where: { id: payload.id },
        data: payload,
      });
    } else {
      record = await prisma.biomeFoliage.create({
        data: payload,
      });
    }
    return { success: true, data: record };
  } catch (error: any) {
    console.error('[upsertBiomeFoliage]', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBiomeFoliage(id: string) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    await prisma.biomeFoliage.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('[deleteBiomeFoliage]', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBiome(id: string) {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    await prisma.biome.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('[deleteBiome]', error);
    return { success: false, error: error.message };
  }
}

export async function resetCanonicalEnvironment() {
  try {
    const isAdmin = await checkAdminPermission();
    if (!isAdmin) return { success: false, error: 'Unauthorized' };

    const { syncCanonicalEnvironment } = await import('@/server/environment/canonicalEnvironmentSync');
    await syncCanonicalEnvironment(prisma);
    return { success: true };
  } catch (error: any) {
    console.error('[resetCanonicalEnvironment]', error);
    return { success: false, error: error.message };
  }
}