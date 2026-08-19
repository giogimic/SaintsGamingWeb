import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canUserModerateAssets } from "@/shared/game/assetPermissions";
import {
  AssetImportProfileId,
  getDefaultSlotRole,
  getMissingRequiredRoles,
  inferCategoryForRole,
  inferTypeForProfile,
  isValidAssetImportProfile,
  isValidSlotRole,
} from "@/shared/game/assetImportProfiles";

export const dynamic = "force-dynamic";

export interface SlicedRegionInput {
  name: string;
  type?: string;
  category?: string;
  tags?: string[];
  importProfile?: string;
  slotRole?: string;
  animationProfile?: string;
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
 * POST /api/assets/slice — Batch create UsableAssets from a SourceAsset
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
            error: `Role \"${roleCandidate}\" is not valid for profile \"${profile}\" in region ${region.name || "unnamed"}.`,
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
              error: `Missing required roles for profile \"${profile}\": ${missingRoles.join(", ")}`,
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

    // Create UsableAsset records in batch transaction
    const createdAssets = await prisma.$transaction(
      regions.map((r: SlicedRegionInput) => {
        const regionProfileCandidate =
          typeof r.importProfile === "string" && r.importProfile.trim()
            ? r.importProfile.trim().toLowerCase()
            : fallbackProfile;
        const profile =
          regionProfileCandidate && isValidAssetImportProfile(regionProfileCandidate)
            ? regionProfileCandidate
            : null;
        const slotRole = profile ? r.slotRole?.trim() || getDefaultSlotRole(profile) : null;
        const assetName = r.name || `${sourceAsset.filename}_slice_${r.sourceRegion.x}_${r.sourceRegion.y}`;
        const inferredType = profile ? inferTypeForProfile(profile) : null;
        const assetType = (r.type || inferredType || "CHARACTER").toUpperCase();
        const inferredCategory = slotRole ? inferCategoryForRole(slotRole) : null;
        const tagsJson = JSON.stringify(
          Array.from(
            new Set(
              [
                ...(r.tags || []),
                gameId,
                assetType.toLowerCase(),
                profile ? `profile:${profile}` : "",
                slotRole ? `role:${slotRole}` : "",
                r.animationProfile ? `anim:${r.animationProfile}` : "",
                r.bundleId ? `bundle:${r.bundleId}` : "",
                `source:${r.sourceMode || mode || "spritesheet"}`,
              ].filter(Boolean)
            )
          )
        );
        const regionJson = JSON.stringify(r.sourceRegion);

        return prisma.usableAsset.create({
          data: {
            sourceAssetId: sourceAsset.id,
            name: assetName,
            type: assetType,
            category: r.category || inferredCategory || null,
            tags: tagsJson,
            width: r.sourceRegion.w,
            height: r.sourceRegion.h,
            sourceRegion: regionJson,
            facing: r.facing || null,
            animationState: r.animationState || null,
            animationFrames: r.animationFrames || 1,
            frameDurationMs: r.frameDurationMs || 100,
            createdById: session.user.id,
            gameId,
            visibility: r.visibility || "COMMUNITY",
            moderationStatus: canModerate ? "APPROVED" : "PENDING",
            version: 1,
            cdnUrl: sourceAsset.storagePath,
            thumbnailPath: sourceAsset.storagePath,
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      count: createdAssets.length,
      assets: createdAssets,
    });
  } catch (error: any) {
    console.error("[api/assets/slice] Error creating sliced usable assets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
