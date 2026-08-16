import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const status = await getSystemSetupStatus(prisma);

    const user = session?.user as any;
    const isAdmin = user && (user.permissionLevel >= 80 || user.role === 'ADMIN');
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);
    
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to complete setup' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const realmName = typeof body?.realmName === 'string' ? body.realmName.trim() : 'Saints Realm';
    const defaultMapId = typeof body?.defaultMapId === 'string' ? body.defaultMapId.trim() : undefined;

    // Save Realm Name
    if (realmName) {
      await prisma.siteSetting.upsert({
        where: { key: SETUP_SETTING_KEYS.REALM_NAME },
        create: { key: SETUP_SETTING_KEYS.REALM_NAME, value: realmName },
        update: { value: realmName },
      });
    }

    // Save Default Map ID if supplied or find first map in DB
    if (defaultMapId) {
      await prisma.siteSetting.upsert({
        where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID },
        create: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: defaultMapId },
        update: { value: defaultMapId },
      });
    } else {
      const firstMap = await prisma.worldMap.findFirst({ select: { id: true } });
      if (firstMap) {
        await prisma.siteSetting.upsert({
          where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID },
          create: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: firstMap.id },
          update: { value: firstMap.id },
        });
      }
    }

    // Mark Setup Completed
    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED },
      create: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED, value: 'true' },
      update: { value: 'true' },
    });

    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED_AT },
      create: { key: SETUP_SETTING_KEYS.SETUP_COMPLETED_AT, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      realmName,
      message: 'Setup marked complete. Realm is ready for play and creation!',
    });
  } catch (error: any) {
    console.error('[api/setup/complete] Failed to complete setup:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete setup' }, { status: 500 });
  }
}
