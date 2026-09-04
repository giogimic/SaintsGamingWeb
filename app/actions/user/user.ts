"use server";

import { auth } from "@/auth";
import { prisma } from "@/web/lib/prisma";

export interface UserStatusStats {
  username: string;
  coins: number;
  level: number;
  xp: number;
  achievementCount: number;
  permissionLevel: number;
}

export async function getUserStatusStats(): Promise<UserStatusStats | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const [user, achievementCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          username: true,
          coins: true,
          level: true,
          xp: true,
          permissionLevel: true,
        },
      }),
      prisma.userAchievement.count({
        where: { userId: session.user.id },
      }),
    ]);

    if (!user) return null;

    return {
      username: user.username,
      coins: user.coins ?? 500,
      level: user.level ?? 1,
      xp: user.xp ?? 0,
      achievementCount: achievementCount ?? 0,
      permissionLevel: user.permissionLevel ?? 20,
    };
  } catch (error) {
    console.error("Failed to get user status stats:", error);
    return null;
  }
}
