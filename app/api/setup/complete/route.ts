import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';
import { getSystemSetupStatus, SETUP_SETTING_KEYS } from '@/shared/game/setup/setupDetection';

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
    const allowed = status.userCount === 0 || isAdmin || (status.isFreshInstall && status.userCount <= 1);
    
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required to complete setup' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const realmName = typeof body?.realmName === 'string' ? body.realmName.trim() : 'The Lobby';
    const realmDescription = typeof body?.realmDescription === 'string' ? body.realmDescription.trim() : 'The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~';
    const requestedDefaultMapId = typeof body?.defaultMapId === 'string' ? body.defaultMapId.trim() : undefined;

    // Save Realm Name
    if (realmName) {
      await prisma.siteSetting.upsert({
        where: { key: SETUP_SETTING_KEYS.REALM_NAME },
        create: { key: SETUP_SETTING_KEYS.REALM_NAME, value: realmName },
        update: { value: realmName },
      });
    }

    // Save Realm Description
    if (realmDescription) {
      await prisma.siteSetting.upsert({
        where: { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION },
        create: { key: SETUP_SETTING_KEYS.REALM_DESCRIPTION, value: realmDescription },
        update: { value: realmDescription },
      });
    }

    // Save Default Map ID deterministically.
    // If caller provided a map, require it to exist (except STARTING_MAP placeholder for blank-canvas flow).
    let persistedDefaultMapId = 'STARTING_MAP';
    if (requestedDefaultMapId && requestedDefaultMapId !== 'STARTING_MAP') {
      const mapExists = await prisma.worldMap.findUnique({
        where: { id: requestedDefaultMapId },
        select: { id: true },
      });
      if (!mapExists) {
        return NextResponse.json(
          { error: `Requested default map does not exist: ${requestedDefaultMapId}` },
          { status: 400 }
        );
      }
      persistedDefaultMapId = requestedDefaultMapId;
    } else if (requestedDefaultMapId === 'STARTING_MAP') {
      // Blank-canvas setup can intentionally complete before any authored map exists.
      persistedDefaultMapId = 'STARTING_MAP';
    } else {
      // Backward-compatible fallback for callers not passing defaultMapId.
      const preferred = await prisma.worldMap.findUnique({ where: { id: 'SAINTS_HAVEN' }, select: { id: true } });
      if (preferred) {
        persistedDefaultMapId = preferred.id;
      } else {
        const firstMap = await prisma.worldMap.findFirst({ select: { id: true } });
        persistedDefaultMapId = firstMap?.id || 'STARTING_MAP';
      }
    }

    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID },
      create: { key: SETUP_SETTING_KEYS.DEFAULT_MAP_ID, value: persistedDefaultMapId },
      update: { value: persistedDefaultMapId },
    });

    // Mark Setup & Game Completed
    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.GAME_INITIALIZED },
      create: { key: SETUP_SETTING_KEYS.GAME_INITIALIZED, value: 'true' },
      update: { value: 'true' },
    });

    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.GAME_INITIALIZED_AT },
      create: { key: SETUP_SETTING_KEYS.GAME_INITIALIZED_AT, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.GAME_NAME },
      create: { key: SETUP_SETTING_KEYS.GAME_NAME, value: realmName },
      update: { value: realmName },
    });

    await prisma.siteSetting.upsert({
      where: { key: SETUP_SETTING_KEYS.GAME_DESCRIPTION },
      create: { key: SETUP_SETTING_KEYS.GAME_DESCRIPTION, value: realmDescription },
      update: { value: realmDescription },
    });

    // Mark Setup Completed (legacy)
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
      defaultMapId: persistedDefaultMapId,
      message: 'Setup marked complete. Realm is ready for play and creation!',
    });
  } catch (error: any) {
    console.error('[api/setup/complete] Failed to complete setup:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete setup' }, { status: 500 });
  }
}
