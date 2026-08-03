import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

/**
 * POST /api/npc-dialogue — upsert a one-node dialogue tree for an NPC (Developer+).
 * Used by Studio NpcEditorPanel when placing NPCs with opening text.
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
    if (!user || user.permissionLevel < PERMISSION_LEVELS.DEVELOPER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const npcId = String(body?.npcId || "").trim();
    const name = String(body?.name || npcId).trim();
    const text = String(body?.text || "").trim();
    if (!npcId || !text) {
      return NextResponse.json({ error: "npcId and text required" }, { status: 400 });
    }

    const tree = {
      node_start: {
        text,
        options: [{ label: "Goodbye.", nextNode: "exit" }],
      },
    };

    const row = await prisma.npcDialogueTree.upsert({
      where: { npcId },
      create: {
        npcId,
        name,
        data: JSON.stringify(tree),
      },
      update: {
        name,
        data: JSON.stringify(tree),
      },
    });

    return NextResponse.json({ success: true, npcId: row.npcId });
  } catch (error) {
    console.error("Failed to upsert npc dialogue:", error);
    return NextResponse.json({ error: "Failed to save dialogue" }, { status: 500 });
  }
}
