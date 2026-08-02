import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";
import { SPYDER_QUEST_CHAIN } from "@/server/spyderQuests";

const SPYDER_FINAL_SLUG = "quest_spyder_leather_scoop";
const SPYDER_SLUGS = SPYDER_QUEST_CHAIN.map((q) => q.slug);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [activeStates, completedSpyder] = await Promise.all([
      prisma.playerQuestState.findMany({
        where: { userId, status: "ACTIVE" },
      }),
      prisma.playerQuestState.findMany({
        where: {
          userId,
          status: "COMPLETED",
          questSlug: { in: [...SPYDER_SLUGS] },
        },
        select: { questSlug: true },
      }),
    ]);

    const completedSlugs = completedSpyder.map((r) => r.questSlug);
    const spyderCampaignComplete = completedSlugs.includes(SPYDER_FINAL_SLUG);

    // Join with template and current objective
    const quests = await Promise.all(
      activeStates.map(async (state: { id: string; questSlug: string; currentStage: number; progress: number }) => {
        const template = await prisma.questTemplate.findUnique({
          where: { slug: state.questSlug },
          include: {
            objectives: {
              where: { stage: state.currentStage },
            },
          },
        });

        return {
          id: state.id,
          slug: state.questSlug,
          title: template?.title || "Unknown Quest",
          description: template?.description || "",
          stage: state.currentStage,
          progress: state.progress,
          objective: template?.objectives[0] || null,
        };
      })
    );

    return NextResponse.json({
      quests,
      completedSlugs,
      spyderCampaignComplete,
    });
  } catch (e) {
    console.error("[Active Quests API]", e);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
