import { describe, it, expect } from 'vitest';
import {
  createParty,
  addPartyMember,
  kickPartyMember,
  promotePartyLeader,
  leaveParty,
  resolveLootRecipient,
} from './partyEngine';

describe('Dynamic Party Roster & Shared Loot Engine (Bible 04)', () => {
  it('creates party with leader and adds members up to capacity', () => {
    const party = createParty('party_1', 'player_lead', 'Captain Gio', 50, 100, 100, 3);

    expect(party.members.length).toBe(1);
    expect(party.members[0].isLeader).toBe(true);

    const add1 = addPartyMember(party, {
      playerId: 'player_2',
      name: 'Alex',
      level: 45,
      hp: 100,
      maxHp: 100,
    });
    expect(add1.success).toBe(true);

    const add2 = addPartyMember(party, {
      playerId: 'player_3',
      name: 'Luna',
      level: 48,
      hp: 100,
      maxHp: 100,
    });
    expect(add2.success).toBe(true);

    // 4th member exceeds capacity of 3
    const add3 = addPartyMember(party, {
      playerId: 'player_4',
      name: 'Doran',
      level: 40,
      hp: 100,
      maxHp: 100,
    });
    expect(add3.success).toBe(false);
    expect(add3.reason).toContain('Party is already full');
  });

  it('only allows party leader to kick members', () => {
    const party = createParty('party_1', 'player_lead', 'Captain Gio');
    addPartyMember(party, { playerId: 'player_2', name: 'Alex', level: 10, hp: 100, maxHp: 100 });
    addPartyMember(party, { playerId: 'player_3', name: 'Luna', level: 10, hp: 100, maxHp: 100 });

    // Member attempts to kick member (blocked)
    const kickFail = kickPartyMember(party, 'player_2', 'player_3');
    expect(kickFail.success).toBe(false);
    expect(kickFail.reason).toContain('Only the party leader can kick');

    // Leader kicks member (success)
    const kickSuccess = kickPartyMember(party, 'player_lead', 'player_3');
    expect(kickSuccess.success).toBe(true);
    expect(party.members.some((m) => m.playerId === 'player_3')).toBe(false);
  });

  it('promotes leader and handles leader departure gracefully', () => {
    const party = createParty('party_1', 'player_lead', 'Captain Gio');
    addPartyMember(party, { playerId: 'player_2', name: 'Alex', level: 10, hp: 100, maxHp: 100 });

    // Promote Alex to leader
    const promo = promotePartyLeader(party, 'player_lead', 'player_2');
    expect(promo.success).toBe(true);
    expect(party.leaderId).toBe('player_2');
    expect(party.members.find((m) => m.playerId === 'player_2')?.isLeader).toBe(true);

    // Former leader leaves party
    const leave = leaveParty(party, 'player_lead');
    expect(leave.success).toBe(true);
    expect(leave.isDisbanded).toBe(false);
    expect(party.members.length).toBe(1);
  });

  it('distributes loot in ROUND_ROBIN order', () => {
    const party = createParty('party_1', 'player_lead', 'Lead', 1, 100, 100, 5, 'ROUND_ROBIN');
    addPartyMember(party, { playerId: 'player_2', name: 'Second', level: 1, hp: 100, maxHp: 100 });

    const drop1 = resolveLootRecipient(party, 'player_2');
    expect(drop1?.playerId).toBe('player_lead');

    const drop2 = resolveLootRecipient(party, 'player_2');
    expect(drop2?.playerId).toBe('player_2');

    const drop3 = resolveLootRecipient(party, 'player_2');
    expect(drop3?.playerId).toBe('player_lead'); // Cycles back
  });
});
