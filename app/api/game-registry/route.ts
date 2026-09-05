import { NextResponse } from 'next/server';
import { prisma } from '@/web/lib/prisma';
import crypto from 'crypto';
import { creatureRowToData } from '@/shared/game/creatureDefMap';

export async function GET() {
  try {
    const [creaturesRows, items, classes, defaultHud, abilities] = await Promise.all([
      prisma.creatureDef.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.itemTemplate.findMany(),
      prisma.characterClass.findMany(),
      prisma.uiPreset.findFirst({ where: { isServerDefault: true } }),
      prisma.abilityDictionary.findMany()
    ]);

    const creatures = creaturesRows.map(creatureRowToData);

    const payload = {
      creatures,
      items,
      classes,
      abilities,
      defaultHudPreset: defaultHud ? JSON.parse(defaultHud.data) : null,
    };

    // Calculate a naive content hash to allow aggressive client caching
    const contentString = JSON.stringify(payload);
    const contentHash = crypto.createHash('sha256').update(contentString).digest('hex');

    return NextResponse.json({
      registryVersion: '1.0',
      schemaVersion: '1.0',
      contentHash,
      lastUpdated: new Date().toISOString(),
      ...payload,
    });
  } catch (error) {
    console.error('[API/game-registry] Error fetching registry:', error);
    return NextResponse.json({ error: 'Failed to fetch game registry' }, { status: 500 });
  }
}
