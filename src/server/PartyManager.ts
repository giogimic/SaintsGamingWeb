import { GameEngine } from "./GameEngine";
import { prisma } from "@/web/lib/prisma";

type PendingInvite = {
  fromAccountId: string;
  fromName: string;
  createdAt: number;
};

const INVITE_TTL_MS = 60_000;

export class PartyManager {
  // leaderAccountId -> Set of memberAccountIds (including leader)
  private activeParties = new Map<string, Set<string>>();
  // memberAccountId -> leaderAccountId
  private playerPartyMap = new Map<string, string>();
  // targetAccountId -> pending invite from leader
  private pendingInvites = new Map<string, PendingInvite>();

  constructor(private engine: GameEngine) {
    this.engine.events.on("playerDisconnected", ({ accountId }) => {
      this.pendingInvites.delete(accountId);
      this.leaveParty(accountId);
    });
    this.engine.events.on("partyChat", ({ accountId, message }) => {
      const senderName = this.resolveOnlineName(accountId) || "Party Member";
      this.broadcastPartyMessage(accountId, senderName, message);
    });
    this.engine.events.on("partyInvite", ({ accountId, targetName }) => {
      void this.handlePartyInvite(accountId, String(targetName || ""));
    });
    this.engine.events.on("partyInviteAccept", ({ accountId }) => {
      this.handleInviteAccept(accountId);
    });
    this.engine.events.on("partyInviteDecline", ({ accountId }) => {
      this.handleInviteDecline(accountId);
    });
    this.engine.events.on("partyJoin", ({ accountId, leaderName }) => {
      // Dev/fallback: `/p join [leaderAccountId]`
      this.createOrJoinParty(leaderName, accountId);
      this.emitSystemToAccount(accountId, `Joined party of ${leaderName}!`);
    });
    this.engine.events.on("partyLeave", ({ accountId }) => {
      this.leaveParty(accountId);
    });
  }

  private resolveOnlineName(accountId: string): string | undefined {
    let name: string | undefined;
    this.engine.events.emit("requestPlayersInMap", {
      mapId: undefined,
      callback: (players: Array<{ accountId?: string; name?: string }>) => {
        const p = players.find((x) => x.accountId === accountId);
        if (p?.name) name = p.name;
      },
    });
    return name;
  }

