import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const activeStates = await prisma.playerQuestState.findMany({
      where: { userId: session.user.id, status: "ACTIVE" }
    });

    if (activeStates.length === 0) {
      return NextResponse.json({ quests: [] });
    }

    // Join with template and current objective
    const quests = await Promise.all(activeStates.map(async (state: any) => {
      const template = await prisma.questTemplate.findUnique({
        where: { slug: state.questSlug },
        include: {
          objectives: {
            where: { stage: state.currentStage }
          }
        }
      });
      
      return {
        id: state.id,
        slug: state.questSlug,
        title: template?.title || "Unknown Quest",
        description: template?.description || "",
        stage: state.currentStage,
        progress: state.progress,
        objective: template?.objectives[0] || null
      };
    }));

    return NextResponse.json({ quests });
  } catch (e) {
    console.error("[Active Quests API]", e);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
