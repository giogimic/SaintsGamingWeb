'use server';

import { prisma } from '@/web/lib/prisma';
import { checkAdminPermission } from '../admin/game-admin';

export async function initWorldProject(slug: string = 'saints', name: string = 'Saints World') {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const project = await prisma.worldProject.upsert({
      where: { slug },
      create: {
        slug,
        name,
        description: 'The canonical Saints MMO world project.',
      },
      update: {},
    });
    return { success: true, project };
  } catch (err: any) {
    console.error('[initWorldProject]', err);
    return { success: false, error: err.message };
  }
}

export async function getActiveWorldProject(slug: string = 'saints') {
  try {
    const project = await prisma.worldProject.findUnique({
      where: { slug },
      include: {
        releases: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });
    if (!project) return { success: false, error: 'Project not found' };
    return { success: true, project };
  } catch (err: any) {
    console.error('[getActiveWorldProject]', err);
    return { success: false, error: err.message };
  }
}

export async function setCanonicalSpawn(gateId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const config = await prisma.gameConfig.findFirst();
    if (!config) return { success: false, error: 'No game config found' };

    await prisma.gameConfig.update({
      where: { id: config.id },
      data: { defaultSpawnGateId: gateId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCanonicalSpawn() {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const config = await prisma.gameConfig.findFirst();
    return { success: true, gateId: config?.defaultSpawnGateId || '' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
