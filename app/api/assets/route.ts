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
    const showInCharacterCreationParam = searchParams.get("showInCharacterCreation");
    const showInCharacterCreation = showInCharacterCreationParam === "true";
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
      source: { not: "" },
    };

    if (type && type !== "ALL") {
      const normalizedType = type.toUpperCase();
      if (normalizedType === "CHARACTER" || normalizedType === "SPRITE") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "CHARACTER" },
              { type: "SPRITE" },
              { type: "sprite" },
              { categories: { contains: "character" } },
              { categories: { contains: "npcs" } },
              { tags: { contains: "profile:character" } },
              { tags: { contains: "character" } },
              { source: { contains: "/npc/" } },
              { source: { contains: "/player/" } },
            ],
          },
        ];
      } else if (normalizedType === "CREATURE" || normalizedType === "MONSTER") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "CREATURE" },
              { type: "MONSTER" },
              { type: "monster" },
              { categories: { contains: "monster" } },
              { tags: { contains: "monster" } },
              { tags: { contains: "creature" } },
              { source: { contains: "/monster/" } },
              { source: { contains: "/creatures/" } },
              { source: { contains: "/world-monsters/" } },
            ],
          },
        ];
      } else if (normalizedType === "TILE" || normalizedType === "TILESET") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "TILE" },
              { type: "TILESET" },
              { type: "tileset" },
              { categories: { contains: "tilesets" } },
              { tags: { contains: "tileset" } },
              { source: { contains: "/tilesets/" } },
              { source: { contains: "/terrain/" } },
            ],
          },
        ];
      } else if (normalizedType === "ITEM" || normalizedType === "ITEM_ICON" || normalizedType === "OBJECT") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "ITEM" },
              { type: "ITEM_ICON" },
              { type: "item" },
              { type: "OBJECT" },
              { type: "object" },
              { categories: { contains: "items" } },
              { tags: { contains: "item" } },
              { source: { contains: "/items/" } },
              { source: { contains: "/objects/" } },
            ],
          },
        ];
      } else if (normalizedType === "AUDIO") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "AUDIO" },
              { type: "audio" },
              { source: { contains: "/audio/" } },
              { source: { contains: "/sounds/" } },
              { source: { contains: "/music/" } },
            ],
          },
        ];
      } else if (normalizedType === "UI" || normalizedType === "UI_ELEMENT") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { type: "UI" },
              { type: "UI_ELEMENT" },
              { type: "ui" },
              { source: { contains: "/ui/" } },
            ],
          },
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

    if (showInCharacterCreation) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: '"showInCharacterCreation":true' } },
            { metadata: { contains: '"showInCharacterCreation": true' } },
            { metadata: { contains: '"isPlayable":true' } },
            { metadata: { contains: '"isPlayable": true' } },
            { tags: { contains: 'playable' } },
            { tags: { contains: 'character_creator' } },
            { tags: { contains: 'player' } },
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

    if (pack && pack !== "ALL") {
      const p = pack.toLowerCase();
      if (p === "tuxemon") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"tuxemon"' } },
              { tags: { contains: "tuxemon" } },
              { source: { contains: "tuxemon" } },
              { source: { contains: "/monster/" } },
              { source: { contains: "/creatures/" } },
              { source: { contains: "/world-monsters/" } },
              { source: { contains: "/tilesets/" } },
            ],
          },
        ];
      } else if (p === "lpc") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"lpc"' } },
              { tags: { contains: "lpc" } },
              { categories: { contains: "lpc" } },
              { source: { contains: "lpc" } },
              { source: { contains: "/npc/" } },
              { source: { contains: "female" } },
              { source: { contains: "male" } },
            ],
          },
        ];
      } else if (p === "saints") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"saints"' } },
              { tags: { contains: "saints" } },
              { source: { contains: "saints" } },
              { source: { contains: "/packs/" } },
              { source: { contains: "george" } },
            ],
          },
        ];
      } else if (p === "studio") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"studio"' } },
              { tags: { contains: "studio" } },
              { source: { contains: "atlases" } },
              { source: { contains: "daemon_" } },
            ],
          },
        ];
      } else {
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
