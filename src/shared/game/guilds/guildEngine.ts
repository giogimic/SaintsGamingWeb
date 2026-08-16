/**
 * Saints Gaming — Guild Clan Roster & Rank Authority Engine (Bible 05)
 * Manages player guild rosters, hierarchical rank permissions, treasury accounting, and perk progression.
 */

export type GuildRank = 'LEADER' | 'OFFICER' | 'VETERAN' | 'MEMBER' | 'RECRUIT';

const RANK_HIERARCHY: Record<GuildRank, number> = {
  LEADER: 5,
  OFFICER: 4,
  VETERAN: 3,
  MEMBER: 2,
  RECRUIT: 1,
};

export interface GuildMember {
  playerId: string;
  name: string;
  rank: GuildRank;
  contributedGold: number;
  joinedAt: number;
}

export interface GuildData {
  id: string;
  name: string;
  tag: string; // e.g. [SAINT]
  leaderId: string;
  level: number;
  treasuryGold: number;
  members: GuildMember[];
  maxMembers: number;
  perks: string[];
}

export const DEFAULT_MAX_GUILD_MEMBERS = 50;

/**
 * Creates a new guild with the founder as Leader.
 */
export function createGuild(
  id: string,
  name: string,
  tag: string,
  founderId: string,
  founderName: string,
  maxMembers: number = DEFAULT_MAX_GUILD_MEMBERS
): GuildData {
  const leader: GuildMember = {
    playerId: founderId,
    name: founderName,
    rank: 'LEADER',
    contributedGold: 0,
    joinedAt: Date.now(),
  };

  return {
    id,
    name,
    tag: tag.toUpperCase(),
    leaderId: founderId,
    level: 1,
    treasuryGold: 0,
    members: [leader],
    maxMembers,
    perks: ['perk_guild_chat'],
  };
}

/**
 * Adds a new member to the guild with RECRUIT rank.
 */
export function addGuildMember(
  guild: GuildData,
  requesterId: string,
  memberId: string,
  memberName: string
): { success: boolean; reason?: string } {
  const requester = guild.members.find((m) => m.playerId === requesterId);
  if (!requester || RANK_HIERARCHY[requester.rank] < RANK_HIERARCHY.OFFICER) {
    return { success: false, reason: 'Only Officers and the Guild Leader can invite members.' };
  }

  if (guild.members.length >= guild.maxMembers) {
    return { success: false, reason: 'Guild has reached maximum member capacity.' };
  }

  if (guild.members.some((m) => m.playerId === memberId)) {
    return { success: false, reason: 'Player is already a member of this guild.' };
  }

  guild.members.push({
    playerId: memberId,
    name: memberName,
    rank: 'RECRUIT',
    contributedGold: 0,
    joinedAt: Date.now(),
  });

  return { success: true };
}

/**
 * Promotes or demotes a guild member with strict rank hierarchy validation.
 */
export function setMemberRank(
  guild: GuildData,
  requesterId: string,
  targetId: string,
  newRank: GuildRank
): { success: boolean; reason?: string } {
  const requester = guild.members.find((m) => m.playerId === requesterId);
  const target = guild.members.find((m) => m.playerId === targetId);

  if (!requester || !target) {
    return { success: false, reason: 'Player or requester not found in guild.' };
  }

  // Only Leader can promote to Leader or transfer leadership
  if (newRank === 'LEADER') {
    if (requester.rank !== 'LEADER') {
      return { success: false, reason: 'Only the current Guild Leader can transfer leadership.' };
    }
    requester.rank = 'OFFICER';
    target.rank = 'LEADER';
    guild.leaderId = target.playerId;
    return { success: true };
  }

  // Requester must strictly outrank both the target's current rank and the new rank
  if (RANK_HIERARCHY[requester.rank] <= RANK_HIERARCHY[target.rank]) {
    return { success: false, reason: 'You cannot change the rank of someone with equal or higher rank.' };
  }

  if (RANK_HIERARCHY[requester.rank] <= RANK_HIERARCHY[newRank]) {
    return { success: false, reason: 'You cannot promote someone to a rank equal to or above your own.' };
  }

  target.rank = newRank;
  return { success: true };
}

/**
 * Deposits gold into the guild treasury.
 */
export function depositGuildTreasury(
  guild: GuildData,
  playerId: string,
  amount: number
): { success: boolean; newTreasuryTotal: number } {
  if (amount <= 0) {
    return { success: false, newTreasuryTotal: guild.treasuryGold };
  }

  const member = guild.members.find((m) => m.playerId === playerId);
  if (member) {
    member.contributedGold += amount;
  }

  guild.treasuryGold += amount;
  updateGuildLevelAndPerks(guild);

  return { success: true, newTreasuryTotal: guild.treasuryGold };
}

/**
 * Updates guild level and unlocks clan perks as the treasury and roster grow.
 */
function updateGuildLevelAndPerks(guild: GuildData): void {
  // Level formula: Level 1 (0 gold), Level 2 (10,000 gold), Level 3 (50,000 gold), Level 4 (150,000 gold), Level 5 (500,000 gold)
  if (guild.treasuryGold >= 500000 && guild.level < 5) {
    guild.level = 5;
    if (!guild.perks.includes('perk_guild_hall_teleport')) guild.perks.push('perk_guild_hall_teleport');
  } else if (guild.treasuryGold >= 150000 && guild.level < 4) {
    guild.level = 4;
    if (!guild.perks.includes('perk_bonus_gold_drop')) guild.perks.push('perk_bonus_gold_drop');
  } else if (guild.treasuryGold >= 50000 && guild.level < 3) {
    guild.level = 3;
    if (!guild.perks.includes('perk_bonus_combat_xp')) guild.perks.push('perk_bonus_combat_xp');
  } else if (guild.treasuryGold >= 10000 && guild.level < 2) {
    guild.level = 2;
    if (!guild.perks.includes('perk_bank_discount')) guild.perks.push('perk_bank_discount');
  }
}
