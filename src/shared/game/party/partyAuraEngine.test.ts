import { describe, it, expect } from 'vitest';
import {
  calculatePartyXpDistribution,
  evaluatePartyAuraBuff,
  SpatialMemberPosition,
} from './partyAuraEngine';
import { createParty, addPartyMember } from './partyEngine';

describe('Party Health Sync & Shared XP/Buff Dispatcher (Bible 04)', () => {
  const party = createParty('party_1', 'player_1', 'Lead');
  addPartyMember(party, { playerId: 'player_2', name: 'Member 2', level: 10, hp: 100, maxHp: 100 });
  addPartyMember(party, { playerId: 'player_3', name: 'Member 3 (Far Away)', level: 10, hp: 100, maxHp: 100 });

  const positions: Record<string, SpatialMemberPosition> = {
    player_1: { playerId: 'player_1', mapId: 'VILLAGE', x: 10, y: 10 },
    player_2: { playerId: 'player_2', mapId: 'VILLAGE', x: 14, y: 10 }, // 4 tiles away (nearby)
    player_3: { playerId: 'player_3', mapId: 'DUNGEON', x: 10, y: 10 }, // On different map (far)
  };

  it('distributes shared monster XP with party bonus only to nearby members on the same map', () => {
    const shares = calculatePartyXpDistribution(
      100, // Base XP
      party,
      positions.player_1,
      positions,
      20 // Share radius
    );

    // Nearby count = 2 (p1 and p2). Synergy bonus = 1 + 0.1 = 1.1x -> 110 total XP.
    // 110 / 2 = 55 XP each.
    const p1Share = shares.find((s) => s.playerId === 'player_1');
    const p2Share = shares.find((s) => s.playerId === 'player_2');
    const p3Share = shares.find((s) => s.playerId === 'player_3');

    expect(p1Share?.xpAwarded).toBe(55);
    expect(p2Share?.xpAwarded).toBe(55);
    expect(p3Share?.xpAwarded).toBe(0); // Far away player receives 0
  });

  it('grants Fellowship aura buff when party members are within proximity', () => {
    const buff = evaluatePartyAuraBuff('player_1', party, positions, 10);

    expect(buff).not.toBeNull();
    expect(buff?.name).toBe('Fellowship of Saints');
    expect(buff?.speedMultiplier).toBe(1.05);
    expect(buff?.defenceMultiplier).toBe(1.05);
  });

  it('returns null aura buff if player is isolated on map', () => {
    const isolatedBuff = evaluatePartyAuraBuff('player_3', party, positions, 10);
    expect(isolatedBuff).toBeNull();
  });
});
