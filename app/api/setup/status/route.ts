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

    const user = session?.user as any;

    // Auto-heal: If there is only 1 user in the DB, ensure that user has permissionLevel 1000
    if (user?.id && status.userCount === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { permissionLevel: 1000, isFounder: true },
      }).catch(() => {});
    }

    const isAdmin = user && (user.permissionLevel >= 200 || user.role === 'ADMIN' || status.userCount <= 1);
    const canSetup = status.userCount === 0 || isAdmin || status.userCount <= 1;

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
