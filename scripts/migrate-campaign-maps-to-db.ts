/**
 * Upsert Tuxemon campaign maps from the generated dump into WorldMap.
 *
 * Usage:
 *   npx tsx scripts/migrate-campaign-maps-to-db.ts
 *
 * Source: scripts/data/campaign-maps.generated.ts
 * Target: Prisma WorldMap (gameId = "tuxemon")
 */

import { PrismaClient } from "@prisma/client";
import { TUXEMON_CAMPAIGN_MAPS } from "./data/campaign-maps.generated";

const prisma = new PrismaClient();

async function migrateCampaignMaps() {
  console.log("Migrating campaign maps into WorldMap table...");

  const entries = Object.entries(TUXEMON_CAMPAIGN_MAPS);
  console.log(`Found ${entries.length} maps to migrate.`);

  let migrated = 0;
  for (const [mapId, mapData] of entries) {
    const data = mapData as Record<string, any>;
    const grid = data.grid || [];
    const height = grid.length || data.height || 20;
    const width = (grid[0]?.length as number | undefined) || data.width || 20;

    await prisma.worldMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        gameId: "tuxemon",
        name: data.name || mapId,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify(data.gates || {}),
        npcsData: JSON.stringify(data.npcs || []),
        encountersData: JSON.stringify(data.encounterPool || []),
        tileLayersData: JSON.stringify(data.tileLayers || []),
        tilesetsData: JSON.stringify(data.tilesets || []),
      },
      update: {
        gameId: "tuxemon",
        name: data.name || mapId,
        gridData: JSON.stringify(grid),
        gatesData: JSON.stringify(data.gates || {}),
        npcsData: JSON.stringify(data.npcs || []),
        encountersData: JSON.stringify(data.encounterPool || []),
        tileLayersData: JSON.stringify(data.tileLayers || []),
        tilesetsData: JSON.stringify(data.tilesets || []),
        version: { increment: 1 },
      },
    });

    // Keep GameMap collision mirror for server map-loader consumers that still read GameMap
    await prisma.gameMap.upsert({
      where: { id: mapId },
      create: {
        id: mapId,
        name: data.name || mapId,
        width,
        height,
        tilesetData: JSON.stringify(grid),
        gates: JSON.stringify(data.gates || {}),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encounterPool || []),
      },
      update: {
        name: data.name || mapId,
        width,
        height,
        tilesetData: JSON.stringify(grid),
        gates: JSON.stringify(data.gates || {}),
        npcs: JSON.stringify(data.npcs || []),
        encounters: JSON.stringify(data.encounterPool || []),
      },
    });

    migrated++;
    if (migrated % 25 === 0 || migrated === entries.length) {
      console.log(`Migrated ${migrated}/${entries.length} maps...`);
    }
  }

  const worldCount = await prisma.worldMap.count({ where: { gameId: "tuxemon" } });
  console.log(`Done. WorldMap(tuxemon)=${worldCount}, processed=${migrated}`);
}

migrateCampaignMaps()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
