'use server';

import { prisma } from '@/web/lib/prisma';
import { compileWorldRelease } from './compiler/WorldCompiler';
import { checkAdminPermission } from '../admin/game-admin';

export async function createWorldRelease(projectId: string, title?: string, description?: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const { releaseInfo } = await compileWorldRelease(projectId, title, description);
    
    return { 
      success: true, 
      releaseId: releaseInfo.releaseId, 
      version: releaseInfo.version,
      deployStatus: 'pending' // Handled asynchronously by MapSyncService
    };
  } catch (err: any) {
    console.error('[createWorldRelease]', err);
    return { success: false, error: err.message };
  }
}

export async function deployWorldRelease(releaseId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const release = await prisma.worldRelease.findUnique({ where: { id: releaseId } });
    if (!release) return { success: false, error: 'Release not found' };

    await prisma.$transaction([
      prisma.worldRelease.updateMany({
        where: { projectId: release.projectId, status: 'LIVE' },
        data: { status: 'PUBLISHED' }
      }),
      prisma.worldRelease.update({
        where: { id: releaseId },
        data: { status: 'LIVE' }
      })
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('[deployWorldRelease]', err);
    return { success: false, error: err.message };
  }
}

export async function getActiveWorldRelease(projectId: string = 'saints') {
  try {
    const release = await prisma.worldRelease.findFirst({
      where: { projectId, status: 'LIVE' },
      orderBy: { createdAt: 'desc' }
    });
    return release;
  } catch (err) {
    console.error('[getActiveWorldRelease]', err);
    return null;
  }
}

