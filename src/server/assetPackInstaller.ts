import fs from 'fs';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { inferAssetPack, packTag } from '../shared/game/assetPacks';
import { classifyCreatureAsset } from '../shared/game/creatureCatalog';
import { buildCanonicalAssetData } from '../shared/game/canonicalAsset';

export interface AssetPackDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  relativeDir: string;
  estimatedCount: number;
  badge?: string;
  recommended?: boolean;
}

export const AVAILABLE_ASSET_PACKS: AssetPackDefinition[] = [
  {
    id: 'tilesets',
    name: 'Core Tilesets',
    description: 'Terrain, buildings, indoor, and outdoor tilemaps for Studio world painting.',
    category: 'environment',
    relativeDir: 'tilesets',
    estimatedCount: 79,
    badge: 'Core',
    recommended: true,
  },
  {
    id: 'creatures',
    name: 'Creature Battle Sheets',
    description: 'Tuxemon companion & monster battle spritesheets.',
    category: 'monster',
    relativeDir: 'monster/battle',
    estimatedCount: 413,
    badge: 'Creatures',
    recommended: true,
  },
  {
    id: 'portraits',
    name: 'Creature Portraits & Faces',
    description: 'Face icons, front/back battle poses for creatures.',
    category: 'monster',
    relativeDir: 'monster/face',
    estimatedCount: 600,
  },
  {
    id: 'npc',
    name: 'NPC Walk Cycles (LPC)',
    description: 'Liberated Pixel Cup citizen, guard, and vendor walk animations.',
    category: 'character',
    relativeDir: 'npc',
    estimatedCount: 221,
    badge: 'Characters',
    recommended: true,
  },
  {
    id: 'heroes',
    name: 'Hero / Operative Walk Cycles',
    description: 'Player class character sprites and walk animations.',
    category: 'character',
    relativeDir: 'monster/player',
    estimatedCount: 357,
  },
  {
    id: 'items',
    name: 'Item & Inventory Icons',
    description: 'Potions, food, equipment, badges, and resource inventory icons.',
    category: 'item',
    relativeDir: 'items',
    estimatedCount: 177,
  },
  {
    id: 'objects',
    name: 'Props & World Objects',
    description: 'Chests, signs, interactive boulders, and environmental props.',
    category: 'object',
    relativeDir: 'objects',
    estimatedCount: 24,
  },
  {
    id: 'ui',
    name: 'Interface & Combat UI',
    description: 'HUD icons, health bars, and dialogue frames.',
    category: 'ui',
    relativeDir: 'ui',
    estimatedCount: 50,
  },
];

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      getFilesRecursively(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

export async function installAssetPacks(
  prisma: PrismaClient,
  packIds: string[]
): Promise<{
  installedCount: number;
  skippedCount: number;
  perPack: Record<string, number>;
}> {
  const baseAssetsDir = path.join(process.cwd(), 'public', 'game-assets');
  let totalInstalled = 0;
  let totalSkipped = 0;
  const perPack: Record<string, number> = {};

  const packsToInstall =
    packIds.includes('all')
      ? AVAILABLE_ASSET_PACKS
      : AVAILABLE_ASSET_PACKS.filter((p) => packIds.includes(p.id));

  for (const pack of packsToInstall) {
    const packDir = path.join(baseAssetsDir, pack.relativeDir);
    if (!fs.existsSync(packDir)) {
      perPack[pack.id] = 0;
      continue;
    }

    const files = getFilesRecursively(packDir).filter((f) => f.toLowerCase().endsWith('.png'));
    let packInstalled = 0;

    for (const file of files) {
      let relativePath = path.relative(path.join(process.cwd(), 'public'), file);
      relativePath = '/' + relativePath.split(path.sep).join('/');

      const isTileset = pack.id === 'tilesets' || relativePath.includes('/tilesets/');
      const type = isTileset ? 'tileset' : 'sprite';
      const category = pack.category;
      const name = path.basename(file, '.png');
      const packId = inferAssetPack(relativePath);
      const creatureSubcategory = category === 'monster' ? classifyCreatureAsset(relativePath) : null;
      const subcategory =
        creatureSubcategory ||
        (pack.id === 'npc' ? 'npc_walk' : pack.id === 'heroes' ? 'hero_walk' : pack.id);

      const existing = await prisma.gameAsset.findFirst({
        where: { source: relativePath },
      });

      if (!existing) {
        let size = 0;
        try {
          size = fs.statSync(file).size;
        } catch {}

        const isPlayable = pack.id === 'heroes';
        const rawTags = [type, category, packTag(packId)];
        if (subcategory) rawTags.push(subcategory);
        if (creatureSubcategory) rawTags.push(`creature:${creatureSubcategory}`);
        if (
          subcategory === 'battle_sheet' ||
          subcategory === 'npc_walk' ||
          subcategory === 'hero_walk' ||
          relativePath.includes('-sheet') ||
          isTileset
        ) {
          rawTags.push('sheet', 'spritesheet');
        }
        if (isPlayable) {
          rawTags.push('playable', 'character_creator', 'player');
        }

        const canonical = buildCanonicalAssetData({
          gameId: 'tuxemon',
          name,
          type,
          category,
          tags: rawTags,
          sourceUrl: relativePath,
          pack: pack.id,
          importProfile: pack.id === 'heroes' || pack.id === 'npc' ? 'character' : pack.id === 'tilesets' ? 'tileset' : undefined,
          showInCharacterCreation: isPlayable,
          isPlayable,
          fileSize: size,
        });

        await prisma.gameAsset.create({
          data: {
            ...canonical.gameAssetData,
            metadata: JSON.stringify({
              ...canonical.metadata,
              subcategory,
            }),
          },
        });
        packInstalled++;
        totalInstalled++;
      } else {
        totalSkipped++;
      }
    }

    perPack[pack.id] = packInstalled;
  }

  return {
    installedCount: totalInstalled,
    skippedCount: totalSkipped,
    perPack,
  };
}
