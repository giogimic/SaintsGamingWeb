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

    // 2. Query for explicit LIVE release
    let release = await prisma.worldRelease.findFirst({
      where: {
        projectId: { in: targetProjectIds },
        status: 'LIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fallback: Query for PUBLISHED release
    if (!release) {
      release = await prisma.worldRelease.findFirst({
        where: {
          projectId: { in: targetProjectIds },
          status: 'PUBLISHED',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 4. Fallback: Query for any release belonging to this project
    if (!release) {
      release = await prisma.worldRelease.findFirst({
        where: {
          projectId: { in: targetProjectIds },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 5. Ultimate Fallback: Query latest release across the entire database
    if (!release) {
      release = await prisma.worldRelease.findFirst({
        orderBy: { createdAt: 'desc' },
      });
    }

    // 6. Auto-heal: Ensure this active release is marked LIVE if none other is
    if (release && release.status !== 'LIVE') {
      prisma.worldRelease.update({
        where: { id: release.id },
        data: { status: 'LIVE' },
      }).catch((e) => console.warn('[getActiveWorldRelease] Auto-heal to LIVE skipped:', e));
    }

    return release;
  } catch (err) {
    console.error('[getActiveWorldRelease]', err);
    return null;
  }
}

