import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

function formatAsset(asset: {
  id: string;
  gameId: string | null;
  type: string;
  source: string;
  atlasSource: string | null;
  atlasFrame: string | null;
  tags: string;
  categories: string;
  metadata: string;
  customLabels: string | null;
  isActive: boolean;
  usageCount: number;
  fileSize: number;
  cdnUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...asset,
    tags: JSON.parse(asset.tags || "[]"),
    categories: JSON.parse(asset.categories || "[]"),
    metadata: JSON.parse(asset.metadata || "{}"),
    atlasFrame: asset.atlasFrame ? JSON.parse(asset.atlasFrame) : null,
    customLabels: asset.customLabels ? JSON.parse(asset.customLabels) : null,
  };
}

/**
 * GET /api/assets/[id] — fetch one GameAsset (Studio AssetManager.getAsset).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await prisma.gameAsset.findUnique({ where: { id } });
    if (!asset || !asset.isActive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ asset: formatAsset(asset) });
  } catch (error) {
    console.error("Failed to get asset:", error);
    return NextResponse.json({ error: "Failed to get asset" }, { status: 500 });
  }
}

/**
 * PATCH /api/assets/[id] — update tags / type / categories / metadata (Developer+).
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
    if (body.metadata && typeof body.metadata === "object") {
      const existing = await prisma.gameAsset.findUnique({
        where: { id },
        select: { metadata: true },
      });
      let prev: Record<string, unknown> = {};
      try {
        prev = JSON.parse(existing?.metadata || "{}");
      } catch {
        prev = {};
      }
      data.metadata = JSON.stringify({ ...prev, ...body.metadata });
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
      asset: formatAsset(asset),
    });
  } catch (error) {
    console.error("Failed to patch asset:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
