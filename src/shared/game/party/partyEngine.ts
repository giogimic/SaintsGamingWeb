/**
 * Saints Gaming — Dynamic Party Roster & Shared Loot Engine (Bible 04)
 * Manages player party rosters, leader authority, invite/kick lifecycles, and loot distribution modes.
 */

export type LootDistributionMode =
  | 'FREE_FOR_ALL'
  | 'ROUND_ROBIN'
  | 'LEADER_DISTRIBUTED';

export interface PartyMember {
  playerId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  isLeader: boolean;
  joinedAt: number;
}

export interface PartyState {
  partyId: string;
  leaderId: string;
  members: PartyMember[];
  maxMembers: number;
  lootMode: LootDistributionMode;
  roundRobinIndex: number;
}

export const DEFAULT_MAX_PARTY_SIZE = 5;

/**
 * Creates a new party with the creator as party leader.
 */
export function createParty(
  partyId: string,
  leaderId: string,
  leaderName: string,
  level: number = 1,
  hp: number = 100,
  maxHp: number = 100,
  maxMembers: number = DEFAULT_MAX_PARTY_SIZE,
  lootMode: LootDistributionMode = 'ROUND_ROBIN'
): PartyState {
  const leader: PartyMember = {
    playerId: leaderId,
    name: leaderName,
    level,
    hp,
    maxHp,
    isLeader: true,
    joinedAt: Date.now(),
  };

  return {
    partyId,
    leaderId,
    members: [leader],
    maxMembers,
    lootMode,
    roundRobinIndex: 0,
  };
}

/**
 * Adds a new member to an active party if capacity allows.
 */
export function addPartyMember(
  party: PartyState,
  member: Omit<PartyMember, 'isLeader' | 'joinedAt'>
): { success: boolean; reason?: string } {
  if (party.members.length >= party.maxMembers) {
    return { success: false, reason: 'Party is already full.' };
  }

  if (party.members.some((m) => m.playerId === member.playerId)) {
    return { success: false, reason: 'Player is already in this party.' };
  }

  party.members.push({
    ...member,
    isLeader: false,
    joinedAt: Date.now(),
  });

  return { success: true };
}

/**
 * Kicks a member from the party. Only the leader can perform kicks.
 */
export function kickPartyMember(
  party: PartyState,
  requesterId: string,
  targetPlayerId: string
): { success: boolean; reason?: string } {
  if (requesterId !== party.leaderId) {
    return { success: false, reason: 'Only the party leader can kick members.' };
  }

  if (targetPlayerId === party.leaderId) {
    return { success: false, reason: 'Party leader cannot kick themselves. Use leaveParty.' };
  }

  const initialCount = party.members.length;
  party.members = party.members.filter((m) => m.playerId !== targetPlayerId);

  if (party.members.length === initialCount) {
    return { success: false, reason: 'Player not found in party.' };
  }

  return { success: true };
}

/**
 * Promotes a member to party leader.
 */
export function promotePartyLeader(
  party: PartyState,
  requesterId: string,
  newLeaderId: string
): { success: boolean; reason?: string } {
  if (requesterId !== party.leaderId) {
    return { success: false, reason: 'Only the current party leader can transfer leadership.' };
  }

  const newLeader = party.members.find((m) => m.playerId === newLeaderId);
  if (!newLeader) {
    return { success: false, reason: 'Target player is not in the party.' };
  }

  const currentLeader = party.members.find((m) => m.playerId === party.leaderId);
  if (currentLeader) {
    currentLeader.isLeader = false;
  }

  newLeader.isLeader = true;
  party.leaderId = newLeaderId;

  return { success: true };
}

/**
 * Removes a player from the party. If the leader leaves, auto-promotes the next oldest member.
 */
export function leaveParty(
  party: PartyState,
  playerId: string
): { success: boolean; isDisbanded: boolean; newLeaderId?: string } {
  const memberIndex = party.members.findIndex((m) => m.playerId === playerId);
  if (memberIndex === -1) {
    return { success: false, isDisbanded: false };
  }

  const isLeaderLeaving = party.leaderId === playerId;
  party.members.splice(memberIndex, 1);

  if (party.members.length === 0) {
    return { success: true, isDisbanded: true };
  }

  if (isLeaderLeaving) {
    // Auto-promote first remaining member
    party.members[0].isLeader = true;
    party.leaderId = party.members[0].playerId;
    return { success: true, isDisbanded: false, newLeaderId: party.leaderId };
  }

  return { success: true, isDisbanded: false };
}

/**
 * Resolves which party member receives dropped loot based on the party's loot distribution mode.
 */
export function resolveLootRecipient(
  party: PartyState,
  pickerPlayerId: string
): PartyMember | null {
  if (party.members.length === 0) return null;

  switch (party.lootMode) {
    case 'FREE_FOR_ALL': {
      const picker = party.members.find((m) => m.playerId === pickerPlayerId);
      return picker ?? party.members[0];
    }

    case 'LEADER_DISTRIBUTED': {
      const leader = party.members.find((m) => m.playerId === party.leaderId);
      return leader ?? party.members[0];
    }

    case 'ROUND_ROBIN':
    default: {
      const recipient = party.members[party.roundRobinIndex % party.members.length];
      party.roundRobinIndex = (party.roundRobinIndex + 1) % party.members.length;
      return recipient;
    }
  }
}
