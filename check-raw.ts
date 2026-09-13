import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mapId = 'STARTING_MEADOW';
  
  // Try raw query equivalent to Go's LoadMapDefFromDB
  const results = await prisma.$queryRaw`
    SELECT v.name, w.publishedVersion, v.data 
    FROM WorldMap w 
    JOIN WorldMapVersion v ON w.id = v.mapId AND w.publishedVersion = v.version 
    WHERE w.id = ${mapId}
  `;
  
  console.log('Query results for STARTING_MEADOW:', results);
}

main().finally(() => prisma.$disconnect());
