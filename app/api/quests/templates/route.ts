import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/quests/templates — list QuestTemplate + objectives for Studio Quest dock.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.questTemplate.findMany({
      include: {
        objectives: { orderBy: { stage: "asc" } },
      },
      orderBy: { title: "asc" },
    });

    const items = templates.map((t) => {
      let rewards: Record<string, unknown> = {};
      try {
        rewards = JSON.parse(t.rewards || "{}");
      } catch {
        rewards = {};
      }
      return {
        id: t.id,
        slug: t.slug,
        title: t.title,
        description: t.description,
        levelReq: t.levelReq,
        isRepeatable: t.isRepeatable,
        timeLimitMins: t.timeLimitMins,
        rewards,
        objectives: t.objectives.map((o) => ({
          id: o.id,
          stage: o.stage,
          type: o.type,
          targetSlug: o.targetSlug,
          requiredQty: o.requiredQty,
          description: o.description,
        })),
        createdAt: t.createdAt,
      };
    });

    return NextResponse.json({ success: true, items, count: items.length });
  } catch (error) {
    console.error("Failed to list quest templates:", error);
    return NextResponse.json({ error: "Failed to list quests" }, { status: 500 });
  }
}
