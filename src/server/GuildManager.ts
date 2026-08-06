import { GameEngine } from "./GameEngine";
import { prisma } from "@/web/lib/prisma";
import { resolveUserId, addItem, removeItem } from "./inventoryService";

export class GuildManager {
  private pendingInvites = new Map<string, { guildId: string; guildName: string }>(); // targetAccountId -> { guildId, guildName }

  constructor(private engine: GameEngine) {
    this.engine.events.on("guildCreate", (data) => this.handleCreate(data));
    this.engine.events.on("guildInvite", (data) => this.handleInvite(data));
    this.engine.events.on("guildInviteAccept", (data) => this.handleAcceptInvite(data));
    this.engine.events.on("guildLeave", (data) => this.handleLeave(data));
    this.engine.events.on("guildBankDeposit", (data) => this.handleBankDeposit(data));
    this.engine.events.on("guildBankWithdraw", (data) => this.handleBankWithdraw(data));
  }

  public async initialize() {
    console.log("[GuildManager] Initialized Guild Systems");
  }

  private async handleCreate({ accountId, socketId, name, tag }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    try {
      const existing = await prisma.guildMember.findFirst({ where: { userId } });
      if (existing) {
        this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "You are already in a guild." } });
        return;
      }

      const guild = await prisma.guild.create({
        data: {
          name,
          tag,
          leaderId: userId,
          members: {
            create: { userId, rank: "LEADER" }
          }
        }
      });

      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: `Guild [${guild.tag}] created!` } });
    } catch (e) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Guild name or tag already exists." } });
    }
  }

  private async handleInvite({ accountId, socketId, targetName }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const membership = await prisma.guildMember.findFirst({ where: { userId }, include: { guild: true } });
    if (!membership || (membership.rank !== "LEADER" && membership.rank !== "OFFICER")) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "You don't have invite permissions." } });
      return;
    }

    let targetUserId: string | null = null;
    let targetSocketId: string | null = null;
    let targetAccountId: string | null = null;

    this.engine.events.emit("requestPlayersInMap", {
      mapId: undefined,
      callback: (players: any[]) => {
        const hit = players.find(p => p.name?.toLowerCase() === targetName.toLowerCase() || p.accountId === targetName);
        if (hit) {
          targetAccountId = hit.accountId;
          targetSocketId = hit.socketId;
        }
      }
    });

    if (!targetAccountId || !targetSocketId) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Target not found online." } });
      return;
    }

    targetUserId = await resolveUserId(targetAccountId);
    if (!targetUserId) return;

    const targetMembership = await prisma.guildMember.findFirst({ where: { userId: targetUserId } });
    if (targetMembership) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Target is already in a guild." } });
      return;
    }

    this.pendingInvites.set(targetAccountId, { guildId: membership.guildId, guildName: membership.guild.name });
    
    this.engine.events.emit("directMessage", { socketId: targetSocketId, event: "show_toast", data: { message: `You have been invited to ${membership.guild.name}.` } });
    this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: `Invite sent to ${targetName}.` } });
  }

  private async handleAcceptInvite({ accountId, socketId }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const invite = this.pendingInvites.get(accountId);
    if (!invite) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "No pending guild invite." } });
      return;
    }

    this.pendingInvites.delete(accountId);

    await prisma.guildMember.create({
      data: {
        userId,
        guildId: invite.guildId,
        rank: "MEMBER"
      }
    });

    this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: `Joined ${invite.guildName}!` } });
  }

  private async handleLeave({ accountId, socketId }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const membership = await prisma.guildMember.findFirst({ where: { userId } });
    if (!membership) return;

    if (membership.rank === "LEADER") {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Guild leader cannot leave. Must disband or pass lead." } });
      return;
    }

    await prisma.guildMember.delete({ where: { id: membership.id } });
    this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "You left the guild." } });
  }

  private async handleBankDeposit({ accountId, socketId, itemSlug, qty }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const membership = await prisma.guildMember.findFirst({ where: { userId }, include: { guild: true } });
    if (!membership) return;

    const removed = await removeItem(userId, itemSlug, qty);
    if (!removed) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Not enough items to deposit." } });
      return;
    }

    const bank = JSON.parse(membership.guild.bankJson || "{}");
    bank[itemSlug] = (bank[itemSlug] || 0) + qty;

    await prisma.guild.update({
      where: { id: membership.guildId },
      data: { bankJson: JSON.stringify(bank) }
    });

    this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: `Deposited ${qty}x ${itemSlug}.` } });
  }

  private async handleBankWithdraw({ accountId, socketId, itemSlug, qty }: any) {
    const userId = await resolveUserId(accountId);
    if (!userId) return;

    const membership = await prisma.guildMember.findFirst({ where: { userId }, include: { guild: true } });
    if (!membership) return;

    const bank = JSON.parse(membership.guild.bankJson || "{}");
    const currentQty = bank[itemSlug] || 0;
    
    if (currentQty < qty) {
      this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: "Not enough items in guild bank." } });
      return;
    }

    bank[itemSlug] = currentQty - qty;
    if (bank[itemSlug] === 0) delete bank[itemSlug];

    await prisma.guild.update({
      where: { id: membership.guildId },
      data: { bankJson: JSON.stringify(bank) }
    });

    await addItem(userId, itemSlug, qty);
    this.engine.events.emit("directMessage", { socketId, event: "show_toast", data: { message: `Withdrew ${qty}x ${itemSlug}.` } });
  }
}
