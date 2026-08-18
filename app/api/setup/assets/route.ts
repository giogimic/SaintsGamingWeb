import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';
import { AVAILABLE_ASSET_PACKS, installAssetPacks } from '@/server/assetPackInstaller';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      packs: AVAILABLE_ASSET_PACKS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list asset packs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const status = await getSystemSetupStatus(prisma);

    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');

    // Allow asset install if no users exist, or if user is admin, or during fresh install
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to install asset packs' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const packIds: string[] = Array.isArray(body?.packIds) ? body.packIds : ['tilesets'];

    const result = await installAssetPacks(prisma, packIds);

    return NextResponse.json({
      success: true,
      installedCount: result.installedCount,
      skippedCount: result.skippedCount,
      perPack: result.perPack,
    });
  } catch (error: any) {
    console.error('[api/setup/assets] Failed to install asset packs:', error);
    return NextResponse.json({ error: error.message || 'Failed to install asset packs' }, { status: 500 });
  }
}
