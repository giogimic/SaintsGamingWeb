import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { SpriteSheetSlicer } from '../lib/game/assets/SpriteSheetSlicer';
import { AssetPathResolver } from '../lib/game/assets/AssetPathResolver';

const prisma = new PrismaClient();

async function importTuxemonAssets() {
  console.log('Starting Tuxemon asset import...');

  const baseDir = path.join(process.cwd(), 'public', 'tuxemon-assets');
  if (!fs.existsSync(baseDir)) {
    console.log('No tuxemon-assets folder found at public/tuxemon-assets');
    return;
  }

  // 1. Import NPC Sprites (208 sheets)
  const npcDir = path.join(baseDir, 'npc');
  if (fs.existsSync(npcDir)) {
    const npcFiles = fs.readdirSync(npcDir).filter((f) => f.endsWith('.png'));
    console.log(`Importing ${npcFiles.length} NPC sprites...`);

    for (const file of npcFiles) {
      const filePath = `/tuxemon-assets/npc/${file}`;
      const canonicalPath = AssetPathResolver.resolve('sprites', file);
      const frames = SpriteSheetSlicer.sliceNpcSheet(canonicalPath);
      const tags = SpriteSheetSlicer.deriveTagsFromFilename(file, 'sprites/npc');

      await prisma.gameAsset.upsert({
        where: { id: `sprite_${file}` },
        create: {
          id: `sprite_${file}`,
          gameId: 'tuxemon',
          type: 'SPRITE',
          source: canonicalPath,
          tags: JSON.stringify(tags),
          categories: JSON.stringify(['npcs', 'overworld']),
          metadata: JSON.stringify({
            frames,
            directions: 4,
            frameCount: 12,
            width: 48,
            height: 128,
            frameWidth: 16,
            frameHeight: 32,
          }),
        },
        update: {
          source: canonicalPath,
          tags: JSON.stringify(tags),
          metadata: JSON.stringify({
            frames,
            directions: 4,
            frameCount: 12,
            width: 48,
            height: 128,
            frameWidth: 16,
            frameHeight: 32,
          }),
        },
      });
    }
  }

  // 2. Import Item Icons
  const itemDir = path.join(baseDir, 'items');
  if (fs.existsSync(itemDir)) {
    const itemFiles = fs.readdirSync(itemDir).filter((f) => f.endsWith('.png'));
    console.log(`Importing ${itemFiles.length} item icons...`);

    for (const file of itemFiles) {
      const canonicalPath = AssetPathResolver.resolve('items', file);
      const tags = SpriteSheetSlicer.deriveTagsFromFilename(file, 'items');

      await prisma.gameAsset.upsert({
        where: { id: `item_${file}` },
        create: {
          id: `item_${file}`,
          gameId: 'tuxemon',
          type: 'ITEM_ICON',
          source: canonicalPath,
          tags: JSON.stringify(tags),
          categories: JSON.stringify(['items']),
          metadata: JSON.stringify({ width: 16, height: 16 }),
        },
        update: {
          source: canonicalPath,
          tags: JSON.stringify(tags),
        },
      });
    }
  }

  // 3. Import Tilesets
  const tilesetDir = path.join(baseDir, 'tilesets');
  if (fs.existsSync(tilesetDir)) {
    const tilesetFiles = fs.readdirSync(tilesetDir).filter((f) => f.endsWith('.png'));
    console.log(`Importing ${tilesetFiles.length} tilesets...`);

    for (const file of tilesetFiles) {
      const canonicalPath = AssetPathResolver.resolve('tilesets', file);
      const tags = SpriteSheetSlicer.deriveTagsFromFilename(file, 'tilesets');

      await prisma.gameAsset.upsert({
        where: { id: `tileset_${file}` },
        create: {
          id: `tileset_${file}`,
          gameId: 'tuxemon',
          type: 'TILESET',
          source: canonicalPath,
          tags: JSON.stringify(tags),
          categories: JSON.stringify(['tilesets']),
          metadata: JSON.stringify({ tileWidth: 16, tileHeight: 16 }),
        },
        update: {
          source: canonicalPath,
          tags: JSON.stringify(tags),
        },
      });
    }
  }

  console.log('Tuxemon asset import completed!');
}

importTuxemonAssets()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
