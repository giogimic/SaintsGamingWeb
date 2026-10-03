/**
 * Saints Gaming — Canonical Builtin 3D Assets Sync
 *
 * Ensures all bundled canonical 3D models (Citizen, Brute, Adventurer, Golem)
 * and modular wardrobe pieces are registered into the GameAsset database table,
 * making them immediately discoverable in Asset Library, Archetype Studio,
 * Model Wardrobe Editor, and Entity Studio.
 */

import fs from 'fs';
import path from 'path';
import { CANONICAL_BUILTIN_MODELS } from "@/shared/game/worldModelPresentation";

export interface CanonicalAssetSeedRecord {
  id: string;
  gameId: string | null;
  type: string;
  source: string;
  atlasSource: string | null;
  atlasFrame: string | null;
  tags: string;
  categories: string;
  metadata: string;
  customLabels: string | null;
  isActive: boolean;
  usageCount: number;
  fileSize: number;
  cdnUrl: string | null;
}

function getBundledFileSize(modelUrl: string, fallback: number): number {
  const filePath = path.join(process.cwd(), 'public', modelUrl.replace(/^\/+/, ''));
  try {
    return fs.statSync(filePath).size;
  } catch {
    return fallback;
  }
}

export function buildCanonicalGameAssetRecords(): CanonicalAssetSeedRecord[] {
  try {
    const manifestPath = path.join(process.cwd(), 'prisma', 'quaternius-manifest.json');
    if (fs.existsSync(manifestPath)) {
      const data = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(data);
      return manifest.map((item: any) => ({
        id: item.id,
        gameId: 'saints',
        type: item.type,
        source: item.source,
        atlasSource: item.atlasSource,
        atlasFrame: item.atlasFrame,
        tags: item.tags,
        categories: item.categories,
        metadata: item.metadata,
        customLabels: item.customLabels,
        isActive: item.isActive,
        usageCount: item.usageCount,
        fileSize: item.fileSize,
        cdnUrl: item.cdnUrl,
      }));
    }
  } catch (err) {
    console.error("[canonicalAssetsSync] Failed to load quaternius manifest:", err);
  }
  return [];
}

export function buildCanonicalCharacterModelProfiles(): any[] {
  return [
    {
      id: 'profile-quat_male',
      slug: 'quat_male',
      name: 'Standard Male',
      description: 'Standard human male character base.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'quat-quaternius_base_male',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'quaternius_universal',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({
        profileId: 'quaternius_native',
        actionSlots: {}
      }),
      socketsData: JSON.stringify([
        { name: 'RightHand', parentBone: 'Hand_R', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { name: 'LeftHand', parentBone: 'Hand_L', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({
        isCustomizable: true,
        components: []
      }),
      tags: JSON.stringify(['canonical', 'bundled', 'quaternius', 'male', 'playable']),
      version: 1,
      isDefault: true,
      isActive: true,
    },
    {
      id: 'profile-quat_female',
      slug: 'quat_female',
      name: 'Standard Female',
      description: 'Standard human female character base.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'quat-quaternius_base_female',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'quaternius_universal',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({
        profileId: 'quaternius_native',
        actionSlots: {}
      }),
      socketsData: JSON.stringify([
        { name: 'RightHand', parentBone: 'Hand_R', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { name: 'LeftHand', parentBone: 'Hand_L', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({
        isCustomizable: true,
        components: []
      }),
      tags: JSON.stringify(['canonical', 'bundled', 'quaternius', 'female', 'playable']),
      version: 1,
      isDefault: false,
      isActive: true,
    }
  ];
}

export async function syncCanonicalGameAssets(prismaClient: any): Promise<number> {
  try {
    const records = buildCanonicalGameAssetRecords();
    const profiles = buildCanonicalCharacterModelProfiles();
    const canonicalModelIds = records.filter((record) => record.id.startsWith('builtin-model-')).map((record) => record.id);
    const canonicalPieceIds = records.filter((record) => record.id.startsWith('builtin-piece-')).map((record) => record.id);
    const canonicalSlugs = profiles.map((profile) => profile.slug);

    if (typeof prismaClient?.gameAsset?.deleteMany === 'function') {
      await prismaClient.gameAsset.deleteMany({
        where: {
          OR: [
            { id: { startsWith: 'builtin-model-', notIn: canonicalModelIds } },
            { id: { startsWith: 'builtin-piece-', notIn: canonicalPieceIds } },
          ]
        }
      });
    }

    if (typeof prismaClient?.characterModelProfile?.deleteMany === 'function') {
      await prismaClient.characterModelProfile.deleteMany({
        where: {
          AND: [
            { id: { startsWith: 'profile-' } },
            { slug: { notIn: canonicalSlugs } },
          ]
        }
      });
    }

    let syncedCount = 0;

    for (const record of records) {
      await prismaClient.gameAsset.upsert({
        where: { id: record.id },
        create: record,
        update: {
          type: record.type,
          source: record.source,
          tags: record.tags,
          categories: record.categories,
          metadata: record.metadata,
          customLabels: record.customLabels,
          fileSize: record.fileSize,
          cdnUrl: record.cdnUrl,
          isActive: true,
        },
      });
      syncedCount++;
    }

    // Sync Canonical CharacterModelProfile records
    if (typeof prismaClient?.characterModelProfile?.upsert === 'function') {
      for (const profile of profiles) {
        await prismaClient.characterModelProfile.upsert({
          where: { slug: profile.slug },
          create: profile,
          update: {
            name: profile.name,
            description: profile.description,
            category: profile.category,
            baseModelAssetId: profile.baseModelAssetId,
            rigFamily: profile.rigFamily,
            skeletonType: profile.skeletonType,
            transformData: profile.transformData,
            skeletonData: profile.skeletonData,
            animationData: profile.animationData,
            socketsData: profile.socketsData,
            materialsData: profile.materialsData,
            modularData: profile.modularData,
            tags: profile.tags,
            version: profile.version,
            isDefault: profile.isDefault,
            isActive: true,
          }
        });
      }
    }
    return syncedCount;
  } catch (err) {
    console.error("[canonicalAssetsSync] Failed to sync canonical game assets:", err);
    return 0;
  }
}
