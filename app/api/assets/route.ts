import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { formatCanonicalGameAsset } from "@/shared/game/canonicalAsset";

export const dynamic = "force-dynamic";

function formatAsset(asset: any) {
  return formatCanonicalGameAsset(asset);
}

/**
 * GET /api/assets — Browse usable asset catalog
 * Query params:
 *  - type: string (e.g. "CHARACTER", "OBJECT", "TILE", "AUDIO", "ALL")
 *  - gameId: string
 *  - search / query: string
 *  - pack: string
 *  - modular: boolean
 *  - componentCategory: string
 *  - componentLayer: string
 *  - variantFamily: string
 *  - showInCharacterCreation: boolean
 *  - tags: string (comma-separated)
 *  - categories: string (comma-separated)
 *  - limit: number (default 50)
 *  - page / offset: number
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
              { tags: { contains: "modular" } },
              { tags: { contains: "sprite-component" } },
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
            { metadata: { contains: query } },
          ],
        },
      ];
    }

    if (modular) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { contains: '"isModularComponent":true' } },
            { metadata: { contains: '"isModularComponent": true' } },
            { tags: { contains: '"modular"' } },
            { tags: { contains: '"sprite-component"' } },
            { categories: { contains: '"modular"' } },
            { metadata: { contains: '"cat":' } },
            { metadata: { contains: '"componentCategory":' } },
          ],
        },
      ];
    }

    if (modularExplicitFalse) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: [
            { metadata: { not: { contains: '"isModularComponent":true' } } },
            { tags: { not: { contains: '"modular"' } } },
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
            { metadata: { contains: `"cat":"${componentCategory.toLowerCase()}"` } },
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
            { metadata: { contains: `"layer":"${componentLayer.toLowerCase()}"` } },
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
            { metadata: { contains: `"variant":"${variantFamily}"` } },
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
            { type: "CHARACTER" },
            { tags: { contains: "profile:character" } },
          ],
        },
      ];
    }

    if (tags.length) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        ...tags.map((tag) => ({ tags: { contains: `"${tag}"` } })),
      ];
    }

    if (categories.length) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        ...categories.map((cat) => ({ categories: { contains: `"${cat}"` } })),
      ];
    }

    if (pack && pack !== "ALL") {
      const p = pack.toLowerCase();
      if (p === "creatures" || p === "tuxemon") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"tuxemon"' } },
              { metadata: { contains: '"pack":"creatures"' } },
              { tags: { contains: "tuxemon" } },
              { tags: { contains: "creatures" } },
              { source: { contains: "tuxemon" } },
              { source: { contains: "/monster/" } },
              { source: { contains: "/creatures/" } },
              { source: { contains: "/world-monsters/" } },
              { source: { contains: "/tilesets/" } },
            ],
          },
        ];
      } else if (p === "modular" || p === "lpc") {
        whereClause.AND = [
          ...(whereClause.AND || []),
          {
            OR: [
              { metadata: { contains: '"pack":"lpc"' } },
              { metadata: { contains: '"pack":"modular"' } },
              { tags: { contains: "lpc" } },
              { tags: { contains: "modular" } },
              { categories: { contains: "lpc" } },
              { categories: { contains: "modular" } },
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
              { metadata: { contains: '"pack":"studio-slice"' } },
              { metadata: { contains: '"pack":"studio-import"' } },
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
              { metadata: { contains: `\"pack\":\"${p}\"` } },
              { tags: { contains: p } },
              { source: { contains: p } },
            ],
          },
        ];
      }
    }

    const orderByClause: any = {};
    if (sortBy === "createdAt") {
      orderByClause.createdAt = sortOrder;
    } else if (sortBy === "fileSize") {
      orderByClause.fileSize = sortOrder;
    } else if (sortBy === "usageCount") {
      orderByClause.usageCount = sortOrder;
    } else {
      orderByClause.source = sortOrder;
    }

    const [total, assets] = await Promise.all([
      prisma.gameAsset.count({ where: whereClause }),
      prisma.gameAsset.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: offset,
        take: limit,
      }),
    ]);

    const formattedAssets = assets.map(formatAsset);

    return NextResponse.json({
      items: formattedAssets,
      total,
      page,
      limit,
      hasMore: offset + assets.length < total,
    });
  } catch (error: any) {
    console.error("[api/assets] GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch assets", items: [], total: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets — Register/create a new GameAsset in the catalog (Developer+)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { permissionLevel: true },
    });
    if (!user || !canWriteStudioContent(user.permissionLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      type = "TILE",
      source = "",
      name,
      metadata = {},
      tags = [],
      categories = [],
      gameId = null,
      atlasSource = null,
      atlasFrame = null,
      customLabels = null,
    } = body;

    if (!source && !atlasSource) {
      return NextResponse.json({ error: "Source or atlasSource is required" }, { status: 400 });
    }

    const metaObj = typeof metadata === "object" && metadata !== null ? { ...metadata } : {};
    if (name && !metaObj.originalName) {
      metaObj.originalName = name;
    }

    const created = await prisma.gameAsset.create({
      data: {
        type: String(type).toUpperCase(),
        source: String(source),
        gameId: gameId ? String(gameId) : null,
        atlasSource: atlasSource ? String(atlasSource) : null,
        atlasFrame: atlasFrame ? (typeof atlasFrame === "string" ? atlasFrame : JSON.stringify(atlasFrame)) : null,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === "string" ? tags : "[]",
        categories: Array.isArray(categories) ? JSON.stringify(categories) : typeof categories === "string" ? categories : "[]",
        metadata: JSON.stringify(metaObj),
        customLabels: customLabels ? (typeof customLabels === "string" ? customLabels : JSON.stringify(customLabels)) : null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      asset: formatAsset(created),
    }, { status: 201 });
  } catch (error: any) {
    console.error("[api/assets] POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to register asset" },
      { status: 500 }
    );
  }
}
