import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/web/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get("board") || "creatures";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    let orderByField: "creaturesOwned" | "questsCompleted" | "itemsCrafted" | "combatXpTotal" | "creditsEarned" = "creaturesOwned";

    switch (board) {
      case "quests":
        orderByField = "questsCompleted";
        break;
      case "crafts":
        orderByField = "itemsCrafted";
        break;
      case "combat":
        orderByField = "combatXpTotal";
        break;
      case "wealth":
        orderByField = "creditsEarned";
        break;
      case "creatures":
      default:
        orderByField = "creaturesOwned";
        break;
    }

    const rows = await prisma.playerStats.findMany({
      take: limit,
      orderBy: { [orderByField]: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            image: true,
            permissionLevel: true,
            role: { select: { name: true, color: true } },
          },
        },
      },
    });

    const entries = rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: row.user.displayName || row.user.username,
      image: row.user.image,
      roleName: row.user.role?.name || "Player",
      roleColor: row.user.role?.color || "text-zinc-400",
      score: row[orderByField],
      board,
    }));

    return NextResponse.json({ entries, board, count: entries.length });
  } catch (error) {
    console.error("[api/leaderboards/game] Error:", error);
    return NextResponse.json({ error: "Failed to fetch game leaderboards" }, { status: 500 });
  }
}
