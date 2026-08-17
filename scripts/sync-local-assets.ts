import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function main() {
  const assetsDir = path.join(process.cwd(), 'public', 'game-assets');
  console.log(`Scanning assets in ${assetsDir}...`);
  
  const files = getFiles(assetsDir);
  let created = 0;
  
  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    
    // Normalize path to posix style relative to public/
    let relativePath = path.relative(path.join(process.cwd(), 'public'), file);
    relativePath = '/' + relativePath.split(path.sep).join('/');
    
    const isTileset = relativePath.includes('/tilesets/');
    const isNpc = relativePath.includes('/npc/');
    const isHero = relativePath.includes('/monster/player/') || relativePath.includes('/player/');
    const isItem = relativePath.includes('/items/');
    const isObject = relativePath.includes('/objects/');
    const isUi = relativePath.includes('/ui/');

    const type = isTileset ? 'tileset' : (isItem ? 'item' : (isUi ? 'ui' : 'sprite'));
    let category = isTileset ? 'environment' : (isNpc || isHero ? 'character' : (isItem ? 'item' : (isObject ? 'object' : (isUi ? 'ui' : 'monster'))));
    
    // Creature subcategories
    let subcategory: string | null = null;
    if (category === 'monster') {
      if (relativePath.includes('-front') || relativePath.includes('_front') || /front\d*\.png$/i.test(relativePath)) {
        subcategory = 'front_sprite';
      } else if (relativePath.includes('-back') || relativePath.includes('_back') || /back\d*\.png$/i.test(relativePath)) {
        subcategory = 'back_sprite';
      } else if (relativePath.includes('-face') || relativePath.includes('_face') || /face\d*\.png$/i.test(relativePath)) {
        subcategory = 'face_portrait';
      } else if (relativePath.includes('-sheet') || relativePath.includes('/battle/')) {
        subcategory = 'battle_sheet';
      } else if (relativePath.includes('-ow') || relativePath.includes('_ow') || relativePath.includes('/creatures/') || relativePath.includes('/world-monsters/')) {
        subcategory = 'overworld';
      }
    } else if (isNpc) {
      subcategory = 'npc_walk';
    } else if (isHero) {
      subcategory = 'hero_walk';
    }

    const name = path.basename(file, '.png');
    
    const existing = await prisma.gameAsset.findFirst({
      where: { source: relativePath }
    });
    
    const tags = [type, category];
    if (subcategory) {
      tags.push(subcategory);
      if (category === 'monster') tags.push(`creature:${subcategory}`);
    }
    if (
      subcategory === 'battle_sheet' ||
      subcategory === 'npc_walk' ||
      subcategory === 'hero_walk' ||
      relativePath.includes('-sheet') ||
      isTileset
    ) {
      tags.push('sheet', 'spritesheet');
    }

    if (!existing) {
      await prisma.gameAsset.create({
        data: {
          type,
          source: relativePath,
          tags: JSON.stringify(tags),
          categories: JSON.stringify([category, ...(subcategory ? [subcategory] : [])]),
          metadata: JSON.stringify({ name, subcategory }),
          isActive: true,
          fileSize: fs.statSync(file).size,
        }
      });
      created++;
      console.log(`+ Added ${relativePath} [${category}${subcategory ? `:${subcategory}` : ''}]`);
    }
  }
  
  console.log(`Finished! Synced ${created} new assets.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
