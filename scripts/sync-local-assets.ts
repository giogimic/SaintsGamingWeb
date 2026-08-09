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
    
    const type = isTileset ? 'tileset' : 'sprite';
    const category = isTileset ? 'environment' : (isNpc ? 'character' : 'monster');
    const name = path.basename(file, '.png');
    
    const existing = await prisma.gameAsset.findFirst({
      where: { source: relativePath }
    });
    
    if (!existing) {
      await prisma.gameAsset.create({
        data: {
          type,
          source: relativePath,
          tags: JSON.stringify([type, category]),
          categories: JSON.stringify([category]),
          metadata: JSON.stringify({ name }),
          isActive: true,
          fileSize: fs.statSync(file).size,
        }
      });
      created++;
      console.log(`+ Added ${relativePath}`);
    }
  }
  
  console.log(`Finished! Synced ${created} new assets.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
