import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';
import { importStarterPackToDb, AVAILABLE_STARTER_PACKS } from '@/shared/game/setup/prepackagedPacks';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const status = await getSystemSetupStatus(prisma);

    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    
    // Allow import if no users exist, or if user is admin, or if single user in fresh install
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to import world packs' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const packId = body?.packId || 'saints-community-starter';

    const validPack = AVAILABLE_STARTER_PACKS.some((p) => p.id === packId);
    if (!validPack) {
      return NextResponse.json({ error: `Invalid pack ID: ${packId}` }, { status: 400 });
    }

    const result = await importStarterPackToDb(prisma, packId);

    return NextResponse.json({
      success: result.success,
      importedMaps: result.importedMaps,
      importedCreatures: result.importedCreatures,
      message: result.message,
    });
  } catch (error: any) {
    console.error('[api/setup/import] Failed to import starter pack:', error);
    return NextResponse.json({ error: error.message || 'Failed to import pack' }, { status: 500 });
  }
}
