/**
 * Saints Gaming — Guild Alliances, War Declarations, Tax Rates & Clan Vault Escrow Engine (Bible 05 & 06)
 * Manages inter-guild diplomacy treaties, formal war declarations with escrowed stakes, tax rates, and daily vault allowances.
 */

import { GuildData, GuildRank } from './guildEngine';

export type DiplomaticStatus = 'ALLIED' | 'NEUTRAL' | 'RIVAL' | 'AT_WAR';

export interface WarDeclaration {
  warId: string;
  declaringGuildId: string;
  targetGuildId: string;
  stakeGold: number; // Escrowed gold per side
  declaringGuildKills: number;
  targetGuildKills: number;
  targetKillGoal: number;
  status: 'ACTIVE' | 'SURRENDERED' | 'CONCLUDED';
  winnerGuildId?: string;
  declaredAt: number;
}

export type VaultTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'TAX_COLLECTION'
  | 'WAR_STAKE_ESCROW'
  | 'WAR_WIN_PAYOUT';

export interface ClanVaultLedgerEntry {
  timestamp: number;
  playerId: string;
  playerName: string;
  type: VaultTransactionType;
  amount: number;
  resultingBalance: number;
}

export const DAILY_WITHDRAWAL_LIMITS: Record<GuildRank, number> = {
  LEADER: Number.POSITIVE_INFINITY,
  OFFICER: 100000,
  VETERAN: 20000,
  MEMBER: 5000,
  RECRUIT: 0,
};

export class GuildDiplomacyEngine {
  private relations = new Map<string, DiplomaticStatus>();
  private activeWars = new Map<string, WarDeclaration>();

  private getRelationKey(guildA: string, guildB: string): string {
    return [guildA, guildB].sort().join('::');
  }

  /**
   * Sets diplomatic treaty status between two guilds.
   */
  public setDiplomaticStatus(
    guildA: string,
    guildB: string,
    status: DiplomaticStatus
  ): DiplomaticStatus {
    const key = this.getRelationKey(guildA, guildB);
    this.relations.set(key, status);
    return status;
  }

  /**
   * Gets diplomatic treaty status between two guilds (defaults to NEUTRAL).
   */
  public getDiplomaticStatus(guildA: string, guildB: string): DiplomaticStatus {
    const key = this.getRelationKey(guildA, guildB);
    return this.relations.get(key) || 'NEUTRAL';
  }

  /**
   * Initiates a formal war declaration between two guilds with escrowed gold stakes.
   */
  public declareWar(
    declaringGuild: GuildData,
    targetGuild: GuildData,
    stakeGold: number = 50000,
    targetKillGoal: number = 25
  ): WarDeclaration {
    if (declaringGuild.treasuryGold < stakeGold) {
      throw new Error(`Declaring guild lacks required escrow stake (${stakeGold} Gold)`);
    }
    if (targetGuild.treasuryGold < stakeGold) {
      throw new Error(`Target guild lacks required escrow stake (${stakeGold} Gold)`);
    }

    // Escrow gold from both treasuries
    declaringGuild.treasuryGold -= stakeGold;
    targetGuild.treasuryGold -= stakeGold;

    const warId = `war_${Date.now()}_${declaringGuild.id}_vs_${targetGuild.id}`;
    const war: WarDeclaration = {
      warId,
      declaringGuildId: declaringGuild.id,
      targetGuildId: targetGuild.id,
      stakeGold,
      declaringGuildKills: 0,
      targetGuildKills: 0,
      targetKillGoal,
      status: 'ACTIVE',
      declaredAt: Date.now(),
    };

    this.activeWars.set(warId, war);
    this.setDiplomaticStatus(declaringGuild.id, targetGuild.id, 'AT_WAR');

    return war;
  }

