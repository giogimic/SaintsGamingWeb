import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const ASSETS_DIR = path.join(process.cwd(), 'public', 'tuxemon-assets');

async function main() {
  console.log("Clearing existing game assets...");
  await prisma.gameAsset.deleteMany({});

  console.log("Scanning assets directory...");
  const categories = fs.readdirSync(ASSETS_DIR);
  
  const assetsToCreate: any[] = [];

  for (const category of categories) {
    const catPath = path.join(ASSETS_DIR, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    
    const scanDir = (dir: string, subCat: string = '') => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          scanDir(itemPath, item);
        } else if (item.endsWith('.png')) {
          const relativePath = '/tuxemon-assets/' + path.relative(ASSETS_DIR, itemPath).replace(/\\/g, '/');
          
          const name = item.replace('.png', '').replace(/_/g, ' ').replace(/-/g, ' ');
          
          assetsToCreate.push({
            name: name,
            category: category,
            subCategory: subCat || null,
            filePath: relativePath,
            width: 16,
            height: 16
          });
        }
      }
    };
    
    scanDir(catPath);
  }

  console.log(`Found ${assetsToCreate.length} assets to map.`);
  
  // Chunk insert to avoid SQLite/Prisma limits
  const chunkSize = 500;
  for (let i = 0; i < assetsToCreate.length; i += chunkSize) {
    const chunk = assetsToCreate.slice(i, i + chunkSize);
    await prisma.gameAsset.createMany({
      data: chunk
    });
    console.log(`Inserted ${i + chunk.length} / ${assetsToCreate.length} assets`);
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
