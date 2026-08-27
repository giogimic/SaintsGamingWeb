/**
 * Saints Gaming — Guild Clan Citadel & Territory War Engine (Bible 05 & 14)
 * Manages world territory outposts, dynamic capture ticking, passive perk/tax yields, and scheduled clan war sieges.
 */

export interface TerritoryPerks {
  goldYieldPerHour: number;
  xpMultiplierBuff: number;
  buffCategory: 'MINING' | 'WOODCUTTING' | 'COMBAT' | 'MAGIC' | 'GENERAL';
}

export interface TerritoryNode {
  id: string;
  name: string;
  description: string;
  controllingGuildId: string | null;
  capturePercent: number; // 0 to 100
  capturingGuildId: string | null;
  fortificationLevel: number;
  perks: TerritoryPerks;
}

export interface GuildOccupant {
  guildId: string;
  count: number;
}

export type ClanWarStatus = 'SCHEDULED' | 'ACTIVE' | 'CONCLUDED';

export interface ClanWarSession {
  warId: string;
  challengerGuildId: string;
  defenderGuildId: string;
  challengerScore: number;
  defenderScore: number;
  targetScore: number;
  stakeGold: number;
  status: ClanWarStatus;
  winnerGuildId?: string;
  loserGuildId?: string;
  createdAt: number;
  updatedAt: number;
}

export class GuildTerritoryEngine {
  private nodes = new Map<string, TerritoryNode>();
  private wars = new Map<string, ClanWarSession>();

  /**
   * Registers a territory node / outpost on the world map.
   */
  public registerNode(node: TerritoryNode) {
    this.nodes.set(node.id, { ...node });
  }

  /**
   * Retrieves a territory node by ID.
   */
  public getNode(nodeId: string): TerritoryNode | null {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Lists all registered world territory nodes.
   */
  public listNodes(): TerritoryNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Ticks capture progress for a territory node based on guild occupant presence.
   */
  public tickCapture(nodeId: string, occupants: GuildOccupant[], progressPerTick: number = 10): TerritoryNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Territory node '${nodeId}' not found`);

    const activeGuilds = occupants.filter((o) => o.count > 0);

    // If empty or contested by multiple competing guilds -> no progress
    if (activeGuilds.length === 0 || activeGuilds.length > 1) {
      return node;
    }

    const occupantGuild = activeGuilds[0].guildId;

    if (node.controllingGuildId === occupantGuild) {
      // Re-fortifying existing control up to 100%
      node.capturePercent = Math.min(100, node.capturePercent + progressPerTick);
      node.capturingGuildId = null;
    } else if (node.controllingGuildId !== null) {
      // Neutralizing existing controller
      node.capturingGuildId = occupantGuild;
      node.capturePercent = Math.max(0, node.capturePercent - progressPerTick);
      if (node.capturePercent === 0) {
        node.controllingGuildId = null; // Neutralized!
      }
    } else {
      // Capturing neutral node
      node.capturingGuildId = occupantGuild;
      node.capturePercent = Math.min(100, node.capturePercent + progressPerTick);
      if (node.capturePercent >= 100) {
        node.controllingGuildId = occupantGuild;
        node.capturingGuildId = null;
      }
    }

    return node;
  }

  // ─── CLAN WARS & SIEGES ─────────────────────────────────────────────────────

  /**
   * Declares a formal clan war between two guilds.
   */
  public declareClanWar(
    challengerGuildId: string,
    defenderGuildId: string,
    stakeGold: number = 0,
    targetScore: number = 100
  ): ClanWarSession {
    const warId = `war_${challengerGuildId}_${defenderGuildId}_${Date.now()}`;
    const stake = Math.max(0, Math.floor(stakeGold));

    const war: ClanWarSession = {
      warId,
      challengerGuildId,
      defenderGuildId,
      challengerScore: 0,
      defenderScore: 0,
      targetScore,
      stakeGold: stake,
      status: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.wars.set(warId, war);
    return war;
  }

  /**
   * Retrieves a clan war session.
   */
  public getClanWar(warId: string): ClanWarSession | null {
    return this.wars.get(warId) || null;
  }

  /**
   * Records a PvP kill in the active clan war.
   */
  public recordWarKill(warId: string, killerGuildId: string, points: number = 5): ClanWarSession {
    const war = this.wars.get(warId);
    if (!war || war.status !== 'ACTIVE') throw new Error('Active clan war not found');

    if (war.challengerGuildId === killerGuildId) {
      war.challengerScore += points;
    } else if (war.defenderGuildId === killerGuildId) {
      war.defenderScore += points;
    } else {
      throw new Error('Guild is not a participant in this war');
    }

    war.updatedAt = Date.now();
    this.checkWarVictory(war);
    return war;
  }

  /**
   * Records a territory capture in the active clan war.
   */
  public recordWarCapture(warId: string, captorGuildId: string, points: number = 25): ClanWarSession {
    return this.recordWarKill(warId, captorGuildId, points);
  }

  private checkWarVictory(war: ClanWarSession) {
    if (war.challengerScore >= war.targetScore) {
      war.status = 'CONCLUDED';
      war.winnerGuildId = war.challengerGuildId;
      war.loserGuildId = war.defenderGuildId;
    } else if (war.defenderScore >= war.targetScore) {
      war.status = 'CONCLUDED';
      war.winnerGuildId = war.defenderGuildId;
      war.loserGuildId = war.challengerGuildId;
    }
  }
}
