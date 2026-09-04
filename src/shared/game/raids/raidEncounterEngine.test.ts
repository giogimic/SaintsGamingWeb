import { describe, expect, it } from 'vitest';
import {
  RaidBossDefinition,
  RaidEncounterEngine,
} from './raidEncounterEngine';

describe('Master Raid Mechanics & Threat Aggro Engine (Phase 45)', () => {
  const raidBoss: RaidBossDefinition = {
    bossId: 'boss_olm_great',
    name: 'Great Olm, Stone Dragon',
    maxHealth: 100000,
    enrageDurationMs: 600000, // 10 minutes
    phases: [
      { phase: 'PHASE_1_GROUND', healthThresholdPct: 100, description: 'Ground Claw & Flame Breath' },
      { phase: 'PHASE_2_AIRBORNE_ADDS', healthThresholdPct: 60, description: 'Airborne Bombardment & Spawn Portals' },
      { phase: 'PHASE_3_ENRAGED_CORE', healthThresholdPct: 25, description: 'Crystal Spikes & Core Overload' },
    ],
  };

  it('manages threat generation with role multipliers and enforces over-aggro buffer thresholds', () => {
    const engine = new RaidEncounterEngine();

    const participants = [
      { playerId: 'tank_bob', role: 'TANK' as const, isRanged: false },
      { playerId: 'dps_melee_alice', role: 'DPS' as const, isRanged: false },
      { playerId: 'dps_ranged_charlie', role: 'DPS' as const, isRanged: true },
    ];

    const encounter = engine.createEncounter('enc_01', raidBoss, participants, 1000);

    // 1. Tank hits for 1,000 damage -> 4,000 threat generated (4.0x multiplier)
    const act1 = engine.recordCombatAction(encounter, 'tank_bob', 1000, 'DAMAGE', 1100);
    expect(act1.damageApplied).toBe(1000);
    expect(encounter.targetPlayerId).toBe('tank_bob');
    expect(encounter.participants.get('tank_bob')?.threat).toBe(4000);

    // 2. Melee DPS deals 4,100 damage -> 4,100 threat (needs 1.1 * 4000 = 4,400 to pull) -> No switch yet
    const act2 = engine.recordCombatAction(encounter, 'dps_melee_alice', 4100, 'DAMAGE', 1200);
    expect(act2.aggroTargetSwitched).toBeUndefined();
    expect(encounter.targetPlayerId).toBe('tank_bob');

    // 3. Melee DPS deals another 400 damage (total threat 4,500 > 4,400) -> Switches aggro to Melee DPS
    const act3 = engine.recordCombatAction(encounter, 'dps_melee_alice', 400, 'DAMAGE', 1300);
    expect(act3.aggroTargetSwitched).toBe('dps_melee_alice');
    expect(encounter.targetPlayerId).toBe('dps_melee_alice');

    // 4. Ranged DPS deals 5,500 damage (current target threat = 4500, ranged needs 1.3 * 4500 = 5,850) -> No switch
    const act4 = engine.recordCombatAction(encounter, 'dps_ranged_charlie', 5500, 'DAMAGE', 1400);
    expect(act4.aggroTargetSwitched).toBeUndefined();

    // 5. Ranged DPS deals another 400 damage (total threat 5,900 > 5,850) -> Switches aggro to Ranged DPS
    const act5 = engine.recordCombatAction(encounter, 'dps_ranged_charlie', 400, 'DAMAGE', 1500);
    expect(act5.aggroTargetSwitched).toBe('dps_ranged_charlie');
    expect(encounter.targetPlayerId).toBe('dps_ranged_charlie');
  });

  it('triggers health threshold phase shifts, party wipe detection, and wipe recovery reset', () => {
    const engine = new RaidEncounterEngine();

    const participants = [
      { playerId: 'tank_bob', role: 'TANK' as const },
      { playerId: 'dps_alice', role: 'DPS' as const },
    ];

    const encounter = engine.createEncounter('enc_02', raidBoss, participants, 1000);
    expect(encounter.currentPhase).toBe('PHASE_1_GROUND');

    // 1. Deal 45,000 damage (boss health drops to 55,000 / 100,000 = 55% <= 60%) -> Phase 2 shift
    const act1 = engine.recordCombatAction(encounter, 'dps_alice', 45000, 'DAMAGE', 2000);
    expect(act1.phaseShifted).toBe('PHASE_2_AIRBORNE_ADDS');
    expect(encounter.currentPhase).toBe('PHASE_2_AIRBORNE_ADDS');

    // 2. Deal 35,000 damage (boss health drops to 20,000 / 100,000 = 20% <= 25%) -> Phase 3 shift
    const act2 = engine.recordCombatAction(encounter, 'dps_alice', 35000, 'DAMAGE', 3000);
    expect(act2.phaseShifted).toBe('PHASE_3_ENRAGED_CORE');
    expect(encounter.currentPhase).toBe('PHASE_3_ENRAGED_CORE');

    // 3. Tank dies -> Not a wipe yet
    const death1 = engine.recordPlayerDeath(encounter, 'tank_bob');
    expect(death1.isWiped).toBe(false);

    // 4. DPS dies -> Full wipe detected
    const death2 = engine.recordPlayerDeath(encounter, 'dps_alice');
    expect(death2.isWiped).toBe(true);
    expect(encounter.isArenaLocked).toBe(false);

    // 5. Execute wipe reset -> Boss restored to 100% health, phase reset, arena unlocked
    const reset = engine.executeWipeReset(encounter, 5000);
    expect(reset.resetComplete).toBe(true);
    expect(encounter.currentHealth).toBe(100000);
    expect(encounter.currentPhase).toBe('PHASE_1_GROUND');
    expect(encounter.participants.get('tank_bob')?.isAlive).toBe(true);
  });
});
