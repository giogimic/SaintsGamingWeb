import { describe, it, expect } from 'vitest';
import {
  createGuild,
  addGuildMember,
  setMemberRank,
  depositGuildTreasury,
} from './guildEngine';

describe('Guild Clan Roster & Rank Authority Engine (Bible 05)', () => {
  it('creates guild with founder as leader', () => {
    const guild = createGuild('g_saints', 'Saints Elite', 'SAINT', 'p_gio', 'GioGimic');

    expect(guild.id).toBe('g_saints');
    expect(guild.tag).toBe('SAINT');
    expect(guild.leaderId).toBe('p_gio');
    expect(guild.members.length).toBe(1);
    expect(guild.members[0].rank).toBe('LEADER');
  });

  it('allows leader/officers to add members, blocking lower ranks from inviting', () => {
    const guild = createGuild('g_saints', 'Saints Elite', 'SAINT', 'p_gio', 'GioGimic');

    // Leader invites Officer
    addGuildMember(guild, 'p_gio', 'p_alex', 'Alex');
    setMemberRank(guild, 'p_gio', 'p_alex', 'OFFICER');

    // Officer invites Recruit
    const inviteRecruit = addGuildMember(guild, 'p_alex', 'p_luna', 'Luna');
    expect(inviteRecruit.success).toBe(true);

    // Recruit attempts to invite someone (blocked)
    const recruitInvite = addGuildMember(guild, 'p_luna', 'p_doran', 'Doran');
    expect(recruitInvite.success).toBe(false);
    expect(recruitInvite.reason).toContain('Only Officers and the Guild Leader');
  });

  it('enforces strict rank hierarchy during promotions', () => {
    const guild = createGuild('g_saints', 'Saints Elite', 'SAINT', 'p_gio', 'GioGimic');
    addGuildMember(guild, 'p_gio', 'p_officer', 'Officer Dan');
    addGuildMember(guild, 'p_gio', 'p_member', 'Member Bob');
    setMemberRank(guild, 'p_gio', 'p_officer', 'OFFICER');

    // Officer tries to promote member to OFFICER (equal to own rank -> blocked)
    const officerPromo = setMemberRank(guild, 'p_officer', 'p_member', 'OFFICER');
    expect(officerPromo.success).toBe(false);
    expect(officerPromo.reason).toContain('equal to or above your own');

    // Leader promotes member to VETERAN (success)
    const leaderPromo = setMemberRank(guild, 'p_gio', 'p_member', 'VETERAN');
    expect(leaderPromo.success).toBe(true);
    expect(guild.members.find((m) => m.playerId === 'p_member')?.rank).toBe('VETERAN');
  });

  it('accumulates treasury donations and unlocks level-based perks', () => {
    const guild = createGuild('g_saints', 'Saints Elite', 'SAINT', 'p_gio', 'GioGimic');

    expect(guild.level).toBe(1);

    // Donate 15,000 gold -> Reaches Level 2
    depositGuildTreasury(guild, 'p_gio', 15000);
    expect(guild.level).toBe(2);
    expect(guild.perks).toContain('perk_bank_discount');

    // Donate 40,000 more (Total 55,000) -> Reaches Level 3
    depositGuildTreasury(guild, 'p_gio', 40000);
    expect(guild.level).toBe(3);
    expect(guild.perks).toContain('perk_bonus_combat_xp');
  });
});
