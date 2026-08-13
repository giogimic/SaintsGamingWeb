import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId') || 'tuxemon';

    let atlas = await prisma.worldAtlas.findUnique({
      where: { gameId },
    });

    if (!atlas) {
      atlas = await prisma.worldAtlas.create({
        data: {
          gameId,
          lobbyMapId: 'LOBBY',
          atlasData: JSON.stringify({
            nodes: [],
            edges: [],
            bufferPresets: [],
            options: {
              defaultZoneSize: { w: 64, h: 64 },
              bufferSize: { w: 16, h: 16 },
              softTransition: true,
              zeroFade: true,
              renderNeighborStripTiles: 6,
            }
          }),
        }
      });
    }

    return NextResponse.json({ atlas });
  } catch (error) {
    console.error('[API] WorldAtlas GET failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.permissionLevel < 80) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const gameId = body.gameId || 'tuxemon';

    const atlas = await prisma.worldAtlas.upsert({
      where: { gameId },
      update: {
        lobbyMapId: body.lobbyMapId || 'LOBBY',
        atlasData: typeof body.atlasData === 'string' ? body.atlasData : JSON.stringify(body.atlasData || {}),
      },
      create: {
        gameId,
        lobbyMapId: body.lobbyMapId || 'LOBBY',
        atlasData: typeof body.atlasData === 'string' ? body.atlasData : JSON.stringify(body.atlasData || {}),
      }
    });

    return NextResponse.json({ success: true, atlas });
  } catch (error) {
    console.error('[API] WorldAtlas POST failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
