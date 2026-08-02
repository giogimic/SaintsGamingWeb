"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "./game-admin";
import { invalidateDialogueCache } from "@/server/dialogueCache";

export type DialogueOptionInput = {
  label: string;
  nextNode: string;
  action?: string;
  questSlug?: string;
};

export type DialogueNodeInput = {
  id: string;
  text: string;
  options: DialogueOptionInput[];
};

/** List dialogue trees (optionally filter by npcId substring). */
export async function listNpcDialogueTrees(q?: string) {
  try {
    const rows = await prisma.npcDialogueTree.findMany({
      orderBy: { npcId: "asc" },
      take: 200,
      select: { npcId: true, name: true, updatedAt: true },
    });
    const needle = (q || "").trim().toLowerCase();
    const data = needle
      ? rows.filter(
          (r) =>
            r.npcId.toLowerCase().includes(needle) ||
            r.name.toLowerCase().includes(needle)
        )
      : rows;
    return { success: true as const, data };
  } catch (err) {
    console.error("[listNpcDialogueTrees]", err);
    return { success: false as const, data: [], error: "Failed to list dialogues" };
  }
}

export async function getNpcDialogueTree(npcId: string) {
  try {
    const row = await prisma.npcDialogueTree.findUnique({ where: { npcId } });
    if (!row) return { success: false as const, error: "Not found" };
    let tree: Record<string, unknown> = {};
    try {
      tree = JSON.parse(row.data || "{}");
    } catch {
      tree = {};
    }
    return {
      success: true as const,
      data: { npcId: row.npcId, name: row.name, tree, raw: row.data },
    };
  } catch (err) {
    console.error("[getNpcDialogueTree]", err);
    return { success: false as const, error: "Failed to load dialogue" };
  }
}

/** Upsert full tree from structured nodes or raw JSON string. */
export async function upsertNpcDialogueTree(input: {
  npcId: string;
  name: string;
  nodes?: DialogueNodeInput[];
  rawJson?: string;
}) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  const npcId = input.npcId.trim();
  if (!npcId) return { success: false, error: "npcId required" };

  try {
    let dataStr: string;
    if (input.rawJson != null && input.rawJson.trim()) {
      try {
        JSON.parse(input.rawJson);
      } catch {
        return { success: false, error: "Invalid JSON" };
      }
      dataStr = input.rawJson;
    } else if (input.nodes) {
      const tree: Record<string, { text: string; options: DialogueOptionInput[] }> =
        {};
      for (const n of input.nodes) {
        const id = n.id.trim();
        if (!id) continue;
        tree[id] = {
          text: n.text || "",
          options: (n.options || []).map((o) => {
            const opt: DialogueOptionInput = {
              label: o.label || "…",
              nextNode: o.nextNode || "exit",
            };
            if (o.action) opt.action = o.action;
            if (o.questSlug) opt.questSlug = o.questSlug;
            return opt;
          }),
        };
      }
      if (!tree.node_start) {
        return { success: false, error: "Tree must include node_start" };
      }
      dataStr = JSON.stringify(tree);
    } else {
      return { success: false, error: "Provide nodes or rawJson" };
    }

    await prisma.npcDialogueTree.upsert({
      where: { npcId },
      create: {
        npcId,
        name: input.name.trim() || npcId,
        data: dataStr,
      },
      update: {
        name: input.name.trim() || npcId,
        data: dataStr,
      },
    });

    invalidateDialogueCache(npcId);
    revalidatePath("/studio");
    revalidatePath("/lobby");
    return { success: true };
  } catch (err) {
    console.error("[upsertNpcDialogueTree]", err);
    return { success: false, error: "Failed to save dialogue" };
  }
}

export async function deleteNpcDialogueTree(npcId: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };
  try {
    await prisma.npcDialogueTree.delete({ where: { npcId } });
    invalidateDialogueCache(npcId);
    revalidatePath("/studio");
    return { success: true };
  } catch (err) {
    console.error("[deleteNpcDialogueTree]", err);
    return { success: false, error: "Failed to delete" };
  }
}
