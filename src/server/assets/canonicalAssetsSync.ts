/**
 * Saints Gaming — Canonical Builtin 3D Assets Sync
 *
 * Ensures all bundled canonical 3D models (Citizen, Brute, Adventurer, Golem)
 * and modular wardrobe pieces are registered into the GameAsset database table,
 * making them immediately discoverable in Asset Library, Archetype Studio,
 * Model Wardrobe Editor, and Entity Studio.
 */

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

export function buildCanonicalGameAssetRecords(): CanonicalAssetSeedRecord[] {
  const records: CanonicalAssetSeedRecord[] = [];

  // 1. Foundational Full Model - Brute ONLY
  const modelEntries = [
    {
      def: CANONICAL_BUILTIN_MODELS.brute,
      tags: ["model", "3d", "character", "manny", "humanoid", "canonical", "bundled", "brute", "warrior", "playable"],
      categories: ["model", "character"],
      fileSize: 14379200,
    },
  ];

  for (const { def, tags, categories, fileSize } of modelEntries) {
    if (!def) continue;
    const metadata = {
      name: def.name,
      anim: def.defaultAnimationProfileId || undefined,
      profile: def.category,
      role: def.category === "monster" ? "monster" : "humanoid",
      skeleton: def.skeleton,
      defaultAnimationProfileId: def.defaultAnimationProfileId,
      embeddedAnimations: def.embeddedAnimations,
      isModularComponent: false,
      pack: "canonical-models",
      isPlayable: def.category === "character",
      showInCharacterCreation: def.category === "character",
      presentation: {
        mode: "3D",
        modelUrl: def.modelUrl,
        animationProfileId: def.defaultAnimationProfileId,
      },
    };

    records.push({
      id: `builtin-model-${def.id}`,
      gameId: null,
      type: "MODEL",
      source: def.modelUrl,
      atlasSource: null,
      atlasFrame: null,
      tags: JSON.stringify(tags),
      categories: JSON.stringify(categories),
      metadata: JSON.stringify(metadata),
      customLabels: JSON.stringify({ en: def.name, name: def.name }),
      isActive: true,
      usageCount: 0,
      fileSize,
      cdnUrl: def.modelUrl,
    });
  }

  // 2. Modular Wardrobe Pieces for Brute
  const modularSets = [
    {
      model: CANONICAL_BUILTIN_MODELS.brute,
      pack: 'brute-armor',
      fileSize: 14379200,
      getSource: () => `/game-assets/models/humanoids/brute/brute.glb`,
    },
  ];

  for (const set of modularSets) {
    if (!set.model?.modularParts) continue;
    const setName = set.model.id;
    for (const part of set.model.modularParts) {
      const partSource = set.getSource();
      const metadata = {
        name: part.label,
        cat: part.category,
        componentCategory: part.category,
        isModularComponent: true,
        defaultVisible: part.defaultVisible,
        availableInCharacterCreation: true,
        isFaceVariant: Boolean((part as any).isFaceVariant),
        skeleton: set.model.skeleton,
        pack: set.pack,
        modularSetName: setName,
        meshName: part.meshName,
        assetDefinition: {
          modularSetName: setName,
          meshName: part.meshName,
          skeleton: set.model.skeleton,
        },
        presentation: {
          mode: '3D',
          modelUrl: partSource,
        },
      };

      records.push({
        id: `builtin-piece-${part.id}`,
        gameId: null,
        type: 'MODEL',
        source: partSource,
        atlasSource: null,
        atlasFrame: null,
        tags: JSON.stringify(['model', '3d', 'modular', 'character-component', 'canonical', 'bundled', setName, part.category]),
        categories: JSON.stringify(['model', 'modular', part.category]),
        metadata: JSON.stringify(metadata),
        customLabels: JSON.stringify({ en: `${part.label} (${set.model.name})`, name: `${part.label} (${set.model.name})` }),
        isActive: true,
        usageCount: 0,
        fileSize: set.fileSize,
        cdnUrl: partSource,
      });
    }
  }

  return records;
}

