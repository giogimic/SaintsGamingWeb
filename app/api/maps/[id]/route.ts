import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const map = await prisma.worldMap.findUnique({
      where: { id },
    });

    if (!map) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    const formattedMap = {
      id: map.id,
      gameId: map.gameId,
      name: map.name,
      grid: JSON.parse(map.gridData || '[]'),
      gates: JSON.parse(map.gatesData || '{}'),
      npcs: JSON.parse(map.npcsData || '[]'),
      encounterPool: JSON.parse(map.encountersData || '[]'),
      tileLayers: JSON.parse(map.tileLayersData || '[]'),
      tilesets: JSON.parse(map.tilesetsData || '[]'),
      version: map.version,
    };

    return NextResponse.json(formattedMap);
  } catch (error) {
    console.error('Failed to load map:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
