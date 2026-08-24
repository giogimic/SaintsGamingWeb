import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.DATABASE_URL?.startsWith('mysql')) {
    console.log('MySQL detected. Altering String columns to TEXT to bypass Prisma VARCHAR(191) limits...');
    
    const tables = [
      { table: 'GameAsset', cols: ['tags', 'categories', 'metadata', 'customLabels', 'atlasFrame', 'source', 'atlasSource', 'cdnUrl'] },
      { table: 'SourceAsset', cols: ['metadata', 'filename', 'storagePath', 'mimeType'] },
      { table: 'UsableAsset', cols: ['tags', 'sourceRegion', 'thumbnailPath', 'cdnUrl', 'name', 'license'] }
    ];

    for (const { table, cols } of tables) {
      for (const col of cols) {
        try {
          // Prisma limits strings to VARCHAR(191) in MySQL if @db.Text is omitted (omitted for SQLite compat)
          await prisma.$executeRawUnsafe(`ALTER TABLE ${table} MODIFY ${col} TEXT`);
          console.log(` - Altered ${table}.${col} to TEXT`);
        } catch (e: any) {
          console.error(` - Failed to alter ${table}.${col}:`, e.message);
        }
      }
    }
    console.log('MySQL schema patch complete.');
  } else {
    console.log('Not running MySQL. No schema patch needed.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
