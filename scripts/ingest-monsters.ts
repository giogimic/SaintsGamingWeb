import { prisma } from '../src/web/lib/prisma';
import fs from 'fs';
import path from 'path';

const MONSTERS_DIR = path.join(__dirname, '..', 'public', 'models', 'monsters');

async function main() {
  const models = fs.readdirSync(MONSTERS_DIR).filter(f => f.endsWith('.glb'));

  console.log(`Found ${models.length} monster models.`);

  for (const model of models) {
    const assetId = `model-monster-${model.replace('.glb', '').toLowerCase()}`;
    const name = model.replace('.glb', '').replace(/_/g, ' ');
    await prisma.gameAsset.upsert({
      where: { id: assetId },
      update: {},
      create: {
        id: assetId,
        type: 'MODEL',
        source: `/models/monsters/${model}`,
        tags: JSON.stringify(['monster', 'creature', 'npc']),
        categories: JSON.stringify(['monster']),
        metadata: JSON.stringify({ name, pack: 'bestiary', isPlayable: false }),
        isActive: true,
      }
    });
  }

  console.log('Done ingesting monsters!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
