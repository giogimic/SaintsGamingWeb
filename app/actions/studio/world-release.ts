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

