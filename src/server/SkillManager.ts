import { GameEngine } from "./GameEngine";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The universal Saints XP curve formula
// For example, level 2 requires 100 XP, scaling non-linearly to 99.
export function calculateLevelFromXp(xp: number): number {
  let level = 1;
  let requiredXp = 0;
  
  for (let i = 1; i < 99; i++) {
    // A standard curve similar to OSRS: L(x) = L(x-1) + floor(x + 300 * 2^(x/7)) / 4
    requiredXp += Math.floor(i + 300 * Math.pow(2, i / 7)) / 4;
    if (xp >= requiredXp) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 99);
}

export class SkillManager {
  constructor(private engine: GameEngine) {
    this.engine.events.on("grantSkillXp", (data) => this.handleGrantXp(data));
  }

  public async initialize() {
    console.log("[SkillManager] Initialized Progression Engine");
  }

  private async handleGrantXp({ accountId, skillSlug, amount }: { accountId: string, skillSlug: string, amount: number }) {
    if (!accountId || !skillSlug || amount <= 0) return;

    try {
      const dbUser = await prisma.account.findFirst({
        where: { id: accountId },
        select: { userId: true }
      });
      if (!dbUser) return;
      const userId = dbUser.userId;

      // 1. Fetch current skill state
      let skill = await prisma.playerSkill.findUnique({
        where: { userId_skillSlug: { userId, skillSlug } }
      });

      // 2. Initialize if not exists
      if (!skill) {
        skill = await prisma.playerSkill.create({
          data: { userId, skillSlug, xp: 0, level: 1 }
        });
      }

      // 3. Calculate new XP and Level
      const newXp = skill.xp + amount;
      const newLevel = calculateLevelFromXp(newXp);
      const levelUp = newLevel > skill.level;

      // 4. Save to DB
      await prisma.playerSkill.update({
        where: { id: skill.id },
        data: { xp: newXp, level: newLevel }
      });

      // 5. Notify Client
      const socketId = this.engine.getSocketIdForAccount(accountId);
      
      this.engine.events.emit("directMessage", {
        socketId,
        event: "skill_xp_gained",
        data: { skillSlug, xpGained: amount, totalXp: newXp, level: newLevel, levelUp }
      });

      if (levelUp) {
        // Send a toast specifically to this player
        this.engine.events.emit("directMessage", {
          socketId,
          event: "show_toast",
          data: { message: `Congratulations! Your ${skillSlug} level is now ${newLevel}!` }
        });
        console.log(`[SkillManager] ${accountId} leveled up ${skillSlug} to ${newLevel}`);
      }

    } catch (e) {
      console.error("[SkillManager] Failed to grant XP:", e);
    }
  }
}
