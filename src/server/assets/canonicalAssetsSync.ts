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

  // 1. Foundational Full Models
  const modelEntries = [
    {
      def: CANONICAL_BUILTIN_MODELS.citizen,
      tags: ["model", "3d", "character", "mixamo", "humanoid", "canonical", "citizen", "playable"],
      categories: ["model", "character"],
      fileSize: 2614500,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.brute,
      tags: ["model", "3d", "character", "manny", "humanoid", "canonical", "brute", "warrior", "playable"],
      categories: ["model", "character"],
      fileSize: 14379200,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.adventurer,
      tags: ["model", "3d", "character", "manny", "humanoid", "canonical", "adventurer", "explorer", "playable"],
      categories: ["model", "character"],
      fileSize: 15192864,
    },
    {
      def: CANONICAL_BUILTIN_MODELS.golem,
      tags: ["model", "3d", "creature", "monster", "beast", "canonical", "golem", "boss"],
      categories: ["model", "creature", "monster"],
      fileSize: 2582580,
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

  // 2. Citizen Modular Wardrobe Pieces
  const citizen = CANONICAL_BUILTIN_MODELS.citizen;
  if (citizen?.modularParts) {
    for (const part of citizen.modularParts) {
      const partSource = `/game-assets/models/citizen/${part.meshName}.glb`;
      const metadata = {
        name: part.label,
        cat: part.category,
        componentCategory: part.category,
        isModularComponent: true,
        defaultVisible: part.defaultVisible,
        pack: "citizen-wardrobe",
        modularSetName: "citizen",
        assetDefinition: {
          modularSetName: "citizen",
        },
        presentation: {
          mode: "3D",
          modelUrl: partSource,
        },
      };

      records.push({
        id: `builtin-piece-${part.id}`,
        gameId: null,
        type: "MODEL",
        source: partSource,
        atlasSource: null,
        atlasFrame: null,
        tags: JSON.stringify(["model", "3d", "modular", "character-component", "citizen", part.category]),
        categories: JSON.stringify(["model", "modular", part.category]),
        metadata: JSON.stringify(metadata),
        customLabels: JSON.stringify({ en: `${part.label} (Citizen)`, name: `${part.label} (Citizen)` }),
        isActive: true,
        usageCount: 0,
        fileSize: 450000,
        cdnUrl: partSource,
      });
    }
  }

  return records;
}

let hasSyncedCanonicalAssets = false;

export async function syncCanonicalGameAssets(prismaClient: any): Promise<number> {
  if (hasSyncedCanonicalAssets) return 0;

  try {
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

    hasSyncedCanonicalAssets = true;
    return syncedCount;
  } catch (err) {
    console.error("[canonicalAssetsSync] Failed to sync canonical game assets:", err);
    return 0;
  }
}
