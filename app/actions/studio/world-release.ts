'use server';

import { prisma } from '@/web/lib/prisma';
import { compileWorldRelease } from './compiler/WorldCompiler';
import { checkAdminPermission } from '../admin/game-admin';

async function deployCompiledWorldRelease(releaseId: string) {
  try {
    const release = await prisma.worldRelease.findUnique({ where: { id: releaseId } });
    if (!release) return { success: false as const, error: 'Release not found' };

    const { MapSyncService } = await import('@/server/mapSyncService');
    const syncResult = await MapSyncService.enqueueProjectRelease({
      projectId: release.projectId,
      version: release.version,
      userId: 'system',
      eagerPush: true,
    });
    if (!syncResult.ok) {
      return {
        success: false as const,
        error: `Release remains PUBLISHED because the Go MMO sync failed: ${syncResult.error || 'unknown error'}`,
      };
    }

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

    return { success: true as const };
  } catch (err: any) {
    console.error('[deployWorldRelease]', err);
    return { success: false as const, error: err.message };
  }
}

export async function compileAndDeployWorldRelease(projectId: string, title?: string, description?: string) {
  try {
    const { releaseInfo } = await compileWorldRelease(projectId, title, description);
    const deployment = await deployCompiledWorldRelease(releaseInfo.releaseId);
    if (!deployment.success) return deployment;

    return {
      success: true as const,
      releaseId: releaseInfo.releaseId,
      version: releaseInfo.version,
      deployStatus: 'deployed' as const,
    };
  } catch (err: any) {
    console.error('[compileAndDeployWorldRelease]', err);
    return { success: false as const, error: err.message };
  }
}

export async function createWorldRelease(projectId: string, title?: string, description?: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  return compileAndDeployWorldRelease(projectId, title, description);
}

export async function deployWorldRelease(releaseId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  return deployCompiledWorldRelease(releaseId);
}

export async function getActiveWorldRelease(projectIdOrSlug: string = 'saints') {
  try {
    // 1. Resolve project by ID or slug
    const project = await prisma.worldProject.findFirst({
      where: {
        OR: [
          { id: projectIdOrSlug },
          { slug: projectIdOrSlug },
        ],
      },
      select: { id: true, slug: true },
    });

    const targetProjectIds = project
      ? Array.from(new Set([project.id, projectIdOrSlug, project.slug]))
      : [projectIdOrSlug];

    return await prisma.worldRelease.findFirst({
      where: {
        projectId: { in: targetProjectIds },
        status: 'LIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('[getActiveWorldRelease]', err);
    return null;
  }
}

