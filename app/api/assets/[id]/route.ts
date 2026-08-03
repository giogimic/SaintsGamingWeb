import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

/**
 * PATCH /api/assets/[id] — update tags / type / categories (Developer+).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (Array.isArray(body.tags)) {
      data.tags = JSON.stringify(body.tags);
    }
    if (typeof body.type === "string" && body.type) {
      data.type = body.type;
    }
    if (Array.isArray(body.categories)) {
      data.categories = JSON.stringify(body.categories);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
    }

    const asset = await prisma.gameAsset.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        tags: JSON.parse(asset.tags || "[]"),
        categories: JSON.parse(asset.categories || "[]"),
        metadata: JSON.parse(asset.metadata || "{}"),
        atlasFrame: asset.atlasFrame ? JSON.parse(asset.atlasFrame) : null,
        customLabels: asset.customLabels ? JSON.parse(asset.customLabels) : null,
      },
    });
  } catch (error) {
    console.error("Failed to patch asset:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
