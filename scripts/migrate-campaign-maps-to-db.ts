import { PrismaClient } from '@prisma/client';
import { TUXEMON_CAMPAIGN_MAPS } from '../components/the-lobby/data/campaign-maps';

const prisma = new PrismaClient();

async function migrateCampaignMaps() {
  console.log('Migrating campaign maps into WorldMap table...');

  const entries = Object.entries(TUXEMON_CAMPAIGN_MAPS);
  console.log(`Found ${entries.length} maps to migrate.`);

  let migrated = 0;
  for (const [mapId, mapData] of entries) {
    const grid = (mapData as any).grid || [];
    const height = grid.length || 20;
    const width = grid[0]?.length || 20;

    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        gameId: 'tuxemon',
        name: (mapData as any).name || mapId,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify((mapData as any).gates || {}),
        npcsData: JSON.stringify((mapData as any).npcs || []),
        encountersData: JSON.stringify((mapData as any).encounterPool || []),
        tileLayersData: JSON.stringify((mapData as any).tileLayers || []),
        tilesetsData: JSON.stringify((mapData as any).tilesets || []),
      },
      update: {
        gameId: 'tuxemon',
        name: (mapData as any).name || mapId,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify((mapData as any).gates || {}),
        npcsData: JSON.stringify((mapData as any).npcs || []),
        encountersData: JSON.stringify((mapData as any).encounterPool || []),
        tileLayersData: JSON.stringify((mapData as any).tileLayers || []),
        tilesetsData: JSON.stringify((mapData as any).tilesets || []),
      },
    });

    migrated++;
    if (migrated % 10 === 0) {
      console.log(`Migrated ${migrated}/${entries.length} maps...`);
    }
  }

  console.log(`Successfully migrated ${migrated} maps to database!`);
}

migrateCampaignMaps()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
