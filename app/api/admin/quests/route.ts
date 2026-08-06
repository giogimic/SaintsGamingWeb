import { NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { z } from "zod";

const questObjectiveSchema = z.object({
  stage: z.number(),
  type: z.string(), // e.g. "KILL", "TALK"
  targetSlug: z.string(),
  requiredQty: z.number().default(1),
  description: z.string(),
});

const questPayloadSchema = z.object({
  quest: z.object({
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    levelReq: z.number().default(1),
    rewards: z.string().default("{}"), // JSON string
    objectives: z.array(questObjectiveSchema),
  }),
  dialogueTree: z.object({
    npcId: z.string(),
    name: z.string(),
    data: z.any(), // Array of nodes, will be stringified
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const internalSecret = process.env.SAINTS_INTERNAL_SECRET || process.env.AUTH_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${internalSecret}`) {
      return NextResponse.json({ message: "Unauthorized. Invalid Bearer token." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = questPayloadSchema.parse(body);

    // 1. Upsert Quest Template
    const questData = parsed.quest;
    const qt = await prisma.questTemplate.upsert({
      where: { slug: questData.slug },
      update: {
        title: questData.title,
        description: questData.description,
        levelReq: questData.levelReq,
        rewards: questData.rewards,
      },
      create: {
        slug: questData.slug,
        title: questData.title,
        description: questData.description,
        levelReq: questData.levelReq,
        rewards: questData.rewards,
      },
    });

    // 2. Upsert Quest Objectives
    await prisma.questObjective.deleteMany({
      where: { questId: qt.id },
    });
    for (const obj of questData.objectives) {
      await prisma.questObjective.create({
        data: {
          questId: qt.id,
          stage: obj.stage,
          type: obj.type,
          targetSlug: obj.targetSlug,
          requiredQty: obj.requiredQty,
          description: obj.description,
        },
      });
    }

    // 3. Upsert NPC Dialogue Tree
    if (parsed.dialogueTree) {
      const dialogueData = parsed.dialogueTree;
      await prisma.npcDialogueTree.upsert({
        where: { npcId: dialogueData.npcId },
        update: {
          name: dialogueData.name,
          data: JSON.stringify(dialogueData.data),
        },
        create: {
          npcId: dialogueData.npcId,
          name: dialogueData.name,
          data: JSON.stringify(dialogueData.data),
        },
      });
    }

    return NextResponse.json({ message: "Quest and Dialogue Tree successfully imported!" });
  } catch (error: any) {
    console.error("Quest Import Error:", error);
    return NextResponse.json({ message: "Import failed", error: error.message }, { status: 400 });
  }
}
