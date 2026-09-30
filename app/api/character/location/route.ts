import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/web/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const characterId = typeof body?.characterId === 'string' ? body.characterId.trim() : '';
    const mapId = typeof body?.mapId === 'string' ? body.mapId.trim().slice(0, 255) : '';
    const position = body?.position;
    const x = Number(position?.x);
    const y = Number(position?.y);
    const z = position?.z === undefined ? undefined : Number(position.z);
    const requestedAt = Number(body?.timestamp);

    if (!characterId || !mapId || !Number.isFinite(x) || !Number.isFinite(y) || (z !== undefined && !Number.isFinite(z))) {
      return NextResponse.json({ error: 'Invalid character location' }, { status: 400 });
    }
    if ([x, y, ...(z === undefined ? [] : [z])].some((coordinate) => Math.abs(coordinate) > 1_000_000)) {
      return NextResponse.json({ error: 'Location is outside supported bounds' }, { status: 400 });
    }

    const character = await prisma.gameCharacter.findFirst({
      where: { id: characterId, userId },
      select: { stateData: true },
    });
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    let state: Record<string, any> = {};
    try {
      const parsed = JSON.parse(character.stateData || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state = parsed;
    } catch {
      state = {};
    }

    const now = Date.now();
    const timestamp = Number.isFinite(requestedAt)
      ? Math.max(0, Math.min(Math.floor(requestedAt), now))
      : now;
    if (timestamp <= Number(state.lastLocationSyncAt || 0)) {
      return NextResponse.json({ success: true, ignored: true });
    }

    state.currentMapId = mapId;
    state.position = { x, y, ...(z === undefined ? {} : { z }) };
    state.lastLocationSyncAt = timestamp;

    await prisma.gameCharacter.updateMany({
      where: { id: characterId, userId },
      data: {
        stateData: JSON.stringify(state),
        lastMapId: mapId,
        lastX: x,
        lastY: y,
        lastZ: z ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CharacterLocation] Failed to save player location:', error);
    return NextResponse.json({ error: 'Failed to save player location' }, { status: 500 });
  }
}
