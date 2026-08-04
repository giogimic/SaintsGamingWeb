import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { normalizeDropEntry, type LootDropEntry } from "@/shared/game/lootRefs";
import { DEFAULT_WORLD_PROFILE_ID } from "@/shared/game/worldProfiles";

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function serializeTable(row: {
  id: string;
  gameId: string;
  name: string;
  description: string | null;
  entries: string;
  rollsPerDrop: number;
  guaranteedDrops: string;
  minLevel: number | null;
  maxLevel: number | null;
  requiredTags: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const rawEntries = parseJsonArray<unknown>(row.entries, []);
  const rawGuaranteed = parseJsonArray<unknown>(row.guaranteedDrops, []);
  const entries = rawEntries
    .map((d) => normalizeDropEntry(d))
    .filter((d): d is LootDropEntry => d !== null);
  const guaranteedDrops = rawGuaranteed
    .map((d) => normalizeDropEntry(d))
    .filter((d): d is LootDropEntry => d !== null);

  return {
    id: row.id,
    gameId: row.gameId,
    name: row.name,
    description: row.description,
    entries,
    rollsPerDrop: row.rollsPerDrop,
    guaranteedDrops,
    minLevel: row.minLevel,
    maxLevel: row.maxLevel,
    requiredTags: parseJsonArray<string>(row.requiredTags, []),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * GET /api/loot/tables?gameId= — list loot pools for a world profile (Studio Loot Manager).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gameId =
      request.nextUrl.searchParams.get("gameId")?.trim() || DEFAULT_WORLD_PROFILE_ID;

    const rows = await prisma.lootTable.findMany({
      where: { gameId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      items: rows.map(serializeTable),
      count: rows.length,
    });
  } catch (error) {
    console.error("Failed to list loot tables:", error);
    return NextResponse.json({ error: "Failed to list loot tables" }, { status: 500 });
  }
}

/**
 * POST /api/loot/tables — create a loot pool (Admin+ Studio write).
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const gameId =
      typeof body.gameId === "string" && body.gameId.trim()
        ? body.gameId.trim()
        : DEFAULT_WORLD_PROFILE_ID;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const entries = Array.isArray(body.entries) ? body.entries : [];
    const guaranteedDrops = Array.isArray(body.guaranteedDrops) ? body.guaranteedDrops : [];
    const requiredTags = Array.isArray(body.requiredTags) ? body.requiredTags : [];

    const row = await prisma.lootTable.create({
      data: {
        gameId,
        name,
        description: typeof body.description === "string" ? body.description : null,
        entries: JSON.stringify(entries),
        rollsPerDrop: Number(body.rollsPerDrop) > 0 ? Number(body.rollsPerDrop) : 1,
        guaranteedDrops: JSON.stringify(guaranteedDrops),
        minLevel: body.minLevel != null ? Number(body.minLevel) : null,
        maxLevel: body.maxLevel != null ? Number(body.maxLevel) : null,
        requiredTags: JSON.stringify(requiredTags),
      },
    });

    return NextResponse.json({ success: true, item: serializeTable(row) }, { status: 201 });
  } catch (error) {
    console.error("Failed to create loot table:", error);
    return NextResponse.json({ error: "Failed to create loot table" }, { status: 500 });
  }
}
