import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeJsonArray(value: string | null): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeJsonObject(value: string | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatAsset(asset: any) {
  return {
    ...asset,
    tags: normalizeJsonArray(asset.tags),
    categories: normalizeJsonArray(asset.categories),
    metadata: normalizeJsonObject(asset.metadata),
    atlasFrame: asset.atlasFrame ? normalizeJsonObject(asset.atlasFrame) : null,
    customLabels: asset.customLabels ? normalizeJsonObject(asset.customLabels) : null,
  };
}

/**
 * GET /api/assets — Browse usable asset catalog
 * Query params:
 *  - type: string (e.g. "CHARACTER", "OBJECT", "TILE", "AUDIO", "ALL")
 *  - gameId: string
 *  - search: string
 *  - category: string
 *  - limit: number (default 50)
 *  - offset: number (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const gameId = searchParams.get("gameId");
    const query = (searchParams.get("query") || searchParams.get("search") || "").trim();
    const pack = (searchParams.get("pack") || "").trim();
    const modularParam = searchParams.get("modular");
    const modular = modularParam === "true";
    const modularExplicitFalse = modularParam === "false";
    const componentCategory = (searchParams.get("componentCategory") || "").trim();
    const componentLayer = (searchParams.get("componentLayer") || "").trim();
    const variantFamily = (searchParams.get("variantFamily") || "").trim();
    const sortBy = (searchParams.get("sortBy") || "source").trim();
    const sortOrder = (searchParams.get("sortOrder") || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const tags = (searchParams.get("tags") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const categories = (searchParams.get("categories") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const pageParam = Number(searchParams.get("page"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offsetParam = Number(searchParams.get("offset"));
    const page = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
    const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : page * limit;

    const whereClause: any = {
      isActive: true,
    };

    if (type && type !== "ALL") {
      const normalizedType = type.toUpperCase();
      // CHARACTER and SPRITE are interchangeable aliases — query for both
      if (normalizedType === "CHARACTER" || normalizedType === "SPRITE") {
        whereClause.OR = [
          ...(whereClause.OR || []),
          { type: "CHARACTER" },
          { type: "SPRITE" },
          { tags: { contains: "profile:character" } },
        ];
      } else {
        whereClause.type = normalizedType;
      }
    }

    if (gameId) {
      whereClause.OR = [
        { gameId },
        { gameId: null },
      ];
    }

    if (query) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { source: { contains: query } },
            { type: { contains: query } },
            { tags: { contains: query } },
            { categories: { contains: query } },
          ],
        },
      ];
    }

    if (modular) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: `"isModularComponent":true` } },
            { tags: { contains: `"modular"` } },
          ],
        },
      ];
    }

    if (modularExplicitFalse) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { not: { contains: `"isModularComponent":true` } } },
            { tags: { not: { contains: `"modular"` } } },
          ],
        },
      ];
    }

    if (componentCategory) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: `"componentCategory":"${componentCategory.toLowerCase()}"` } },
            { categories: { contains: `"${componentCategory.toLowerCase()}"` } },
            { tags: { contains: `"component:${componentCategory.toLowerCase()}"` } },
          ],
        },
      ];
    }

    if (componentLayer) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: `"componentLayer":"${componentLayer.toLowerCase()}"` } },
            { tags: { contains: `"layer:${componentLayer.toLowerCase()}"` } },
          ],
        },
      ];
    }

    if (variantFamily) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: `"variantFamily":"${variantFamily}"` } },
            { tags: { contains: `"variant:${variantFamily.toLowerCase()}"` } },
          ],
        },
      ];
    }

    if (tags.length) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        ...tags.map((tag) => ({ tags: { contains: `\"${tag}\"` } })),
      ];
    }

    if (categories.length) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        ...categories.map((cat) => ({ categories: { contains: `\"${cat}\"` } })),
      ];
    }

    if (pack) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: `\"pack\":\"${pack}\"` } },
            { source: { contains: `/game-assets/${pack}/` } },
            { source: { contains: `/${pack}/` } },
          ],
        },
      ];
    }

    const allowedSort: Record<string, string> = {
      source: "source",
      createdAt: "createdAt",
      fileSize: "fileSize",
      usageCount: "usageCount",
    };
    const sortField = allowedSort[sortBy] || "source";

    const [assets, total] = await Promise.all([
      prisma.gameAsset.findMany({
        where: whereClause,
        orderBy: { [sortField]: sortOrder },
        take: limit,
        skip: offset,
      }),
      prisma.gameAsset.count({ where: whereClause }),
    ]);

    const items = assets.map((asset) => formatAsset(asset));
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      // Canonical payload for AssetManager
      items,
      total,
      page,
      limit,
      hasMore,
      // Backward-compat payload for older callers
      assets: items,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error("[api/assets] Failed to query assets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assets catalog." },
      { status: 500 }
    );
  }
}
