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
    const chars = await prisma.character.findMany();
    for (const c of chars) {
      let meta: any = {};
      try { if (c.metadata) meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata; } catch(e) {}
      meta.lastMapId = 'STARTING_MEADOW';
      await prisma.character.update({
        where: { id: c.id },
        data: { metadata: JSON.stringify(meta) }
      });
    }
    return NextResponse.json({ success: true, message: 'DB fixed' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
