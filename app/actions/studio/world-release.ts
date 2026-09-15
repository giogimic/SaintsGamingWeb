'use server';

import { prisma } from '@/web/lib/prisma';
import { compileWorldRelease } from './compiler/WorldCompiler';
import { checkAdminPermission } from '../admin/game-admin';

export async function createWorldRelease(projectId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const { releaseInfo } = await compileWorldRelease(projectId);
    
    // Notify Go server of the exact immutable release
    await notifyGoServer(projectId, releaseInfo.version);
    
    return { success: true, releaseId: releaseInfo.releaseId, version: releaseInfo.version };
  } catch (err: any) {
    console.error('[createWorldRelease]', err);
    return { success: false, error: err.message };
  }
}

async function notifyGoServer(projectId: string, version: string) {
  const goMmoBase = process.env.GO_MMO_INTERNAL_URL || process.env.NEXT_PUBLIC_GO_MMO_URL || 'http://localhost:24011';
  const secret = process.env.AUTH_SECRET || '';

  try {
    const res = await fetch(`${goMmoBase}/api/internal/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
        'X-Saints-Internal-Secret': secret
      },
      body: JSON.stringify({ type: 'project', id: projectId, versionStr: version })
    });

    if (!res.ok) {
      console.warn(`[notifyGoServer] Go Server returned ${res.status}`);
    }
  } catch (deployErr) {
    console.warn(`[notifyGoServer] Go MMO server unreachable, skipping notification.`, deployErr);
  }
}
