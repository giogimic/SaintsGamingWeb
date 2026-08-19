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
  /** LPC-style base mesh this component was fitted for (e.g. "male", "child"). */
  baseBodyType?: string;
  /** componentCategory values this piece hides when equipped (e.g. a closed helm hides "hair"). */
  hidesComponents?: string[];
  /** Structured per-layer attribution (e.g. multi-author LPC packs). Stored in asset metadata for getAssetAttribution. */
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
    const { file, userId, gameId = "tuxemon", createUsable = true } = options;

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

    const normalizedAssetType = (options.type || inferTypeForProfile(importProfile || 'character') || (mimeType.startsWith("audio") ? "AUDIO" : "OBJECT")).toUpperCase();
    const inferredCategory = slotRole ? inferCategoryForRole(slotRole) : null;
    const assetCategory = options.category || inferredCategory || (isModularComponent ? componentCategory || "other" : null);
    const moderationStatus = options.moderationStatus || "PENDING";

    const resolvedSpriteDef = resolveSpriteDefinition({
      animationProfile: options.animationProfile,
      width,
      height,
      spriteUrl: storedUrl,
    });

    const baseTags = options.tags || [];
    const enrichedTags = Array.from(
      new Set(
        [
          ...baseTags,
          gameId,
          normalizedAssetType.toLowerCase(),
          `anim:${resolvedSpriteDef.profile}`,
          isModularComponent ? "modular" : "",
          isModularComponent ? "sprite-component" : "",
          isModularComponent && componentCategory ? `component:${componentCategory}` : "",
          isModularComponent && componentLayer ? `layer:${componentLayer}` : "",
          isModularComponent && variantFamily ? `variant:${variantFamily.toLowerCase()}` : "",
          importProfile ? `profile:${importProfile}` : "",
          slotRole ? `role:${slotRole}` : "",
          options.bundleId ? `bundle:${options.bundleId}` : "",
          `source:${sourceMode}`,
        ].filter(Boolean)
      )
    );
    const tagsJson = JSON.stringify(enrichedTags);

    const assetName = options.name || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const assetType = (options.type || inferTypeForProfile(importProfile || 'character') || (mimeType.startsWith("audio") ? "AUDIO" : "OBJECT")).toUpperCase();

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
            anim: resolvedSpriteDef.profile,
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
              sourceAssetId: sourceAsset.id,
              name: assetName,
              type: assetType,
              category: assetCategory,
              tags: tagsJson,
              width,
              height,
              createdById: userId,
              gameId,
              visibility: options.visibility || "COMMUNITY",
              moderationStatus,
              version: 1,
              cdnUrl: storedUrl,
              thumbnailPath: storedUrl,
            },
          })
        : null;

      const gameAsset = await tx.gameAsset.create({
        data: {
          gameId,
          type: normalizedAssetType,
          source: storedUrl,
          tags: tagsJson,
          categories: JSON.stringify(
            Array.from(
              new Set([
                assetCategory || "general",
                ...(componentCategory ? [componentCategory] : []),
                ...(isModularComponent ? ["modular", "character-component"] : []),
              ])
            )
          ),
          metadata: JSON.stringify({
            name: assetName,
            anim: resolvedSpriteDef.profile,
            profile: importProfile || undefined,
            role: slotRole || undefined,
            cat: componentCategory || undefined,
            layer: componentLayer || undefined,
            variant: variantFamily || undefined,
            z: zOrderHint ?? undefined,
            body: baseBodyType || undefined,
            w: width,
            h: height,
            bundle: options.bundleId || undefined,
            pack: "studio-import",
          }),
          isActive: true,
          usageCount: 0,
          fileSize: uploadRes.sizeBytes || file.size,
          cdnUrl: storedUrl,
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
      error: err.message || "Internal asset ingestion error",
    };
  }
}
