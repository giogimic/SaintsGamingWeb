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
  inferCategoryForRole,
  inferTypeForProfile,
  isValidAssetImportProfile,
  isValidSlotRole,
} from "@/shared/game/assetImportProfiles";

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
  bundleId?: string;
  sourceMode?: "single" | "multi" | "spritesheet";
}

export interface AssetIngestResult {
  success: boolean;
  sourceAsset?: any;
  usableAsset?: any;
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

    const filename = uploadRes.filename || file.name || "unnamed_asset";
    const mimeType = uploadRes.mimeType || file.type || "application/octet-stream";
    const width = options.width || 32;
    const height = options.height || 32;
    const sourceMode = options.sourceMode || "single";

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

    // 1. Create SourceAsset record
    const sourceAsset = await prisma.sourceAsset.create({
      data: {
        filename,
        mimeType,
        width,
        height,
        fileSize: uploadRes.sizeBytes || file.size,
        storagePath: uploadRes.url,
        uploadedById: userId,
        version: 1,
        metadata: JSON.stringify({
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          storage: uploadRes.storage || "local",
          importProfile,
          slotRole,
          bundleId: options.bundleId || null,
          sourceMode,
        }),
      },
    });

    let usableAsset = null;

    // 2. Optionally create default UsableAsset if requested (for single asset uploads)
    if (createUsable) {
      const assetName = options.name || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const inferredType = importProfile ? inferTypeForProfile(importProfile) : null;
      const assetType = (options.type || inferredType || (mimeType.startsWith("audio") ? "AUDIO" : "OBJECT")).toUpperCase();
      const inferredCategory = slotRole ? inferCategoryForRole(slotRole) : null;
      const assetCategory = options.category || inferredCategory || null;

      const baseTags = options.tags || [];
      const enrichedTags = Array.from(
        new Set(
          [
            ...baseTags,
            gameId,
            assetType.toLowerCase(),
            importProfile ? `profile:${importProfile}` : "",
            slotRole ? `role:${slotRole}` : "",
            options.bundleId ? `bundle:${options.bundleId}` : "",
            `source:${sourceMode}`,
          ].filter(Boolean)
        )
      );
      const tagsJson = JSON.stringify(enrichedTags);

      usableAsset = await prisma.usableAsset.create({
        data: {
          sourceAssetId: sourceAsset.id,
          name: assetName,
          type: assetType.toUpperCase(),
          category: assetCategory,
          tags: tagsJson,
          width,
          height,
          createdById: userId,
          gameId,
          visibility: options.visibility || "COMMUNITY",
          moderationStatus: "APPROVED",
          version: 1,
          cdnUrl: uploadRes.url,
          thumbnailPath: uploadRes.url,
        },
      });
    }

    return {
      success: true,
      sourceAsset,
      usableAsset,
    };
  } catch (err: any) {
    console.error("[assetUpload] Error ingesting asset:", err);
    return {
      success: false,
      error: err.message || "Internal asset ingestion error",
    };
  }
}
