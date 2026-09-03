/**
 * Saints Gaming — Database Migration Script: 32³ Isotropic Volumetric Chunks
 *
 * Scans all WorldMap records in the database, detects legacy 16×16×32 chunk formats,
 * converts them into 32³ isotropic chunks, and updates the database records.
 *
 * Usage: npx tsx scripts/migrate-to-32-cubic.ts
 */

import { PrismaClient } from '@prisma/client';
import { isLegacy16CubicDoc, migrateLegacyDocTo32Cubic } from '../src/shared/game/voxel/chunkMigration';
import { convertLegacy2DToVoxelWorld } from '../src/shared/game/voxel/Voxel2DConverter';
import type { VoxelWorldDocV3 } from '../src/shared/game/voxel/VoxelWorldDoc';

const prisma = new PrismaClient();

async function main() {
  console.log('[Migration] Starting 32³ Isotropic Chunk Migration...');

  const maps = await prisma.worldMap.findMany({
    select: {
      id: true,
      name: true,
      gridData: true,
      voxelData: true,
      freeformLayersData: true,
      regionClass: true,
    },
  });

  console.log(`[Migration] Found ${maps.length} total WorldMap records in database.`);

  let migratedCount = 0;
  let synthesizedCount = 0;
  let alreadyUpToDateCount = 0;
  let emptyCount = 0;

  for (const map of maps) {
    let doc: VoxelWorldDocV3 | null = null;

    if (map.voxelData && map.voxelData !== '{}' && map.voxelData !== '[]') {
      try {
        const parsed = JSON.parse(map.voxelData);
        if (parsed && parsed.formatVersion === 3) {
          doc = parsed;
        }
      } catch (e) {
        console.warn(`[Migration] Failed to parse voxelData for ${map.id}:`, e);
      }
    }

    // Fallback: check freeformLayersData if voxelData was empty
    if (!doc && map.freeformLayersData) {
      try {
        const parsed = JSON.parse(map.freeformLayersData);
        if (parsed && parsed.formatVersion === 3) {
          doc = parsed;
        }
      } catch {}
    }

    if (!doc) {
      // Synthesize 32³ voxel doc from existing 2D gridData if available
      if (map.gridData) {
        try {
          const grid = JSON.parse(map.gridData);
          if (Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0]) && grid[0].length > 0) {
            const world = convertLegacy2DToVoxelWorld({
              id: map.id,
              name: map.name,
              grid,
              width: grid[0].length,
              height: grid.length,
            });
            doc = world.serializeToDoc();
            await prisma.worldMap.update({
              where: { id: map.id },
              data: { voxelData: JSON.stringify(doc) },
            });
            synthesizedCount++;
            continue;
          }
        } catch (e) {
          console.warn(`[Migration] Failed to synthesize voxelData from grid for ${map.id}:`, e);
        }
      }

      emptyCount++;
      continue;
    }

    if (isLegacy16CubicDoc(doc)) {
      console.log(`[Migration] Migrating map '${map.id}' (${map.name}) from 16x16x32 to 32³...`);
      const migratedDoc = migrateLegacyDocTo32Cubic(doc);

      await prisma.worldMap.update({
        where: { id: map.id },
        data: {
          voxelData: JSON.stringify(migratedDoc),
        },
      });

      migratedCount++;
      console.log(`[Migration] Successfully updated map '${map.id}'.`);
    } else {
      alreadyUpToDateCount++;
    }
  }

  console.log('\n[Migration Summary]');
  console.log(`- Total maps: ${maps.length}`);
  console.log(`- Migrated from 16x16x32 to 32³: ${migratedCount}`);
  console.log(`- Synthesized 32³ voxel models from 2D grids: ${synthesizedCount}`);
  console.log(`- Already 32³ or modern: ${alreadyUpToDateCount}`);
  console.log(`- Remaining empty: ${emptyCount}`);
  console.log('[Migration] Finished successfully.');
}

main()
  .catch((err) => {
    console.error('[Migration] Fatal error during migration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
