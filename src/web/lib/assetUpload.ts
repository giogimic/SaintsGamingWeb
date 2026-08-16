/**
 * Saints Gaming — Asset Ingestion & Upload Processing (Bible 35)
 *
 * Handles file ingestion for spritesheets, audio files, textures, and models.
 * Records SourceAsset master files and derives UsableAsset library entries.
 */

import { prisma } from "@/web/lib/prisma";
import { uploadFile } from "@/web/lib/upload";

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
        }),
      },
    });

    let usableAsset = null;

    // 2. Optionally create default UsableAsset if requested (for single asset uploads)
    if (createUsable) {
      const assetName = options.name || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const assetType = options.type || (mimeType.startsWith("audio") ? "AUDIO" : "OBJECT");
      const tagsJson = JSON.stringify(options.tags || [gameId, assetType.toLowerCase()]);

      usableAsset = await prisma.usableAsset.create({
        data: {
          sourceAssetId: sourceAsset.id,
          name: assetName,
          type: assetType.toUpperCase(),
          category: options.category || null,
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
