import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { wipeNonBundledRealmContent } from '@/server/wipeRealmService';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true, role: { select: { name: true } } },
    });

    const isAdmin = user && (user.permissionLevel >= 80 || user.role?.name === 'ADMIN');
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin privileges required to wipe realm' },
        { status: 403 }
      );
    }

    const result = await wipeNonBundledRealmContent(prisma);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[api/setup/wipe] Failed to wipe realm:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to wipe realm' },
      { status: 500 }
    );
  }
}
