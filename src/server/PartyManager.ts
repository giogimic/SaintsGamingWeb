import { GameEngine } from "./GameEngine";

export class PartyManager {
  // leaderAccountId -> Set of memberAccountIds (including leader)
  private activeParties = new Map<string, Set<string>>();
  // memberAccountId -> leaderAccountId
  private playerPartyMap = new Map<string, string>();

  constructor(private engine: GameEngine) {
    this.engine.events.on("playerDisconnected", ({ accountId }) => {
      this.leaveParty(accountId);
    });
    this.engine.events.on("partyChat", ({ accountId, message }) => {
      let senderName = "Party Member";
      this.engine.events.emit("requestPlayersInMap", {
        mapId: undefined,
        callback: (players: any[]) => {
          const p = players.find((x) => x.accountId === accountId);
          if (p?.name) senderName = p.name;
        },
      });
      this.broadcastPartyMessage(accountId, senderName, message);
    });
    this.engine.events.on("partyInvite", ({ accountId, targetName }) => {
      // We need a way to look up targetName to accountId...
      // For now, we will just emit a system message back.
      this.emitSystemToAccount(accountId, `Party invites to ${targetName} are WIP!`);
    });
    this.engine.events.on("partyJoin", ({ accountId, leaderName }) => {
      // For testing Phase 8, if they type `/p join [leaderId]`, we will parse leaderName as the leader's accountId!
      this.createOrJoinParty(leaderName, accountId);
      this.emitSystemToAccount(accountId, `Joined party of ${leaderName}!`);
    });
    this.engine.events.on("partyLeave", ({ accountId }) => {
      this.leaveParty(accountId);
    });
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

    // Remove joiner from their old party if they had one
    this.leaveParty(joinerId);

    party.add(joinerId);
    this.playerPartyMap.set(joinerId, leaderId);
    this.broadcastPartyUpdate(leaderId);
  }

  public leaveParty(accountId: string) {
    const leaderId = this.playerPartyMap.get(accountId);
    if (!leaderId) return; // Not in a party

    const party = this.activeParties.get(leaderId);
    if (!party) return;

    // If the leader leaves, disband the party completely
    if (accountId === leaderId) {
      for (const member of party) {
        this.playerPartyMap.delete(member);
        // Let them know party disbanded
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
    
    // We should ideally fetch their names/HPs, but for now just send IDs
    for (const member of members) {
      this.emitToAccount(member, "party_update", {
        type: "UPDATE",
        leaderId,
        members
      });
    }
  }

  public broadcastPartyMessage(senderId: string, senderName: string, message: string) {
    const leaderId = this.playerPartyMap.get(senderId);
    if (!leaderId) return;

    const party = this.activeParties.get(leaderId);
    if (!party) return;

    for (const member of party) {
      // Client Soul Channel listens for party_chat_msg (not chat_message).
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

  private emitToAccount(accountId: string, event: string, data: any) {
    const socketId = this.engine.getSocketIdForAccount(accountId);
    if (socketId) {
      this.engine.events.emit("directMessage", { socketId, event, data });
    }
  }
}
