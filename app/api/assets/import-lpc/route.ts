import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  DEFAULT_LPC_APPROVED_DIR,
  getApprovedLpcPackStatus,
  importApprovedLpcPacks,
} from '@/server/lpcPackImporter';

export const dynamic = 'force-dynamic';

function canRunLpcImport(user: any): boolean {
  return (
    !user ||
    user.permissionLevel >= 40 ||
    user.role === 'ADMIN' ||
    user.role === 'DEVELOPER'
  );
}

export async function GET() {
  try {
    const status = await getApprovedLpcPackStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to inspect LPC approved packs.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!session?.user?.id && user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Sign in required.' },
        { status: 401 }
      );
    }

    if (!canRunLpcImport(user)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Developer or Admin permission required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const approvedDir = typeof body.approvedDir === 'string' && body.approvedDir.trim()
      ? body.approvedDir.trim()
      : DEFAULT_LPC_APPROVED_DIR;
    const gameId = typeof body.gameId === 'string' && body.gameId.trim()
      ? body.gameId.trim()
      : 'tuxemon';
    const visibility = body.visibility === 'PERSONAL' || body.visibility === 'PROJECT' || body.visibility === 'COMMUNITY' || body.visibility === 'PUBLIC'
      ? body.visibility
      : 'COMMUNITY';

    const actingUserId = session?.user?.id || body.userId;
    if (!actingUserId || typeof actingUserId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No user id available for LPC import attribution.' },
        { status: 400 }
      );
    }

    const status = await getApprovedLpcPackStatus(approvedDir);
    if (!status.exists) {
      return NextResponse.json(
        {
          success: false,
          error: `Approved LPC pack directory not found: ${approvedDir}`,
          approvedDir,
        },
        { status: 404 }
      );
    }

    const result = await importApprovedLpcPacks({
      approvedDir,
      userId: actingUserId,
      gameId,
      visibility,
    });

    return NextResponse.json({
      success: true,
      approvedDir,
      importedCount: result.imported.length,
      skippedCount: result.skipped.length,
      imported: result.imported,
      skipped: result.skipped,
    });
  } catch (error: any) {
    console.error('[api/assets/import-lpc] Error importing approved LPC packs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import approved LPC packs.' },
      { status: 500 }
    );
  }
}