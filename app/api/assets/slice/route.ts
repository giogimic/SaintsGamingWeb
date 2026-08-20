import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canUserModerateAssets } from "@/shared/game/assetPermissions";
import {
  AssetImportProfileId,
  getDefaultSlotRole,
  getMissingRequiredRoles,
  inferCategoryForRole,
  isValidAssetImportProfile,
  isValidSlotRole,
} from "@/shared/game/assetImportProfiles";
import { buildCanonicalAssetData } from "@/shared/game/canonicalAsset";

export const dynamic = "force-dynamic";

export interface SlicedRegionInput {
  name: string;
  type?: string;
  category?: string;
  tags?: string[];
  importProfile?: string;
  slotRole?: string;
  animationProfile?: string;
  componentCategory?: string;
  componentLayer?: string;
  variantFamily?: string;
  isModularComponent?: boolean;
  zOrderHint?: number;
  baseBodyType?: string;
  hidesComponents?: string[];
  bundleId?: string;
  sourceMode?: "spritesheet" | "multi" | "single";
  sourceRegion: { x: number; y: number; w: number; h: number };
  facing?: string;
  animationState?: string;
  animationFrames?: number;
  frameDurationMs?: number;
  visibility?: string;
}

/**
 * POST /api/assets/slice — Batch create UsableAssets and canonical GameAssets from a SourceAsset
 * Body: {
 *   sourceAssetId: string;
 *   gameId?: string;
 *   regions: SlicedRegionInput[];
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — sign in required to slice assets." },
        { status: 401 }
      );
    }

    const permissionLevel = Number((session.user as any).permissionLevel) || 0;
    const canModerate = canUserModerateAssets({ id: session.user.id, permissionLevel });

    const body = await req.json();
    const {
      sourceAssetId,
      gameId = "tuxemon",
      regions,
      importProfile: bodyImportProfile,
      strictRequiredRoles,
      mode,
    } = body;

    if (!sourceAssetId) {
      return NextResponse.json(
        { success: false, error: "Missing sourceAssetId." },
        { status: 400 }
      );
    }

    if (!Array.isArray(regions) || regions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No slicing regions provided." },
        { status: 400 }
      );
    }

    const fallbackProfile =
      typeof bodyImportProfile === "string" && bodyImportProfile.trim()
        ? bodyImportProfile.trim().toLowerCase()
        : "";

    if (fallbackProfile && !isValidAssetImportProfile(fallbackProfile)) {
      return NextResponse.json(
        { success: false, error: `Unsupported import profile: ${fallbackProfile}` },
        { status: 400 }
      );
    }

    const strictRoles = strictRequiredRoles === true;
    const profileRoleAssignments = new Map<AssetImportProfileId, Set<string>>();

    for (const region of regions as SlicedRegionInput[]) {
      const regionProfileCandidate =
        typeof region.importProfile === "string" && region.importProfile.trim()
          ? region.importProfile.trim().toLowerCase()
          : fallbackProfile;

      if (!regionProfileCandidate) {
        continue;
      }

      if (!isValidAssetImportProfile(regionProfileCandidate)) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported import profile in region ${region.name || "unnamed"}: ${regionProfileCandidate}`,
          },
          { status: 400 }
        );
      }

      const profile = regionProfileCandidate;
      const roleCandidate = region.slotRole?.trim() || getDefaultSlotRole(profile);
      if (!isValidSlotRole(profile, roleCandidate)) {
        return NextResponse.json(
          {
            success: false,
            error: `Role "${roleCandidate}" is not valid for profile "${profile}" in region ${region.name || "unnamed"}.`,
          },
          { status: 400 }
        );
      }

      if (!profileRoleAssignments.has(profile)) {
        profileRoleAssignments.set(profile, new Set<string>());
      }
      profileRoleAssignments.get(profile)!.add(roleCandidate);
    }

    if (strictRoles) {
      for (const [profile, assignedRoleSet] of profileRoleAssignments.entries()) {
        const missingRoles = getMissingRequiredRoles(profile, Array.from(assignedRoleSet));
        if (missingRoles.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Missing required roles for profile "${profile}": ${missingRoles.join(", ")}`,
              profile,
              missingRoles,
            },
            { status: 400 }
          );
        }
      }
    }

    // Verify source asset exists
    const sourceAsset = await prisma.sourceAsset.findUnique({
      where: { id: sourceAssetId },
      select: {
        id: true,
        filename: true,
        storagePath: true,
        uploadedById: true,
        metadata: true,
        fileSize: true,
      },
    });

    if (!sourceAsset) {
      return NextResponse.json(
        { success: false, error: "Source asset not found." },
        { status: 404 }
      );
    }

    if (!canModerate && sourceAsset.uploadedById !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden — you can only slice assets you uploaded." },
        { status: 403 }
      );
    }

    let sourceAssetMetadata: Record<string, any> = {};
    try {
      if (sourceAsset.metadata) {
        sourceAssetMetadata = JSON.parse(sourceAsset.metadata);
      }
    } catch {
      sourceAssetMetadata = {};
    }

    // Create both UsableAsset and GameAsset records in an atomic batch transaction
    const { createdUsableAssets, createdGameAssets } = await prisma.$transaction(async (tx) => {
      const createdUsable: any[] = [];
      const createdGame: any[] = [];

      for (const r of regions as SlicedRegionInput[]) {
        const regionProfileCandidate =
          typeof r.importProfile === "string" && r.importProfile.trim()
            ? r.importProfile.trim().toLowerCase()
            : fallbackProfile || sourceAssetMetadata.profile || undefined;

        const profile =
          regionProfileCandidate && isValidAssetImportProfile(regionProfileCandidate)
            ? regionProfileCandidate
            : undefined;

        const slotRole = r.slotRole?.trim() || (profile ? getDefaultSlotRole(profile) : sourceAssetMetadata.role || undefined);
        const inferredCategory = slotRole ? inferCategoryForRole(slotRole) : null;
        const category = r.category || inferredCategory || sourceAssetMetadata.cat || null;

        const canonical = buildCanonicalAssetData({
          userId: session.user.id,
          gameId,
          name: r.name || `${sourceAsset.filename}_slice_${r.sourceRegion.x}_${r.sourceRegion.y}`,
          type: r.type,
          category,
          tags: r.tags,
          width: r.sourceRegion.w,
          height: r.sourceRegion.h,
          sourceUrl: sourceAsset.storagePath,
          atlasSource: sourceAsset.storagePath,
          sourceRegion: r.sourceRegion,
          atlasFrame: { x: r.sourceRegion.x, y: r.sourceRegion.y, width: r.sourceRegion.w, height: r.sourceRegion.h },
          sourceMode: "spritesheet",
          importProfile: profile,
          slotRole,
          animationProfile: r.animationProfile || sourceAssetMetadata.anim || undefined,
          componentCategory: r.componentCategory || sourceAssetMetadata.cat || undefined,
          componentLayer: r.componentLayer || sourceAssetMetadata.layer || undefined,
          variantFamily: r.variantFamily || sourceAssetMetadata.variant || undefined,
          isModularComponent: r.isModularComponent ?? Boolean(sourceAssetMetadata.cat || sourceAssetMetadata.layer),
          zOrderHint: r.zOrderHint ?? sourceAssetMetadata.z,
          baseBodyType: r.baseBodyType || sourceAssetMetadata.body || undefined,
          hidesComponents: r.hidesComponents || sourceAssetMetadata.hidesComponents || undefined,
          bundleId: r.bundleId || sourceAssetMetadata.bundle || undefined,
          pack: "studio-slice",
          visibility: (r.visibility as any) || "COMMUNITY",
          moderationStatus: canModerate ? "APPROVED" : "PENDING",
          facing: r.facing,
          animationState: r.animationState,
          animationFrames: r.animationFrames,
          frameDurationMs: r.frameDurationMs,
          sourceAssetId: sourceAsset.id,
        });

        const usableRow = await tx.usableAsset.create({
          data: canonical.usableAssetData,
        });

        // Link usableAsset ID in GameAsset metadata
        const finalMetadata = {
          ...canonical.metadata,
          usableAssetId: usableRow.id,
        };

        const gameRow = await tx.gameAsset.create({
          data: {
            ...canonical.gameAssetData,
            metadata: JSON.stringify(finalMetadata),
          },
        });

        createdUsable.push(usableRow);
        createdGame.push(gameRow);
      }

      return { createdUsableAssets: createdUsable, createdGameAssets: createdGame };
    });

    return NextResponse.json({
      success: true,
      count: createdUsableAssets.length,
      assets: createdUsableAssets,
      gameAssets: createdGameAssets,
    });
  } catch (error: any) {
    console.error("[api/assets/slice] Error creating sliced usable assets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
