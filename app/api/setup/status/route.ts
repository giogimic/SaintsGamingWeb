import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus } from '@/shared/game/setup/setupDetection';
import { AVAILABLE_STARTER_PACKS } from '@/shared/game/setup/prepackagedPacks';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    const status = await getSystemSetupStatus(prisma);

    // Setup permission check: can configure if:
    // 1. No users exist yet in DB (pristine fresh install)
    // 2. Or current session user is an Admin (permissionLevel >= 80 or role === 'ADMIN')
    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    const canSetup = status.userCount === 0 || isAdmin;

    return NextResponse.json({
      status,
      availablePacks: AVAILABLE_STARTER_PACKS,
      canSetup,
      authenticatedUser: user ? { id: user.id, username: user.name || user.username, isAdmin } : null,
    });
  } catch (error) {
    console.error('[api/setup/status] Failed to fetch setup status:', error);
    return NextResponse.json({ error: 'Failed to retrieve setup status' }, { status: 500 });
  }
}
