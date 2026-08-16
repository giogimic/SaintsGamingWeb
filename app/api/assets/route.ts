import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = "force-dynamic";

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
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const whereClause: any = {
      isActive: true,
    };

    if (type && type !== "ALL") {
      whereClause.type = type.toUpperCase();
    }

    if (gameId) {
      whereClause.OR = [
        { gameId },
        { gameId: null },
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    if (search && search.trim()) {
      whereClause.name = {
        contains: search.trim(),
      };
    }

    const [assets, total] = await Promise.all([
      prisma.usableAsset.findMany({
        where: whereClause,
        include: {
          sourceAsset: {
            select: {
              id: true,
              filename: true,
              storagePath: true,
              width: true,
              height: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.usableAsset.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      assets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
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
