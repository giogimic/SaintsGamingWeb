/**
 * Selective Asset Pack Installer (Phase 3B)
 * CLI usage:
 *   npx tsx scripts/install-asset-pack.ts --pack=tilesets
 *   npx tsx scripts/install-asset-pack.ts --pack=all
 *   npx tsx scripts/install-asset-pack.ts tilesets
 */

import { PrismaClient } from '@prisma/client';
import { AVAILABLE_ASSET_PACKS, installAssetPacks } from '../src/server/assetPackInstaller';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  let targetPack = 'all';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--pack=')) {
      targetPack = arg.split('=')[1];
    } else if (arg === '--pack' && args[i + 1]) {
      targetPack = args[i + 1];
      i++;
    } else if (!arg.startsWith('-')) {
      targetPack = arg;
    }
  }

  console.log(`[AssetPackInstaller] Installing asset pack(s): ${targetPack}`);
  const packIds = targetPack === 'all' ? ['all'] : targetPack.split(',').map((p) => p.trim());

  const validPackIds = ['all', ...AVAILABLE_ASSET_PACKS.map((p) => p.id)];
  const unknownPacks = packIds.filter((p) => !validPackIds.includes(p));

  if (unknownPacks.length > 0) {
    console.error(`[AssetPackInstaller] Unknown pack(s): ${unknownPacks.join(', ')}`);
    console.log(`Available packs: ${AVAILABLE_ASSET_PACKS.map((p) => p.id).join(', ')}, all`);
    process.exit(1);
  }

  const result = await installAssetPacks(prisma, packIds);

  console.log('----------------------------------------------------');
  console.log(`✅ Asset Pack Installation Complete!`);
  console.log(`   Total Installed: ${result.installedCount}`);
  console.log(`   Total Skipped (already in DB): ${result.skippedCount}`);
  console.log('----------------------------------------------------');
  for (const [pack, count] of Object.entries(result.perPack)) {
    console.log(`   • ${pack}: ${count} new assets`);
  }
}

main()
  .catch((e) => {
    console.error('[AssetPackInstaller] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
