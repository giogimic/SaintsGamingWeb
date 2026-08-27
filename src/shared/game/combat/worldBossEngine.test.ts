import { describe, expect, it } from 'vitest';
import { WorldBossEngine } from './worldBossEngine';

describe('World Boss Dynamic Scaling, Enrage Timers & Shared Loot Ledger Engine (Phase 23)', () => {
  it('dynamically scales boss health as players join the arena', () => {
    const engine = new WorldBossEngine();
    const session = engine.createBossSession('boss_titan', 'Mountain Behemoth', 10000, 2500);

    // Initial with 0 participants
    expect(session.maxHp).toBe(10000);
    expect(session.currentHp).toBe(10000);

    // 1st player registers -> 10,000 HP
    engine.registerParticipant(session, 'p1', 'Saint Tank');
    expect(session.maxHp).toBe(10000);

    // 2nd player registers -> scales to 12,500 HP (+2,500)
    engine.registerParticipant(session, 'p2', 'Saint DPS');
    expect(session.maxHp).toBe(12500);
    expect(session.currentHp).toBe(12500);

    // 3rd player registers -> scales to 15,000 HP (+2,500)
    engine.registerParticipant(session, 'p3', 'Saint Healer');
    expect(session.maxHp).toBe(15000);
    expect(session.currentHp).toBe(15000);
  });

  it('manages phase transitions and soft/hard enrage status', () => {
    const engine = new WorldBossEngine();
    const session = engine.createBossSession('boss_dragon', 'Infernal Wyrm', 10000, 0, 600);
    engine.registerParticipant(session, 'p1', 'Saint Slayer');

    // 1. Initial: Phase 1 (>66% HP)
    const t1 = engine.tickBossState(session);
    expect(t1.newPhase).toBe('PHASE_1_CLEAVE');
    expect(session.enrage.isSoftEnraged).toBe(false);

    // 2. Deal 4,000 damage (6,000 HP remaining = 60% HP -> Phase 2 & not soft enraged yet)
    engine.recordContribution(session, 'p1', 4000);
    const t2 = engine.tickBossState(session);
    expect(t2.newPhase).toBe('PHASE_2_ADDS');

    // 3. Deal another 1,500 damage (4,500 HP remaining = 45% HP -> Soft Enrage triggers!)
    engine.recordContribution(session, 'p1', 1500);
    engine.tickBossState(session);
    expect(session.enrage.isSoftEnraged).toBe(true);

    // 4. Deal another 2,000 damage (2,500 HP remaining = 25% HP -> Phase 3 Cataclysm)
    engine.recordContribution(session, 'p1', 2000);
    const t3 = engine.tickBossState(session);
    expect(t3.newPhase).toBe('PHASE_3_CATACLYSM');

    // 5. Hard enrage after 600 seconds
    const futureTime = session.startTime + 650 * 1000;
    const t4 = engine.tickBossState(session, futureTime);
    expect(t4.isHardEnraged).toBe(true);

    // 6. Kill boss
    engine.recordContribution(session, 'p1', 2500);
    const t5 = engine.tickBossState(session);
    expect(t5.isDefeated).toBe(true);
    expect(t5.newPhase).toBe('DEFEATED');
  });

  it('calculates weighted loot distribution ledger based on damage, healing, and damage absorbed', () => {
    const engine = new WorldBossEngine();
    const session = engine.createBossSession('boss_kraken', 'Deep Sea Leviathan', 10000);

    engine.registerParticipant(session, 'p_dps', 'Top DPS');
    engine.registerParticipant(session, 'p_healer', 'Top Healer');
    engine.registerParticipant(session, 'p_tank', 'Top Tank');
    engine.registerParticipant(session, 'p_leech', 'Leech Player');

    // Record contributions:
    // DPS: 6,000 dmg
    engine.recordContribution(session, 'p_dps', 6000, 0, 0);
    // Healer: 1,000 dmg, 3,000 healing (3000 * 1.25 = 3750) -> Score = 4750
    engine.recordContribution(session, 'p_healer', 1000, 3000, 0);
    // Tank: 1,000 dmg, 2,000 absorbed (2000 * 0.5 = 1000) -> Score = 2000
    engine.recordContribution(session, 'p_tank', 1000, 0, 2000);
    // Leech: 50 dmg -> Score = 50
    engine.recordContribution(session, 'p_leech', 50, 0, 0);

    const ledger = engine.calculateLootLedger(session);

    expect(ledger).toHaveLength(4);
    // 1. DPS is MVP (highest score ~6000 / 12800 ~ 46.9%)
    expect(ledger[0].playerId).toBe('p_dps');
    expect(ledger[0].tier).toBe('MVP_UNIQUE');

    // 2. Healer is High Contribution (~37.1%)
    expect(ledger[1].playerId).toBe('p_healer');
    expect(ledger[1].tier).toBe('HIGH_CONTRIBUTION');

    // 3. Tank is High Contribution (~15.6%)
    expect(ledger[2].playerId).toBe('p_tank');
    expect(ledger[2].tier).toBe('HIGH_CONTRIBUTION');

    // 4. Leech is Participation Only (< 2%)
    expect(ledger[3].playerId).toBe('p_leech');
    expect(ledger[3].tier).toBe('PARTICIPATION_ONLY');
  });
});
