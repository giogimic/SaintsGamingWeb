"use server";

import { prisma } from "@/web/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "../admin/game-admin";
import { DEFAULT_WORLD_PROFILE_ID } from "@/shared/game/worldProfiles";
import { notifyGoContentSynced } from '@/server/goMmoNotify';

export type QuestObjectiveInput = {
  stage: number;
  type: string;
  targetSlug: string;
  requiredQty: number;
  description: string;
};

export type QuestTemplateInput = {
  id?: string;
  slug: string;
  gameId?: string;
  title: string;
  description: string;
  levelReq?: number;
  isRepeatable?: boolean;
  rewards: string; // JSON string
  objectives: QuestObjectiveInput[];
};

/** Studio / public: list quests for a world profile */
export async function listQuestTemplates(gameId?: string) {
  try {
    const gid = gameId || DEFAULT_WORLD_PROFILE_ID;
    const quests = await prisma.questTemplate.findMany({
      where: { gameId: gid },
      include: { objectives: { orderBy: { stage: "asc" } } },
      orderBy: { slug: "asc" },
    });
    return { success: true as const, data: quests };
  } catch (err) {
    console.error("[listQuestTemplates]", err);
    return { success: false as const, data: [], error: "Failed to list quests" };
  }
}

/** Studio: upsert quest + replace objectives */
export async function upsertQuestTemplate(input: QuestTemplateInput) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    const gameId = input.gameId || DEFAULT_WORLD_PROFILE_ID;
    const slug = input.slug.trim();
    if (!slug || !input.title.trim()) {
      return { success: false, error: "Slug and title required" };
    }

    let rewards = input.rewards;
    try {
      JSON.parse(rewards);
    } catch {
      return { success: false, error: "Rewards must be valid JSON" };
    }

    const existing = await prisma.questTemplate.findUnique({ where: { slug } });
    let questId: string;

    if (existing) {
      await prisma.questObjective.deleteMany({ where: { questId: existing.id } });
      await prisma.questTemplate.update({
        where: { id: existing.id },
        data: {
          gameId,
          title: input.title.trim(),
          description: input.description || "",
          levelReq: input.levelReq ?? 1,
          isRepeatable: input.isRepeatable ?? false,
          rewards,
        },
      });
      questId = existing.id;
    } else {
      const created = await prisma.questTemplate.create({
        data: {
          slug,
          gameId,
          title: input.title.trim(),
          description: input.description || "",
          levelReq: input.levelReq ?? 1,
          isRepeatable: input.isRepeatable ?? false,
          rewards,
        },
      });
      questId = created.id;
    }

    for (const obj of input.objectives) {
      await prisma.questObjective.create({
        data: {
          questId,
          stage: obj.stage,
          type: obj.type,
          targetSlug: obj.targetSlug,
          requiredQty: obj.requiredQty || 1,
          description: obj.description || "",
        },
      });
    }
    revalidatePath("/lobby");
    notifyGoContentSynced({ type: 'quest', id: slug });
    return { success: true, id: questId };
  } catch (err) {
    console.error("[upsertQuestTemplate]", err);
    return { success: false, error: "Failed to save quest" };
  }
}

export async function deleteQuestTemplate(slug: string) {
  const isAdmin = await checkAdminPermission();
  if (!isAdmin) return { success: false, error: "Unauthorized" };

  try {
    await prisma.questTemplate.delete({ where: { slug } });
    notifyGoContentSynced({ type: 'quest', id: slug });
    return { success: true };
  } catch (err) {
    console.error("[deleteQuestTemplate]", err);
    return { success: false, error: "Failed to delete quest" };
  }
}
