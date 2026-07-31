import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId') || 'creature';

    const maps = await prisma.worldMap.findMany({
      where: { gameId },
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ maps });
  } catch (error) {
    console.error('Failed to fetch maps index:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}