"use server";

import { prisma } from "@/web/lib/prisma";

export interface UsableAssetFilter {
  type?: string;
  category?: string;
  query?: string;
  facing?: string;
  animationState?: string;
  limit?: number;
}

export async function listUsableAssets(filter?: UsableAssetFilter) {
  try {
    const where: any = { isActive: true };
    if (filter?.type) where.type = filter.type;
    if (filter?.category) where.category = filter.category;
    if (filter?.facing) where.facing = filter.facing;
    if (filter?.animationState) where.animationState = filter.animationState;

    const rows = await prisma.usableAsset.findMany({
      where,
      orderBy: { usageCount: "desc" },
      take: filter?.limit || 100,
    });

    const needle = (filter?.query || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(needle) ||
            (r.category && r.category.toLowerCase().includes(needle)) ||
            r.tags.toLowerCase().includes(needle)
        )
      : rows;

    return { success: true as const, data };
  } catch (err) {
    console.error("[listUsableAssets]", err);
    return { success: false as const, data: [], error: "Failed to list usable assets" };
  }
}

export async function getUsableAsset(id: string) {
  try {
    const row = await prisma.usableAsset.findUnique({
      where: { id },
      include: { sourceAsset: true },
    });
    if (!row) return { success: false as const, error: "Asset not found" };
    return { success: true as const, data: row };
  } catch (err) {
    console.error("[getUsableAsset]", err);
    return { success: false as const, error: "Failed to load asset" };
  }
}

export interface CaptureSelectionInput {
  name: string;
  type?: 'TILE' | 'OBJECT' | 'TERRAIN';
  dataUrl: string; // "data:image/png;base64,..."
  width: number;
  height: number;
  provenance?: {
    sourceUrl?: string;
    sourceRegion?: { x: number; y: number; w: number; h: number };
  };
}

export async function captureSelectionAsset(input: CaptureSelectionInput) {
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    let userId = session?.user?.id;

    if (!userId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      userId = firstUser?.id || "system";
    }

    // Parse base64 dataUrl
    const matches = input.dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: false as const, error: "Invalid data URL format" };
    }

    const buffer = Buffer.from(matches[2], "base64");
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const crypto = await import("crypto");

    const hash = crypto.randomBytes(8).toString("hex");
    const filename = `selection_${Date.now()}_${hash}.png`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "selections");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const assetUrl = `/uploads/selections/${filename}`;

    const usableAsset = await prisma.usableAsset.create({
      data: {
        name: input.name || `Custom Selection ${input.width}x${input.height}`,
        type: input.type || "OBJECT",
        width: Math.max(1, input.width),
        height: Math.max(1, input.height),
        cdnUrl: assetUrl,
        thumbnailPath: assetUrl,
        sourceRegion: JSON.stringify(input.provenance || {}),
        createdById: userId,
        tags: JSON.stringify(["selection_stamp", "studio_custom"]),
      },
    });

    return {
      success: true as const,
      data: {
        assetId: usableAsset.id,
        url: assetUrl,
        name: usableAsset.name,
        width: usableAsset.width,
        height: usableAsset.height,
      },
    };
  } catch (err: any) {
    console.error("[captureSelectionAsset]", err);
    return { success: false as const, error: err?.message || "Failed to capture selection asset" };
  }
}

