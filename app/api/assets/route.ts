import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

function formatAsset(raw: {
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
    ...raw,
    atlasFrame: raw.atlasFrame ? JSON.parse(raw.atlasFrame) : null,
    tags: typeof raw.tags === "string" ? JSON.parse(raw.tags || "[]") : raw.tags || [],
    categories:
      typeof raw.categories === "string" ? JSON.parse(raw.categories || "[]") : raw.categories || [],
    metadata:
      typeof raw.metadata === "string" ? JSON.parse(raw.metadata || "{}") : raw.metadata || {},
    customLabels: raw.customLabels
      ? typeof raw.customLabels === "string"
        ? JSON.parse(raw.customLabels)
        : raw.customLabels
      : null,
  };
}

/**
 * GET /api/assets — list GameAsset rows for Studio browsers (client-safe; no Prisma in browser).
 * Query: type, query, gameId, page, limit, tags (comma), categories (comma)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const query = searchParams.get("query") || undefined;
    const gameId = searchParams.get("gameId") || undefined;
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10) || 0);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
    const tags = (searchParams.get("tags") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const categories = (searchParams.get("categories") || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;
    if (gameId) where.gameId = gameId;
    if (query) where.source = { contains: query };
    // SQLite stores tags/categories as JSON strings — match via contains.
    const and: Record<string, unknown>[] = [];
    for (const t of tags) {
      and.push({ tags: { contains: `"${t}"` } });
    }
    for (const c of categories) {
      and.push({ categories: { contains: `"${c}"` } });
    }
    if (and.length) where.AND = and;

    const [rawItems, total] = await Promise.all([
      prisma.gameAsset.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.gameAsset.count({ where }),
    ]);

    const items = rawItems.map(formatAsset);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      hasMore: (page + 1) * limit < total,
    });
  } catch (error) {
    console.error("Failed to list assets:", error);
    return NextResponse.json({ error: "Failed to list assets" }, { status: 500 });
  }
}
