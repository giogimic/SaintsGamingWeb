import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.siteSetting.upsert({
      where: { key: 'SPAWN_MAP_ID' },
      update: { value: 'STARTING_MEADOW' },
      create: { key: 'SPAWN_MAP_ID', value: 'STARTING_MEADOW' }
    });
    await prisma.siteSetting.upsert({
      where: { key: 'DEFAULT_MAP_ID' },
      update: { value: 'STARTING_MEADOW' },
      create: { key: 'DEFAULT_MAP_ID', value: 'STARTING_MEADOW' }
    });
    const testMap = await prisma.worldMap.findUnique({ where: { id: 'TEST_MAP' } });
    if (testMap) {
      await prisma.worldMap.delete({ where: { id: 'TEST_MAP' } });
    }
    const chars = await prisma.gameCharacter.findMany();
    for (const c of chars) {
      let meta: any = {};
      try { if (c.stateData) meta = typeof c.stateData === 'string' ? JSON.parse(c.stateData) : c.stateData; } catch(e) {}
      meta.lastMapId = 'STARTING_MEADOW';
      await prisma.gameCharacter.update({
        where: { id: c.id },
        data: { stateData: JSON.stringify(meta) }
      });
    }
    return NextResponse.json({ success: true, message: 'DB fixed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
