/**
 * Saints Gaming — Asset Ingestion & Upload Processing (Bible 35)
 *
 * Handles file ingestion for spritesheets, audio files, textures, and models.
 * Records SourceAsset master files and derives UsableAsset library entries.
 */

import { prisma } from "@/web/lib/prisma";
import { uploadFile } from "@/web/lib/upload";
import {
  AssetImportProfileId,
  getDefaultSlotRole,
  getDefaultZOrderHint,
  inferCategoryForRole,
  inferCharacterComponentLayerSlot,
  inferTypeForProfile,
  isCharacterComponentCategory,
  isValidAssetImportProfile,
  isValidCharacterBaseBodyType,
  isValidSlotRole,
} from "@/shared/game/assetImportProfiles";
import { resolveSpriteDefinition } from "@/shared/game/spriteDefinitions";
import { buildCanonicalAssetData } from "@/shared/game/canonicalAsset";

export interface AssetIngestOptions {
  userId: string;
  file: File;
  gameId?: string;
  createUsable?: boolean;
  name?: string;
  type?: string; // CHARACTER, CREATURE, TERRAIN, TILE, ITEM, OBJECT, UI, EFFECT, MODEL, ANIMATION, AUDIO
  category?: string;
  tags?: string[];
  width?: number;
  height?: number;
  visibility?: 'PERSONAL' | 'PROJECT' | 'COMMUNITY' | 'PUBLIC';
  importProfile?: string;
  slotRole?: string;
  animationProfile?: string;
  componentCategory?: string;
  componentLayer?: string;
  variantFamily?: string;
  isModularComponent?: boolean;
  /** Baseline stacking order for compositing (lower draws first). */
  zOrderHint?: number;
  /** Modular-style base mesh this component was fitted for (e.g. "male", "child"). */
  baseBodyType?: string;
  /** componentCategory values this piece hides when equipped (e.g. a closed helm hides "hair"). */
  hidesComponents?: string[];
  /** Structured per-layer attribution (e.g. multi-author modular packs). Stored in asset metadata for getAssetAttribution. */
  credits?: { fileName?: string; authors?: string[]; licenses?: string[]; urls?: string[] }[];
  bundleId?: string;
  sourceMode?: "single" | "multi" | "spritesheet";
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AssetIngestResult {
  success: boolean;
  sourceAsset?: any;
  usableAsset?: any;
  gameAsset?: any;
  error?: string;
}

export async function ingestAsset(options: AssetIngestOptions): Promise<AssetIngestResult> {
  try {
    const { file, userId, gameId = "saints", createUsable = true } = options;

    if (!file || file.size === 0) {
      return { success: false, error: "Empty or invalid file uploaded." };
    }

    // Persist physical file via standard upload pipeline
    const uploadRes = await uploadFile(file);
    if (!uploadRes.success || !uploadRes.url) {
      return { success: false, error: uploadRes.error || "Failed to store asset file." };
    }

    const storedUrl = uploadRes.url;

    const filename = uploadRes.filename || file.name || "unnamed_asset";
    const mimeType = uploadRes.mimeType || file.type || "application/octet-stream";
    const width = options.width || 32;
    const height = options.height || 32;
    const sourceMode = options.sourceMode || "single";
    const isModularComponent = Boolean(options.isModularComponent) || Boolean(options.componentCategory && isCharacterComponentCategory(options.componentCategory));
    const componentCategory = (options.componentCategory || "").trim().toLowerCase();
    const componentLayer = (options.componentLayer || inferCharacterComponentLayerSlot(componentCategory) || "").trim().toLowerCase();
    const variantFamily = (options.variantFamily || "").trim();

    // Compositing rules — only meaningful for modular character components.
    let zOrderHint: number | null = null;
    let baseBodyType: string | null = null;
    let hidesComponents: string[] = [];
    if (isModularComponent) {
      zOrderHint = typeof options.zOrderHint === "number" && Number.isFinite(options.zOrderHint)
        ? options.zOrderHint
        : getDefaultZOrderHint(componentCategory);

      const requestedBodyType = (options.baseBodyType || "").trim().toLowerCase();
      if (requestedBodyType) {
        if (!isValidCharacterBaseBodyType(requestedBodyType)) {
          return { success: false, error: `Unsupported base body type: ${options.baseBodyType}` };
        }
        baseBodyType = requestedBodyType;
      }

      hidesComponents = Array.from(
        new Set((options.hidesComponents || []).map((v) => v.trim().toLowerCase()).filter(Boolean))
      );
      for (const hidden of hidesComponents) {
        if (!isCharacterComponentCategory(hidden)) {
          return { success: false, error: `Unsupported hidesComponents entry: ${hidden}` };
        }
      }
    }

    let importProfile: AssetImportProfileId | null = null;
    if (options.importProfile?.trim()) {
      const requestedProfile = options.importProfile.trim().toLowerCase();
      if (!isValidAssetImportProfile(requestedProfile)) {
        return { success: false, error: `Unsupported import profile: ${options.importProfile}` };
      }
      importProfile = requestedProfile;
    }

    let slotRole: string | null = null;
    if (importProfile) {
      slotRole = options.slotRole?.trim() || getDefaultSlotRole(importProfile);
      if (!isValidSlotRole(importProfile, slotRole)) {
        return {
          success: false,
          error: `Role \"${slotRole}\" is not valid for profile \"${importProfile}\".`,
        };
      }
    }

    const canonical = buildCanonicalAssetData({
      userId,
      gameId,
      name: options.name,
      type: options.type,
      category: options.category,
      tags: options.tags,
      width,
      height,
      sourceUrl: storedUrl,
      sourceMode,
      importProfile: importProfile || undefined,
      slotRole: slotRole || undefined,
      animationProfile: options.animationProfile,
      componentCategory,
      componentLayer,
      variantFamily,
      isModularComponent,
      zOrderHint: zOrderHint ?? undefined,
      baseBodyType: baseBodyType ?? undefined,
      hidesComponents,
      credits: options.credits,
      bundleId: options.bundleId,
      visibility: options.visibility,
      moderationStatus: options.moderationStatus,
      fileSize: uploadRes.sizeBytes || file.size,
    });

    const { sourceAsset, usableAsset, gameAsset } = await prisma.$transaction(async (tx) => {
      const sourceAsset = await tx.sourceAsset.create({
        data: {
          filename,
          mimeType,
          width,
          height,
          fileSize: uploadRes.sizeBytes || file.size,
          storagePath: storedUrl,
          uploadedById: userId,
          version: 1,
          metadata: JSON.stringify({
            orig: file.name,
            anim: canonical.spriteDef.profile,
            profile: importProfile || undefined,
            role: slotRole || undefined,
            cat: componentCategory || undefined,
            layer: componentLayer || undefined,
            variant: variantFamily || undefined,
            z: zOrderHint ?? undefined,
            body: baseBodyType || undefined,
            bundle: options.bundleId || undefined,
            mode: sourceMode,
          }),
        },
      });

      const usableAsset = createUsable
        ? await tx.usableAsset.create({
            data: {
              ...canonical.usableAssetData,
              sourceAssetId: sourceAsset.id,
            },
          })
        : null;

      const finalGameMeta = {
        ...canonical.metadata,
        sourceAssetId: sourceAsset.id,
        usableAssetId: usableAsset?.id || undefined,
      };

      const gameAsset = await tx.gameAsset.create({
        data: {
          ...canonical.gameAssetData,
          metadata: JSON.stringify(finalGameMeta),
        },
      });

      return { sourceAsset, usableAsset, gameAsset };
    });

    return {
      success: true,
      sourceAsset,
      usableAsset,
      gameAsset,
    };
  } catch (err: any) {
    console.error("[assetUpload] Error ingesting asset:", err);
    return {
      success: false,
      error: err.message || "Failed to ingest asset.",
    };
  }
}
