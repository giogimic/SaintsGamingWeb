import { prisma } from '../src/web/lib/prisma';
import fs from 'fs';
import path from 'path';

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models', 'items');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons', 'items');

async function main() {
  const models = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb'));
  const icons = fs.readdirSync(ICONS_DIR).filter(f => f.endsWith('.png'));

  console.log(`Found ${models.length} models and ${icons.length} icons.`);

  for (const model of models) {
    const assetId = `model-item-${model.replace('.glb', '')}`;
    const name = model.replace('.glb', '').replace(/_/g, ' ');
    await prisma.gameAsset.upsert({
      where: { id: assetId },
      update: {},
      create: {
        id: assetId,
        type: 'MODEL',
        source: `/models/items/${model}`,
        tags: JSON.stringify(['item', 'weapon', 'prop', 'rpg_pack']),
        categories: JSON.stringify(['item']),
        metadata: JSON.stringify({ name, pack: 'rpg_pack', isPlayable: false }),
        isActive: true,
      }
    });
  }

  for (const icon of icons) {
    const assetId = `icon-item-${icon.replace('.png', '')}`;
    const name = icon.replace('.png', '').replace(/_/g, ' ');
    await prisma.gameAsset.upsert({
      where: { id: assetId },
      update: {},
      create: {
        id: assetId,
        type: 'ITEM_ICON',
        source: `/icons/items/${icon}`,
        tags: JSON.stringify(['item', 'icon', 'rpg_pack']),
        categories: JSON.stringify(['icon']),
        metadata: JSON.stringify({ name, pack: 'rpg_pack' }),
        isActive: true,
      }
    });
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