  private async resolveTargetAccountId(
    targetName: string
  ): Promise<{ id: string; label: string } | null> {
    const needle = targetName.toLowerCase();

    const byUsername = await prisma.user.findUnique({
      where: { username: targetName },
      select: { id: true, username: true, displayName: true },
    });
    if (byUsername) {
      return {
        id: byUsername.id,
        label: byUsername.displayName || byUsername.username,
      };
    }

    let onlineHit: { id: string; label: string } | null = null;
    this.engine.events.emit("requestPlayersInMap", {
      mapId: undefined,
      callback: (players: Array<{ accountId?: string; name?: string }>) => {
        const hit = players.find(
          (p) =>
            String(p.name || "").toLowerCase() === needle ||
            String(p.accountId || "") === targetName
        );
        if (hit?.accountId) {
          onlineHit = { id: hit.accountId, label: hit.name || targetName };
        }
      },
    });
    if (onlineHit) return onlineHit;

    const candidates = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true },
      take: 200,
    });
    const exact = candidates.find(
      (u) =>
        u.username.toLowerCase() === needle ||
        (u.displayName || "").toLowerCase() === needle
    );
    if (!exact) return null;
    return { id: exact.id, label: exact.displayName || exact.username };
  }

  private async handlePartyInvite(fromAccountId: string, targetNameRaw: string) {
    const targetName = targetNameRaw.trim();
    if (!targetName) {
      this.emitSystemToAccount(fromAccountId, "Party invite needs a username.");
      return;
    }

    const fromName = this.resolveOnlineName(fromAccountId) || "Tamer";
    const target = await this.resolveTargetAccountId(targetName);
    if (!target) {
      this.emitSystemToAccount(fromAccountId, `No player named "${targetName}" found.`);
      return;
    }

    if (target.id === fromAccountId) {
      this.emitSystemToAccount(fromAccountId, "You cannot invite yourself.");
      return;
    }

    const targetSocket = this.engine.getSocketIdForAccount(target.id);
    if (!targetSocket) {
      this.emitSystemToAccount(fromAccountId, `${target.label} is not online in the lobby.`);
      return;
    }

    this.pendingInvites.set(target.id, {
      fromAccountId,
      fromName,
      createdAt: Date.now(),
    });

    this.emitToAccount(target.id, "party_invite", {
      fromAccountId,
      fromName,
      expiresInMs: INVITE_TTL_MS,
    });
    this.emitToAccount(target.id, "show_toast", {
      message: `${fromName} invited you to a party (Y accept / N decline)`,
    });
    this.emitSystemToAccount(fromAccountId, `Party invite sent to ${target.label}.`);
  }

  private handleInviteAccept(accountId: string) {
    const pending = this.pendingInvites.get(accountId);
    if (!pending) {
      this.emitSystemToAccount(accountId, "No pending party invite.");
      return;
    }
    if (Date.now() - pending.createdAt > INVITE_TTL_MS) {
      this.pendingInvites.delete(accountId);
      this.emitSystemToAccount(accountId, "That party invite expired.");
      return;
    }
    this.pendingInvites.delete(accountId);
    this.createOrJoinParty(pending.fromAccountId, accountId);
    const joinerName = this.resolveOnlineName(accountId) || "A tamer";
    this.emitSystemToAccount(accountId, `Joined ${pending.fromName}'s party!`);
    this.emitSystemToAccount(pending.fromAccountId, `${joinerName} joined your party!`);
    this.emitToAccount(accountId, "show_toast", {
      message: `Joined ${pending.fromName}'s party`,
    });
    this.emitToAccount(pending.fromAccountId, "show_toast", {
      message: `${joinerName} joined your party`,
    });
  }

  private handleInviteDecline(accountId: string) {
    const pending = this.pendingInvites.get(accountId);
    if (!pending) return;
    this.pendingInvites.delete(accountId);
    this.emitSystemToAccount(pending.fromAccountId, "Your party invite was declined.");
    this.emitSystemToAccount(accountId, "Party invite declined.");
  }

  public getPartyLeader(accountId: string): string | undefined {
    return this.playerPartyMap.get(accountId);
  }

  public getPartyMembers(accountId: string): string[] {
    const leaderId = this.playerPartyMap.get(accountId);
    if (!leaderId) return [];
    const party = this.activeParties.get(leaderId);
    return party ? Array.from(party) : [];
  }

  public createOrJoinParty(leaderId: string, joinerId: string) {
    let party = this.activeParties.get(leaderId);
    if (!party) {
      party = new Set<string>();
      party.add(leaderId);
      this.activeParties.set(leaderId, party);
      this.playerPartyMap.set(leaderId, leaderId);
    }

    this.leaveParty(joinerId);

    party.add(joinerId);
    this.playerPartyMap.set(joinerId, leaderId);
    this.broadcastPartyUpdate(leaderId);
  }

  public leaveParty(accountId: string) {
    const leaderId = this.playerPartyMap.get(accountId);
    if (!leaderId) return;

    const party = this.activeParties.get(leaderId);
    if (!party) return;

    if (accountId === leaderId) {
      for (const member of party) {
        this.playerPartyMap.delete(member);
        this.emitToAccount(member, "party_update", { type: "DISBANDED" });
      }
      this.activeParties.delete(leaderId);
    } else {
      party.delete(accountId);
      this.playerPartyMap.delete(accountId);
      this.emitToAccount(accountId, "party_update", { type: "LEFT" });
      this.broadcastPartyUpdate(leaderId);
    }
  }

  private broadcastPartyUpdate(leaderId: string) {
    const party = this.activeParties.get(leaderId);
    if (!party) return;
    const members = Array.from(party);

    for (const member of members) {
      this.emitToAccount(member, "party_update", {
        type: "UPDATE",
        leaderId,
        members,
      });
    }
  }

  public broadcastPartyMessage(senderId: string, senderName: string, message: string) {
    const leaderId = this.playerPartyMap.get(senderId);
    if (!leaderId) return;

    const party = this.activeParties.get(leaderId);
    if (!party) return;

    for (const member of party) {
      this.emitToAccount(member, "party_chat_msg", {
        sender: senderName,
        message,
        timestamp: Date.now(),
      });
    }
  }

  private emitSystemToAccount(accountId: string, message: string) {
    this.emitToAccount(accountId, "chat_message", {
      channel: "SYSTEM",
      senderId: "SERVER",
      senderName: "Server",
      message,
      timestamp: Date.now(),
    });
  }

  private emitToAccount(accountId: string, event: string, data: unknown) {
    const socketId = this.engine.getSocketIdForAccount(accountId);
    if (socketId) {
      this.engine.events.emit("directMessage", { socketId, event, data });
    }
  }
}
