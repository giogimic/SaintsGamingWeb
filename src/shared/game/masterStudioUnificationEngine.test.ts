import { describe, expect, it } from 'vitest';
import { MasterStudioUnificationEngine } from './masterStudioUnificationEngine';

describe('Master Studio Suite Orchestration & Grand Engine Unification (Phase 50)', () => {
  it('registers all 50 platform engine subsystems upon initialization', () => {
    const engine = new MasterStudioUnificationEngine();
    const report = engine.runDiagnosticSweep();

    expect(report.totalRegisteredSubsystems).toBe(50);
    expect(report.onlineSubsystemsCount).toBe(50);
    expect(report.platformHealthScorePct).toBe(100);

    // Verify key phases from Phase 1 to Phase 50
    const phase1 = report.subsystems.find((s) => s.phaseIntroduced === 1);
    const phase25 = report.subsystems.find((s) => s.phaseIntroduced === 25);
    const phase50 = report.subsystems.find((s) => s.phaseIntroduced === 50);

    expect(phase1?.id).toBe('foundation_validator');
    expect(phase25?.id).toBe('guild_diplomacy_engine');
    expect(phase50?.id).toBe('master_studio_unification');
  });

  it('dispatches cross-engine event cascades across inter-subsystem pipelines', () => {
    const engine = new MasterStudioUnificationEngine();

    let achievementLogged = false;
    let loreUnlocked = false;
    let economyDropIssued = false;

    // Subsystem 1: Achievement Engine listener
    engine.subscribe('WORLD_BOSS_DEFEATED', (ev) => {
      if (ev.payload.bossId === 'boss_olm') achievementLogged = true;
    });

    // Subsystem 2: Lore Codex Engine listener
    engine.subscribe('WORLD_BOSS_DEFEATED', (ev) => {
      if (ev.payload.bossId === 'boss_olm') loreUnlocked = true;
    });

    // Subsystem 3: Economy Engine listener
    engine.subscribe('WORLD_BOSS_DEFEATED', (ev) => {
      if (ev.payload.bossId === 'boss_olm') economyDropIssued = true;
    });

    // Dispatch global event
    const event = engine.dispatchCrossEngineEvent('WORLD_BOSS_DEFEATED', {
      bossId: 'boss_olm',
      raidParty: ['tank_bob', 'dps_alice'],
      goldReward: 50000,
    });

    expect(event.type).toBe('WORLD_BOSS_DEFEATED');
    expect(achievementLogged).toBe(true);
    expect(loreUnlocked).toBe(true);
    expect(economyDropIssued).toBe(true);
    expect(engine.getEventHistory()).toHaveLength(1);
  });
});