  /**
   * Records a war kill and checks for goal victory completion.
   */
  public recordWarKill(
    war: WarDeclaration,
    killerGuildId: string,
    declaringGuild: GuildData,
    targetGuild: GuildData
  ): { war: WarDeclaration; concluded: boolean; winnerId?: string; prizePool?: number } {
    if (war.status !== 'ACTIVE') {
      return { war, concluded: true, winnerId: war.winnerGuildId };
    }

    if (killerGuildId === war.declaringGuildId) {
      war.declaringGuildKills++;
    } else if (killerGuildId === war.targetGuildId) {
      war.targetGuildKills++;
    }

    const totalPrizePool = war.stakeGold * 2;

    if (war.declaringGuildKills >= war.targetKillGoal) {
      war.status = 'CONCLUDED';
      war.winnerGuildId = declaringGuild.id;
      declaringGuild.treasuryGold += totalPrizePool;
      this.setDiplomaticStatus(declaringGuild.id, targetGuild.id, 'RIVAL');
      return { war, concluded: true, winnerId: declaringGuild.id, prizePool: totalPrizePool };
    } else if (war.targetGuildKills >= war.targetKillGoal) {
      war.status = 'CONCLUDED';
      war.winnerGuildId = targetGuild.id;
      targetGuild.treasuryGold += totalPrizePool;
      this.setDiplomaticStatus(declaringGuild.id, targetGuild.id, 'RIVAL');
      return { war, concluded: true, winnerId: targetGuild.id, prizePool: totalPrizePool };
    }

    return { war, concluded: false };
  }

  /**
   * Yields/surrenders an active war to the opposing guild.
   */
  public surrenderWar(
    war: WarDeclaration,
    surrenderingGuildId: string,
    declaringGuild: GuildData,
    targetGuild: GuildData
  ): { war: WarDeclaration; prizePool: number } {
    if (war.status !== 'ACTIVE') throw new Error('War is not active');

    const winner = surrenderingGuildId === declaringGuild.id ? targetGuild : declaringGuild;
    const totalPrize = war.stakeGold * 2;

    war.status = 'SURRENDERED';
    war.winnerGuildId = winner.id;
    winner.treasuryGold += totalPrize;
    this.setDiplomaticStatus(declaringGuild.id, targetGuild.id, 'RIVAL');

    return { war, prizePool: totalPrize };
  }

  /**
   * Computes tax deduction on earnings based on guild tax rate (0% to 15%).
   */
  public calculateTaxDeduction(
    goldEarned: number,
    taxRatePercent: number
  ): { netGold: number; taxGold: number } {
    const clampedRate = Math.max(0, Math.min(15, taxRatePercent));
    const taxGold = Math.floor((goldEarned * clampedRate) / 100);
    const netGold = goldEarned - taxGold;
    return { netGold, taxGold };
  }

  /**
   * Authoritative daily vault withdrawal check and ledger auditing.
   */
  public withdrawVaultGold(
    guild: GuildData,
    member: { playerId: string; name: string; rank: GuildRank },
    amount: number,
    dailyWithdrawnToday: number,
    ledger: ClanVaultLedgerEntry[]
  ): { success: boolean; newTreasuryGold: number; reason?: string } {
    if (amount <= 0) return { success: false, newTreasuryGold: guild.treasuryGold, reason: 'Invalid amount' };

    const rankLimit = DAILY_WITHDRAWAL_LIMITS[member.rank] || 0;
    if (dailyWithdrawnToday + amount > rankLimit) {
      return {
        success: false,
        newTreasuryGold: guild.treasuryGold,
        reason: `Exceeds daily withdrawal limit for ${member.rank} (${rankLimit} Gold/day)`,
      };
    }

    if (guild.treasuryGold < amount) {
      return {
        success: false,
        newTreasuryGold: guild.treasuryGold,
        reason: 'Insufficient guild treasury funds',
      };
    }

    guild.treasuryGold -= amount;

    ledger.push({
      timestamp: Date.now(),
      playerId: member.playerId,
      playerName: member.name,
      type: 'WITHDRAW',
      amount,
      resultingBalance: guild.treasuryGold,
    });

    return { success: true, newTreasuryGold: guild.treasuryGold };
  }
}
