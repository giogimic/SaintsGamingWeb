import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";
import { PERMISSION_LEVELS } from "@/web/lib/permissions";

type DialogueOption = {
  label: string;
  nextNode: string;
  action?: string;
  questSlug?: string;
};

type DialogueNode = {
  text: string;
  options: DialogueOption[];
};

type DialogueTree = Record<string, DialogueNode>;

/**
 * POST /api/npc-dialogue — upsert NPC dialogue (Developer+).
 *
 * Body:
 * - npcId, name (required)
 * - text — opening line when creating / replacing simple tree
 * - questSlug (+ optional questLabel) — merge ACCEPT_QUEST option onto node_start
 *   (Studio Quest dock). Preserves existing tree when present.
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
    const questSlug = String(body?.questSlug || "").trim();
    const questLabel = String(body?.questLabel || "").trim();

    if (!npcId) {
      return NextResponse.json({ error: "npcId required" }, { status: 400 });
    }
    if (!text && !questSlug) {
      return NextResponse.json(
        { error: "text or questSlug required" },
        { status: 400 }
      );
    }

    if (questSlug) {
      const template = await prisma.questTemplate.findUnique({
        where: { slug: questSlug },
        select: { slug: true, title: true },
      });
      if (!template) {
        return NextResponse.json(
          { error: `Unknown quest slug: ${questSlug}` },
          { status: 404 }
        );
      }

      const existing = await prisma.npcDialogueTree.findUnique({ where: { npcId } });
      let tree: DialogueTree;
      if (existing?.data) {
        try {
          tree = JSON.parse(existing.data) as DialogueTree;
        } catch {
          tree = {
            node_start: {
              text: text || "Need a hand?",
              options: [{ label: "Goodbye.", nextNode: "exit" }],
            },
          };
        }
      } else {
        tree = {
          node_start: {
            text: text || "Need a hand?",
            options: [{ label: "Goodbye.", nextNode: "exit" }],
          },
        };
      }

      if (!tree.node_start) {
        tree.node_start = {
          text: text || "Need a hand?",
          options: [{ label: "Goodbye.", nextNode: "exit" }],
        };
      }
      if (text) {
        tree.node_start.text = text;
      }
      const options = Array.isArray(tree.node_start.options)
        ? [...tree.node_start.options]
        : [];
      const already = options.some(
        (o) => o.action === "ACCEPT_QUEST" && o.questSlug === questSlug
      );
      if (already) {
        return NextResponse.json({
          success: true,
          npcId,
          alreadyAssigned: true,
        });
      }

      const acceptNodeId = `node_accept_${questSlug.replace(/[^a-z0-9_]+/gi, "_")}`;
      options.push({
        label: questLabel || `Accept: ${template.title}`,
        nextNode: acceptNodeId,
        action: "ACCEPT_QUEST",
        questSlug,
      });
      tree.node_start.options = options;
      if (!tree[acceptNodeId]) {
        tree[acceptNodeId] = {
          text: `Quest accepted: ${template.title}. Check your tracker.`,
          options: [{ label: "On my way.", nextNode: "exit" }],
        };
      }

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

      return NextResponse.json({
        success: true,
        npcId: row.npcId,
        questSlug,
        assigned: true,
      });
    }

    // Simple one-node tree (NpcEditorPanel place flow)
    const tree: DialogueTree = {
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
