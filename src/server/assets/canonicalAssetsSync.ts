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
  const records: CanonicalAssetSeedRecord[] = [];

  // 1. Foundational Full Models
  const modelEntries = [
    {
      def: CANONICAL_BUILTIN_MODELS.brute,
      tags: ["model", "3d", "character", "manny", "humanoid", "canonical", "bundled", "brute", "warrior", "playable"],
      categories: ["model", "character"],
      fileSize: 14379200,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.boy,
      tags: ["model", "3d", "character", "mixamo", "humanoid", "canonical", "bundled", "boy", "playable"],
      categories: ["model", "character"],
      fileSize: 8703180,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.girl,
      tags: ["model", "3d", "character", "mixamo", "humanoid", "canonical", "bundled", "girl", "adventurer", "playable"],
      categories: ["model", "character"],
      fileSize: 7497318,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.asian_girl,
      tags: ["model", "3d", "character", "daz_g8f", "humanoid", "canonical", "bundled", "asian_girl", "modular", "heroine", "playable"],
      categories: ["model", "character"],
      fileSize: 94445640,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.leoverse,
      tags: ["model", "3d", "prop", "statue", "canonical", "bundled", "leoverse", "heroic"],
      categories: ["model", "prop"],
      fileSize: 10244792,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.citizens,
      tags: ["model", "3d", "character", "npc", "citizen", "canonical", "bundled", "townspeople"],
      categories: ["model", "character"],
      fileSize: 386252,
    },
  ];

  for (const { def, tags, categories, fileSize: fallbackSize } of modelEntries) {
    if (!def) continue;
    const fileSize = getBundledFileSize(def.modelUrl, fallbackSize);
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

  // 2. Modular Wardrobe Pieces
  const modularSets = [
    {
      model: CANONICAL_BUILTIN_MODELS.brute,
      pack: 'brute-armor',
      fileSize: 14379200,
      getSource: () => `/game-assets/models/humanoids/brute/brute.glb`,
    },
    {
      model: CANONICAL_BUILTIN_MODELS.asian_girl,
      pack: 'asian_girl_outfits',
      fileSize: 94445640,
      getSource: () => `/game-assets/models/humanoids/asian_girl/asian_girl.glb`,
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
        isSubmesh: true,
        defaultVisible: part.defaultVisible,
        availableInCharacterCreation: true,
        isFaceVariant: Boolean((part as any).isFaceVariant),
        skeleton: set.model.skeleton,
        pack: set.pack,
        modularSetName: setName,
        meshName: part.meshName,
        suppressesSubmeshes: (part as any).suppressesSubmeshes,
        replacesSubmesh: (part as any).replacesSubmesh,
        assetDefinition: {
          modularSetName: setName,
          meshName: part.meshName,
          skeleton: set.model.skeleton,
          suppressesSubmeshes: (part as any).suppressesSubmeshes,
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
        fileSize: getBundledFileSize(partSource, set.fileSize),
        cdnUrl: partSource,
      });
    }
  }

  // Standalone Katana weapon prop
  records.push({
    id: 'builtin-piece-katana',
    gameId: null,
    type: 'MODEL',
    source: '/game-assets/models/humanoids/asian_girl/katana.glb',
    atlasSource: null,
    atlasFrame: null,
    tags: JSON.stringify(['model', '3d', 'weapon', 'prop', 'katana', 'asian_girl', 'canonical']),
    categories: JSON.stringify(['model', 'weapon', 'accessory']),
    metadata: JSON.stringify({
      name: 'Katana (Weapon Prop)',
      cat: 'weapon',
      componentCategory: 'weapon',
      isModularComponent: true,
      defaultVisible: false,
      socket: 'RightHandMount',
      presentation: {
        mode: '3D',
        modelUrl: '/game-assets/models/humanoids/asian_girl/katana.glb',
      },
    }),
    customLabels: JSON.stringify({ en: 'Katana (Weapon Prop)', name: 'Katana (Weapon Prop)' }),
    isActive: true,
    usageCount: 0,
    fileSize: getBundledFileSize('/game-assets/models/humanoids/asian_girl/katana.glb', 1051180),
    cdnUrl: '/game-assets/models/humanoids/asian_girl/katana.glb',
  });

  // 3. 42 Individual Low-Poly Citizens (Townspeople variation pool)
  const citizenDir = path.resolve(process.cwd(), 'public/game-assets/models/humanoids/citizens/glb');
  if (fs.existsSync(citizenDir)) {
    const files = fs.readdirSync(citizenDir).filter((f) => f.endsWith('.glb'));
    for (const f of files) {
      const baseName = f.replace(/\.glb$/i, '');
      const isKid = baseName.includes('kid');
      const isWoman = baseName.includes('girl') || baseName.includes('wm') || baseName.includes('w_') || baseName.includes('d_') || baseName.includes('h_');
      const roleLabel = isKid ? 'Town Child' : (isWoman ? 'Townswoman' : 'Townsman');
      const label = `${roleLabel} (${baseName})`;
      const source = `/game-assets/models/humanoids/citizens/glb/${f}`;

      records.push({
        id: `builtin-citizen-${baseName}`,
        gameId: null,
        type: 'MODEL',
        source,
        atlasSource: null,
        atlasFrame: null,
        tags: JSON.stringify(['model', '3d', 'citizen', 'npc', 'townsperson', isKid ? 'child' : (isWoman ? 'female' : 'male'), 'canonical', 'bundled']),
        categories: JSON.stringify(['model', 'character', 'npc']),
        metadata: JSON.stringify({
          name: label,
          profile: 'character',
          role: 'npc',
          skeleton: 'static',
          isModularComponent: false,
          pack: 'citizens_pack',
          isPlayable: false,
          presentation: {
            mode: '3D',
            modelUrl: source,
          },
        }),
        customLabels: JSON.stringify({ en: label, name: label }),
        isActive: true,
        usageCount: 0,
        fileSize: getBundledFileSize(source, 385000),
        cdnUrl: source,
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
    },
    {
      id: 'profile-boy',
      slug: 'boy',
      name: 'Stylized Boy',
      description: 'Stylized young hero character with native in-place locomotion pack.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-boy',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'mixamo',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({
        profileId: 'boy_native',
        actionSlots: {
          idle: { clipName: 'Breathing Idle', sourceKind: 'animation-set' },
          walk_fwd: { clipName: 'Walking', sourceKind: 'animation-set' },
          run_fwd: { clipName: 'Running', sourceKind: 'animation-set' },
          sit: { clipName: 'Sitting', sourceKind: 'animation-set' },
        }
      }),
      socketsData: JSON.stringify([]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({ isCustomizable: false, components: [] }),
      tags: JSON.stringify(['canonical', 'bundled', 'mixamo', 'boy', 'playable']),
      version: 1,
      isDefault: false,
      isActive: true,
    },
    {
      id: 'profile-girl',
      slug: 'girl',
      name: 'Stylized Adventurer Girl',
      description: 'Stylized female adventurer with complete native in-place animation suite.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-girl',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'mixamo',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({
        profileId: 'girl_native',
        actionSlots: {
          idle: { clipName: 'Idle', sourceKind: 'animation-set' },
          walk_fwd: { clipName: 'Walking', sourceKind: 'animation-set' },
          run_fwd: { clipName: 'Running', sourceKind: 'animation-set' },
          jump_start: { clipName: 'Jumping', sourceKind: 'animation-set' },
          talk: { clipName: 'Talking', sourceKind: 'animation-set' },
          sit: { clipName: 'Sitting Idle', sourceKind: 'animation-set' },
        }
      }),
      socketsData: JSON.stringify([]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({ isCustomizable: false, components: [] }),
      tags: JSON.stringify(['canonical', 'bundled', 'mixamo', 'girl', 'adventurer', 'playable']),
      version: 1,
      isDefault: false,
      isActive: true,
    },
    {
      id: 'profile-asian_girl',
      slug: 'asian_girl',
      name: 'Asian Heroine (Modular)',
      description: 'Daz G8F modular hero character with multiple switchable uniform and ronin outfit layers.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-asian_girl',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'daz_g8f',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({ actionSlots: {} }),
      socketsData: JSON.stringify([
        { name: 'RightHandMount', parentBone: 'rHand', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { name: 'SheathedHip_L', parentBone: 'lThighBend', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({
        isCustomizable: true,
        components: [
          { assetId: 'builtin-piece-ag_shirt', category: 'shirt', label: 'Uniform Blouse', meshName: '4_+Shirt1_01_0_0', isSubmesh: true, defaultVisible: true, suppressesSubmeshes: ['4_-Top1_01_0_0', '4_full_body001'] },
          { assetId: 'builtin-piece-ag_skirt', category: 'pants', label: 'Pleated Skirt', meshName: '4_+Skirt1_01_0_0', isSubmesh: true, defaultVisible: true, suppressesSubmeshes: ['6_+Panty_01_0_0'] },
          { assetId: 'builtin-piece-ag_shoes', category: 'shoes', label: 'Sneakers', meshName: '4_+Shoes_01_0_0002', isSubmesh: true, defaultVisible: true },
          { assetId: 'builtin-piece-ag_scabbard', category: 'accessory', label: 'Hip Scabbard', meshName: '6_+HolsterScabbard_01_0_0001', isSubmesh: true, defaultVisible: true },
          { assetId: 'builtin-piece-ag_katana_hand', category: 'weapon', label: 'Drawn Katana', meshName: '4_-Katana|Hand_01_0_0001', isSubmesh: true, defaultVisible: false },
          { assetId: 'builtin-piece-ag_shuriken', category: 'accessory', label: 'Shuriken Pouch', meshName: '24_-shuriken|2_bladeoutfit_b2_03_0_0002', isSubmesh: true, defaultVisible: false },
          { assetId: 'builtin-piece-ag_gloves', category: 'gloves', label: 'Leather Gloves', meshName: '4_+Gloves_01_0_0001', isSubmesh: true, defaultVisible: false, suppressesSubmeshes: ['4_Arms'] },
        ]
      }),
      tags: JSON.stringify(['canonical', 'bundled', 'daz_g8f', 'asian_girl', 'modular', 'playable']),
      version: 1,
      isDefault: false,
      isActive: true,
    },
    {
      id: 'profile-leoverse',
      slug: 'leoverse',
      name: 'Heroic Armored Statue',
      description: 'Grand armored statue prop for world spaces and monument centers.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-leoverse',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'static',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({ actionSlots: {} }),
      socketsData: JSON.stringify([]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({ isCustomizable: false, components: [] }),
      tags: JSON.stringify(['canonical', 'bundled', 'static', 'prop', 'statue']),
      version: 1,
      isDefault: false,
      isActive: true,
    },
    {
      id: 'profile-citizens',
      slug: 'citizens',
      name: 'Town Citizen',
      description: 'Low-poly town citizen character from civilian crowd variation pool.',
      category: 'character',
      gameId: 'saints',
      baseModelAssetId: 'builtin-model-citizens',
      rigFamily: 'HUMANOID_BIPED',
      skeletonType: 'static',
      transformData: JSON.stringify({ scale: 1.0, rotationY: 0, groundingOffsetY: 0, cameraHeightOffset: 0 }),
      skeletonData: JSON.stringify({ boneMap: {} }),
      animationData: JSON.stringify({ actionSlots: {} }),
      socketsData: JSON.stringify([]),
      materialsData: JSON.stringify({}),
      modularData: JSON.stringify({ isCustomizable: false, components: [] }),
      tags: JSON.stringify(['canonical', 'bundled', 'static', 'citizen', 'npc']),
      version: 1,
      isDefault: false,
      isActive: true,
    },
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
          slug: { notIn: canonicalSlugs }
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
