import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { canWriteStudioContent } from "@/shared/game/studioPermissions";
import { normalizeDropEntry, type LootDropEntry } from "@/shared/game/lootRefs";
import { AuditService } from "@/server/audit/AuditService";


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
  const entries = parseJsonArray<unknown>(row.entries, [])
    .map((d) => normalizeDropEntry(d))
    .filter((d): d is LootDropEntry => d !== null);
  const guaranteedDrops = parseJsonArray<unknown>(row.guaranteedDrops, [])
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

async function requireStudioWriter() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { permissionLevel: true },
  });
  if (!user || !canWriteStudioContent(user.permissionLevel)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

/**
 * PATCH /api/loot/tables/[id] — update a loot pool.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStudioWriter();
    if ("error" in gate && gate.error) return gate.error;

    const { id } = await params;
    const existing = await prisma.lootTable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.description === "string" || body.description === null) {
      data.description = body.description;
    }
    if (Array.isArray(body.entries)) data.entries = JSON.stringify(body.entries);
    if (Array.isArray(body.guaranteedDrops)) {
      data.guaranteedDrops = JSON.stringify(body.guaranteedDrops);
    }
    if (body.rollsPerDrop !== undefined) {
      data.rollsPerDrop = Number(body.rollsPerDrop) > 0 ? Number(body.rollsPerDrop) : 1;
    }
    if (body.minLevel !== undefined) {
      data.minLevel = body.minLevel == null ? null : Number(body.minLevel);
    }
    if (body.maxLevel !== undefined) {
      data.maxLevel = body.maxLevel == null ? null : Number(body.maxLevel);
    }
    if (Array.isArray(body.requiredTags)) {
      data.requiredTags = JSON.stringify(body.requiredTags);
    }

    // Security compliance audit record prior to DB write

    await AuditService.write({
      userId: ("session" in gate && gate.session?.user?.id) ? gate.session.user.id : "system",
      action: "loot.update",
      resource: { type: "loot", id },
      before: existing,
      after: data,
    });

    const row = await prisma.lootTable.update({ where: { id }, data });
    return NextResponse.json({ success: true, item: serializeTable(row) });
  } catch (error) {
    console.error("Failed to update loot table:", error);
    return NextResponse.json({ error: "Failed to update loot table" }, { status: 500 });
  }
}

/**
 * DELETE /api/loot/tables/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireStudioWriter();
    if ("error" in gate && gate.error) return gate.error;

    const { id } = await params;
    const existing = await prisma.lootTable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Security compliance audit record prior to DB write
    await AuditService.write({
      userId: ("session" in gate && gate.session?.user?.id) ? gate.session.user.id : "system",
      action: "loot.delete",
      resource: { type: "loot", id },
      before: existing,
    });

    await prisma.lootTable.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete loot table:", error);
    return NextResponse.json({ error: "Failed to delete loot table" }, { status: 500 });
  }
}

