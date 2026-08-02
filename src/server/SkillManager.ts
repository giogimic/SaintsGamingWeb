import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";
import {
  calculateCombatLevelFromXp,
  isCombatSkillTyping,
  normalizeSkillSlug,
} from "@/shared/game/skillTypings";

const prisma = new PrismaClient();

/** Gathering / artisan OSRS-style curve (legacy, max 99). */
export function calculateGatheringLevelFromXp(xp: number): number {
  let level = 1;
  let requiredXp = 0;

  for (let i = 1; i < 99; i++) {
    requiredXp += Math.floor(i + 300 * Math.pow(2, i / 7)) / 4;
    if (xp >= requiredXp) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 99);
}

/** @deprecated use calculateGatheringLevelFromXp or calculateCombatLevelFromXp */
export function calculateLevelFromXp(xp: number): number {
  return calculateGatheringLevelFromXp(xp);
}

export function calculateLevelForSkill(skillSlug: string, xp: number): number {
  const slug = normalizeSkillSlug(skillSlug);
  if (isCombatSkillTyping(slug)) {
    return calculateCombatLevelFromXp(xp);
  }
  return calculateGatheringLevelFromXp(xp);
}

export class SkillManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("grantSkillXp", (data) => this.handleGrantXp(data));
  }

  public async initialize() {
    console.log("[SkillManager] Initialized Progression Engine");
  }

  private async handleGrantXp({
    accountId,
    skillSlug,
    amount,
  }: {
    accountId: string;
    skillSlug: string;
    amount: number;
  }) {
    if (!accountId || !skillSlug || amount <= 0) return;

    const slug = normalizeSkillSlug(skillSlug);

    try {
      // Socket auth may pass Account.id or User.id depending on join path
      let userId: string | null = null;
      const asAccount = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true },
      });
      if (asAccount?.userId) userId = asAccount.userId;
      else {
        const asUser = await prisma.user.findFirst({
          where: { id: accountId },
          select: { id: true },
        });
        userId = asUser?.id ?? null;
      }
      if (!userId) return;

      let skill = await prisma.playerSkill.findUnique({
        where: { userId_skillSlug: { userId, skillSlug: slug } },
      });

      if (!skill) {
        skill = await prisma.playerSkill.create({
          data: { userId, skillSlug: slug, xp: 0, level: 1 },
        });
      }

      const newXp = skill.xp + amount;
      const newLevel = calculateLevelForSkill(slug, newXp);
      const levelUp = newLevel > skill.level;

      await prisma.playerSkill.update({
        where: { id: skill.id },
        data: { xp: newXp, level: newLevel },
      });

      const socketId = this.engine.getSocketIdForAccount(accountId);

      this.engine.events.emit("directMessage", {
        socketId,
        event: "skill_xp_gained",
        data: { skillSlug: slug, xpGained: amount, totalXp: newXp, level: newLevel, levelUp },
      });

      if (levelUp) {
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: `Congratulations! Your ${slug} level is now ${newLevel}!` },
        });
        console.log(`[SkillManager] ${accountId} leveled up ${slug} to ${newLevel}`);
      }
    } catch (e) {
      console.error("[SkillManager] Failed to grant XP:", e);
    }
  }
}
