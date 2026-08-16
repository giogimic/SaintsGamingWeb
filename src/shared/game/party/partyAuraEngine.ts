/**
 * Saints Gaming — Party Health Sync & Shared XP/Buff Dispatcher (Bible 04)
 * Evaluates proximity auras, shared monster kill XP distribution, and party health updates.
 */

import { PartyMember, PartyState } from './partyEngine';

export interface SpatialMemberPosition {
  playerId: string;
  mapId: string;
  x: number;
  y: number;
}

export interface SharedXpShare {
  playerId: string;
  xpAwarded: number;
  isNearby: boolean;
}

export interface PartyAuraBuff {
  id: string;
  name: string;
  speedMultiplier: number;
  defenceMultiplier: number;
  description: string;
}

export const DEFAULT_XP_SHARE_RADIUS = 20;
export const DEFAULT_AURA_RADIUS = 10;

/**
 * Calculates Euclidean distance between two 2D positions.
 */
function dist2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Distributes monster defeat XP across party members within proximity radius on the same map.
 */
export function calculatePartyXpDistribution(
  baseXp: number,
  party: PartyState,
  killerPos: SpatialMemberPosition,
  allPositions: Record<string, SpatialMemberPosition>,
  maxShareRadius: number = DEFAULT_XP_SHARE_RADIUS
): SharedXpShare[] {
  if (party.members.length === 0 || baseXp <= 0) return [];

  // Filter nearby members on the same map
  const nearbyMembers: PartyMember[] = [];

  for (const member of party.members) {
    const pos = allPositions[member.playerId];
    if (pos && pos.mapId === killerPos.mapId) {
      if (dist2D(killerPos, pos) <= maxShareRadius) {
        nearbyMembers.push(member);
      }
    }
  }

  // If no one is near (or killer is alone), killer gets 100%
  if (nearbyMembers.length <= 1) {
    return party.members.map((m) => ({
      playerId: m.playerId,
      xpAwarded: m.playerId === killerPos.playerId ? baseXp : 0,
      isNearby: m.playerId === killerPos.playerId,
    }));
  }

  // Party synergy bonus: +10% total XP per additional nearby member
  const partyBonusMultiplier = 1 + (nearbyMembers.length - 1) * 0.1;
  const totalSynergyXp = Math.round(baseXp * partyBonusMultiplier);
  const xpPerMember = Math.round(totalSynergyXp / nearbyMembers.length);

  const nearbySet = new Set(nearbyMembers.map((m) => m.playerId));

  return party.members.map((m) => ({
    playerId: m.playerId,
    xpAwarded: nearbySet.has(m.playerId) ? xpPerMember : 0,
    isNearby: nearbySet.has(m.playerId),
  }));
}

/**
 * Evaluates active party proximity aura buffs for a given player.
 */
export function evaluatePartyAuraBuff(
  playerId: string,
  party: PartyState,
  allPositions: Record<string, SpatialMemberPosition>,
  auraRadius: number = DEFAULT_AURA_RADIUS
): PartyAuraBuff | null {
  const currentPos = allPositions[playerId];
  if (!currentPos || party.members.length < 2) return null;

  let nearbyCount = 0;

  for (const member of party.members) {
    if (member.playerId === playerId) continue;
    const pos = allPositions[member.playerId];
    if (pos && pos.mapId === currentPos.mapId) {
      if (dist2D(currentPos, pos) <= auraRadius) {
        nearbyCount++;
      }
    }
  }

  if (nearbyCount >= 1) {
    return {
      id: 'buff_fellowship_aura',
      name: 'Fellowship of Saints',
      speedMultiplier: 1.05, // +5% Move Speed
      defenceMultiplier: 1.05, // +5% Defence
      description: 'Active party proximity grants +5% speed and defense synergy.',
    };
  }

  return null;
}
