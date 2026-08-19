import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestAsset } from "@/web/lib/assetUpload";
import { canUserModerateAssets } from "@/shared/game/assetPermissions";
import {
  AssetImportProfileId,
  getMissingRequiredRoles,
  isValidAssetImportProfile,
  isValidSlotRole,
} from "@/shared/game/assetImportProfiles";

export const dynamic = "force-dynamic";

/**
 * POST /api/assets/upload — Ingest a SourceAsset (and optional UsableAsset)
 * Multipart Form Data:
 *  - file: File (required)
 *  - gameId: string (optional, defaults to "tuxemon")
 *  - name: string (optional)
 *  - type: string (optional, e.g. "CHARACTER", "OBJECT", "TILE", "AUDIO")
 *  - category: string (optional)
 *  - tags: string (optional, JSON array or comma-separated)
 *  - createUsable: string | boolean ("true" | "false")
 *  - visibility: string ("PERSONAL" | "PROJECT" | "COMMUNITY" | "PUBLIC")
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — sign in required to upload assets." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided in form data." },
        { status: 400 }
      );
    }

    const gameId = (formData.get("gameId") as string) || "tuxemon";
    const name = formData.get("name") as string | undefined;
    const type = formData.get("type") as string | undefined;
    const category = formData.get("category") as string | undefined;
    const rawTags = formData.get("tags") as string | null;
    let tags: string[] | undefined = undefined;
    if (rawTags) {
      try {
        tags = JSON.parse(rawTags);
      } catch {
        tags = rawTags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    const createUsable = formData.get("createUsable") !== "false";
    const visibility = (formData.get("visibility") as any) || "COMMUNITY";
    const permissionLevel = Number((session.user as any).permissionLevel) || 0;
    const moderationStatus = canUserModerateAssets({ id: session.user.id, permissionLevel })
      ? "APPROVED"
      : "PENDING";
    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;
    const importProfileRaw = (formData.get("importProfile") as string | null)?.trim().toLowerCase() || "";
    const slotRoleRaw = (formData.get("slotRole") as string | null)?.trim() || "";
    const componentCategory = (formData.get("componentCategory") as string | null)?.trim() || undefined;
    const componentLayer = (formData.get("componentLayer") as string | null)?.trim() || undefined;
    const variantFamily = (formData.get("variantFamily") as string | null)?.trim() || undefined;
    const isModularComponent = formData.get("isModularComponent") === "true";
    const zOrderHintRaw = (formData.get("zOrderHint") as string | null)?.trim();
    const zOrderHint = zOrderHintRaw && !Number.isNaN(Number(zOrderHintRaw)) ? Number(zOrderHintRaw) : undefined;
    const baseBodyType = (formData.get("baseBodyType") as string | null)?.trim() || undefined;
    const hidesComponentsRaw = (formData.get("hidesComponents") as string | null)?.trim();
    let hidesComponents: string[] | undefined;
    if (hidesComponentsRaw) {
      try {
        const parsed = JSON.parse(hidesComponentsRaw);
        if (Array.isArray(parsed)) {
          hidesComponents = parsed.filter((v) => typeof v === "string");
        }
      } catch {
        hidesComponents = hidesComponentsRaw.split(",").map((v) => v.trim()).filter(Boolean);
      }
    }
    const bundleId = (formData.get("bundleId") as string | null)?.trim() || undefined;
    const sourceModeRaw = (formData.get("sourceMode") as string | null)?.trim().toLowerCase();
    const strictRequiredRoles = formData.get("strictRequiredRoles") === "true";
    const roleAssignmentsRaw = (formData.get("roleAssignments") as string | null)?.trim();

    let assignedRoles: string[] = [];
    if (slotRoleRaw) {
      assignedRoles.push(slotRoleRaw);
    }
    if (roleAssignmentsRaw) {
      try {
        const parsed = JSON.parse(roleAssignmentsRaw);
        if (Array.isArray(parsed)) {
          assignedRoles = assignedRoles.concat(
            parsed
              .map((entry) => {
                if (typeof entry === "string") {
                  return entry;
                }
                if (entry && typeof entry === "object" && typeof entry.slotRole === "string") {
                  return entry.slotRole;
                }
                return "";
              })
              .filter(Boolean)
          );
        }
      } catch {
        // Ignore malformed role assignment blobs to preserve backward compatibility.
      }
    }

    let importProfile: AssetImportProfileId | null = null;
    if (importProfileRaw) {
      if (!isValidAssetImportProfile(importProfileRaw)) {
        return NextResponse.json(
          { success: false, error: `Unsupported import profile: ${importProfileRaw}` },
          { status: 400 }
        );
      }
      importProfile = importProfileRaw;
    }

    if (importProfile && slotRoleRaw && !isValidSlotRole(importProfile, slotRoleRaw)) {
      return NextResponse.json(
        {
          success: false,
          error: `Role \"${slotRoleRaw}\" is not valid for profile \"${importProfile}\".`,
        },
        { status: 400 }
      );
    }

    if (importProfile && strictRequiredRoles) {
      const missingRoles = getMissingRequiredRoles(importProfile, assignedRoles);
      if (missingRoles.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required roles for profile \"${importProfile}\": ${missingRoles.join(", ")}`,
            missingRoles,
          },
          { status: 400 }
        );
      }
    }

    const result = await ingestAsset({
      userId: session.user.id,
      file,
      gameId,
      name,
      type,
      category,
      tags,
      createUsable,
      visibility,
      width,
      height,
      importProfile: importProfile || undefined,
      slotRole: slotRoleRaw || undefined,
      componentCategory,
      componentLayer,
      variantFamily,
      isModularComponent,
      zOrderHint,
      baseBodyType,
      hidesComponents,
      bundleId,
      moderationStatus,
      sourceMode:
        sourceModeRaw === "multi" || sourceModeRaw === "spritesheet" || sourceModeRaw === "single"
          ? sourceModeRaw
          : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to process asset upload." },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/assets/upload] Error processing asset upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
