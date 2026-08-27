import { describe, expect, it } from 'vitest';
import { createGuild } from './guildEngine';
import {
  ClanVaultLedgerEntry,
  GuildDiplomacyEngine,
} from './guildDiplomacyEngine';

describe('Guild Alliances, War Declarations, Tax Rates & Clan Vault Escrow Engine (Phase 25)', () => {
  it('manages symmetric diplomatic treaties between guilds', () => {
    const engine = new GuildDiplomacyEngine();

    // Initial neutral status
    expect(engine.getDiplomaticStatus('guild_a', 'guild_b')).toBe('NEUTRAL');

    // Sign Alliance pact
    engine.setDiplomaticStatus('guild_a', 'guild_b', 'ALLIED');
    expect(engine.getDiplomaticStatus('guild_a', 'guild_b')).toBe('ALLIED');
    expect(engine.getDiplomaticStatus('guild_b', 'guild_a')).toBe('ALLIED'); // Symmetric lookup
  });

  it('declares war with staked escrow and awards prize pool to victor upon reaching kill goal', () => {
    const engine = new GuildDiplomacyEngine();

    const guildA = createGuild('g_alpha', 'Alpha Legion', 'ALP', 'p1', 'Leader A');
    const guildB = createGuild('g_omega', 'Omega Syndicate', 'OMG', 'p2', 'Leader B');

    guildA.treasuryGold = 100000;
    guildB.treasuryGold = 100000;

    // Declare war with 50k stake and 2-kill goal
    const war = engine.declareWar(guildA, guildB, 50000, 2);

    expect(guildA.treasuryGold).toBe(50000); // 50k escrowed
    expect(guildB.treasuryGold).toBe(50000);
    expect(engine.getDiplomaticStatus('g_alpha', 'g_omega')).toBe('AT_WAR');

    // Alpha scores 1 kill
    const k1 = engine.recordWarKill(war, 'g_alpha', guildA, guildB);
    expect(k1.concluded).toBe(false);

    // Alpha scores 2nd kill -> Victory!
    const k2 = engine.recordWarKill(war, 'g_alpha', guildA, guildB);
    expect(k2.concluded).toBe(true);
    expect(k2.winnerId).toBe('g_alpha');
    expect(k2.prizePool).toBe(100000);
    // Alpha treasury receives full 100k prize pool
    expect(guildA.treasuryGold).toBe(150000);
    expect(guildB.treasuryGold).toBe(50000);
  });

  it('computes guild tax deductions accurately', () => {
    const engine = new GuildDiplomacyEngine();

    // 10% tax rate on 15,000 gold
    const res = engine.calculateTaxDeduction(15000, 10);
    expect(res.taxGold).toBe(1500);
    expect(res.netGold).toBe(13500);
  });

  it('enforces rank-based daily clan vault withdrawal limits', () => {
    const engine = new GuildDiplomacyEngine();
    const guild = createGuild('g_clan', 'Grand Clan', 'GC', 'p_leader', 'Chief');
    guild.treasuryGold = 500000;

    const ledger: ClanVaultLedgerEntry[] = [];

    // 1. Officer (100k limit) withdraws 60k -> Success
    const officer = { playerId: 'p_off', name: 'Officer One', rank: 'OFFICER' as const };
    const w1 = engine.withdrawVaultGold(guild, officer, 60000, 0, ledger);
    expect(w1.success).toBe(true);
    expect(guild.treasuryGold).toBe(440000);
    expect(ledger).toHaveLength(1);

    // 2. Member (5k limit) attempts to withdraw 10k -> Fails
    const member = { playerId: 'p_mem', name: 'Member Joe', rank: 'MEMBER' as const };
    const w2 = engine.withdrawVaultGold(guild, member, 10000, 0, ledger);
    expect(w2.success).toBe(false);
    expect(w2.reason).toContain('limit');

    // 3. Recruit (0 limit) attempts to withdraw 100 gold -> Fails
    const recruit = { playerId: 'p_rec', name: 'Recruit Bob', rank: 'RECRUIT' as const };
    const w3 = engine.withdrawVaultGold(guild, recruit, 100, 0, ledger);
    expect(w3.success).toBe(false);
  });
});
