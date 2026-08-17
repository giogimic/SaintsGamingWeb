import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { AVAILABLE_ASSET_PACKS, installAssetPacks } from '@/server/assetPackInstaller';

export const dynamic = 'force-dynamic';

/**
 * POST /api/assets/install-pack — Install bundled asset packs into DB (Studio / Admin)
 * Body:
 *   - pack: string (e.g. "tilesets", "all", "creatures") OR
 *   - packs: string[]
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const isElevated =
      !user || // Allow during local development / unauthenticated studio session
      user.permissionLevel >= 40 ||
      user.role === 'ADMIN' ||
      user.role === 'DEVELOPER';

    if (!isElevated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Developer or Admin permission required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const packParam = body.pack || body.packId;
    let packIds: string[] = [];

    if (Array.isArray(body.packs) || Array.isArray(body.packIds)) {
      packIds = body.packs || body.packIds;
    } else if (typeof packParam === 'string' && packParam.trim()) {
      packIds = [packParam.trim()];
    } else {
      packIds = ['tilesets'];
    }

    const result = await installAssetPacks(prisma, packIds);

    return NextResponse.json({
      success: true,
      installed: result.installedCount,
      installedCount: result.installedCount,
      skipped: result.skippedCount,
      skippedCount: result.skippedCount,
      perPack: result.perPack,
    });
  } catch (error: any) {
    console.error('[api/assets/install-pack] Error installing pack:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to install asset pack.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assets/install-pack — List available asset packs
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    packs: AVAILABLE_ASSET_PACKS,
  });
}
