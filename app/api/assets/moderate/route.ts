import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canUserModerateAssets } from "@/shared/game/assetPermissions";
import { AuditService } from "@/server/audit/AuditService";


export const dynamic = "force-dynamic";

/**
 * POST /api/assets/moderate — Approve, reject, or adjust visibility of an asset
 * Requires permissionLevel >= 200 (MOD or higher)
 * Body: {
 *   assetId: string;
 *   status?: "APPROVED" | "REJECTED" | "PENDING";
 *   visibility?: "PERSONAL" | "PROJECT" | "COMMUNITY" | "PUBLIC";
 *   rejectionReason?: string;
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in." },
        { status: 401 }
      );
    }

    const permissionLevel = Number((session.user as any).permissionLevel) || 0;
    if (!canUserModerateAssets({ id: session.user.id, permissionLevel })) {
      return NextResponse.json(
        { success: false, error: "Forbidden — Moderator permission required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { assetId, status, visibility } = body;

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "Missing assetId in request body." },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (status) updateData.moderationStatus = status;
    if (visibility) updateData.visibility = visibility;

    // Security compliance audit record prior to DB write
    await AuditService.write({
      userId: session.user.id,
      action: "asset.moderate",
      resource: { type: "asset", id: assetId },
      after: updateData,
    });

    const updatedAsset = await prisma.usableAsset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });


    return NextResponse.json({
      success: true,
      asset: updatedAsset,
    });
  } catch (error: any) {
    console.error("[api/assets/moderate] Error updating asset moderation:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