export function buildCanonicalCharacterModelProfiles(): any[] {
  return [
    {
      id: 'profile-brute',
      slug: 'brute',
      name: 'Brute',
      description: 'Heavily armored warrior character with modular armor pieces and Greystone Manny locomotion.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-brute',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'manny',
      transformData: JSON.stringify({ scale: 0.8, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({
        profileId: 'GreystoneManny',
        actionSlots: {
          idle: { clipName: 'idle', sourceKind: 'animation-set' },
          walk_fwd: { clipName: 'walk_fwd', sourceKind: 'animation-set' },
          run_fwd: { clipName: 'run_fwd', sourceKind: 'animation-set' },
        }
      }),
      socketsData: JSON.stringify([
        { name: 'RightHand', parentBone: 'Hand.R', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { name: 'LeftHand', parentBone: 'Hand.L', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({
        isCustomizable: true,
        components: [
          { assetId: 'builtin-piece-brute_head', category: 'face', label: 'Beast Head', defaultVisible: true },
          { assetId: 'builtin-piece-brute_helmet', category: 'hat', label: 'Helmet', defaultVisible: false },
          { assetId: 'builtin-piece-brute_torso', category: 'shirt', label: 'Armor Torso', defaultVisible: true },
          { assetId: 'builtin-piece-brute_pants', category: 'pants', label: 'Armor Pants', defaultVisible: true },
          { assetId: 'builtin-piece-brute_boots', category: 'shoes', label: 'War Boots', defaultVisible: true },
          { assetId: 'builtin-piece-brute_harness', category: 'accessory', label: 'Shoulder Harness', defaultVisible: false },
          { assetId: 'builtin-piece-brute_shoulder', category: 'accessory', label: 'Spiked Pauldron', defaultVisible: false },
          { assetId: 'builtin-piece-brute_cape', category: 'back', label: 'Warrior Cape', defaultVisible: false },
          { assetId: 'builtin-piece-brute_belt', category: 'belt', label: 'Chain Warbelt', defaultVisible: false },
        ]
      }),
      tags: JSON.stringify(['canonical', 'bundled', 'manny', 'brute', 'warrior', 'playable']),
      version: 1,
      isDefault: true,
      isActive: true,
    }
  ];
}

let hasSyncedCanonicalAssets = false;

export async function syncCanonicalGameAssets(prismaClient: any): Promise<number> {
  if (hasSyncedCanonicalAssets) return 0;

  try {
    if (typeof prismaClient?.gameAsset?.deleteMany === 'function') {
      await prismaClient.gameAsset.deleteMany({
        where: {
          OR: [
            { id: { startsWith: 'builtin-model-', not: 'builtin-model-brute' } },
            { id: { startsWith: 'builtin-piece-', not: { startsWith: 'builtin-piece-brute' } } },
            { id: 'builtin-model-citizen' },
            { id: 'builtin-model-adventurer' },
            { id: 'builtin-model-golem' },
            { id: 'builtin-model-shadow_golem' },
            { id: 'builtin-model-stylized_girl' },
            { id: { startsWith: 'stylized_girl_' } },
            { id: { startsWith: 'builtin-piece-stylized_girl' } },
            { id: { startsWith: 'builtin-piece-citizen' } },
            { id: { startsWith: 'builtin-piece-adventurer' } },
          ]
        }
      });
    }

    if (typeof prismaClient?.characterModelProfile?.deleteMany === 'function') {
      await prismaClient.characterModelProfile.deleteMany({
        where: {
          slug: { not: 'brute' }
        }
      });
    }

    const records = buildCanonicalGameAssetRecords();
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
      const profiles = buildCanonicalCharacterModelProfiles();
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

    hasSyncedCanonicalAssets = true;
    return syncedCount;
  } catch (err) {
    console.error("[canonicalAssetsSync] Failed to sync canonical game assets:", err);
    return 0;
  }
}
