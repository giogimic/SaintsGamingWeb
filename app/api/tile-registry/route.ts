import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tiles = await prisma.tileRegistry.findMany({
      orderBy: { tileId: 'asc' },
    });
    
    return NextResponse.json(tiles);
  } catch (error) {
    console.error('Failed to fetch tile registry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tile registry' },
      { status: 500 }
    );
  }
}