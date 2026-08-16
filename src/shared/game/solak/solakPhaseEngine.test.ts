import { describe, it, expect } from 'vitest';
import {
  initializeSolakState,
  applyDamageToSolak,
  processPhase4BlightBleed,
} from './solakPhaseEngine';

describe('Solak: The Grove Guardian Phase & Core Engine', () => {
  it('manages limb destruction to expose Blight Core in Phase 1', () => {
    const solak = initializeSolakState(1); // 3,500,000 HP
    expect(solak.phase).toBe(1);
    expect(solak.isCoreExposed).toBe(false);

    // Destroy Left Leg
    applyDamageToSolak(solak, 'LEFT_LEG', solak.leftLeg.maxHp);
    expect(solak.leftLeg.hp).toBe(0);
    expect(solak.isCoreExposed).toBe(false);

    // Destroy Right Leg -> Core Exposed
    applyDamageToSolak(solak, 'RIGHT_LEG', solak.rightLeg.maxHp);
    expect(solak.rightLeg.hp).toBe(0);
    expect(solak.isCoreExposed).toBe(true);

    // Attack Core -> Damage applies directly to Solak
    const coreHit = applyDamageToSolak(solak, 'CORE', 200000);
    expect(coreHit.effectiveDamage).toBe(200000);
    expect(solak.coreHp).toBe(50000);
  });

  it('progresses through Phase 2, Phase 3 Mind Realm, and Phase 4 DPS race', () => {
    const solak = initializeSolakState(1);

    // Advance to Phase 2 (<= 75% = 2.625M HP)
    applyDamageToSolak(solak, 'MAIN_BODY', 900000);
    expect(solak.phase).toBe(2);

    // Advance to Phase 3 (<= 50% = 1.75M HP)
    applyDamageToSolak(solak, 'MAIN_BODY', 900000);
    expect(solak.phase).toBe(3);

    // Cleanse Mind Realm in Phase 3
    applyDamageToSolak(solak, 'MIND_MANIFESTATION', 500000);
    expect(solak.mindCorruptionPercent).toBe(0);
    expect(solak.phase).toBe(4);
    expect(solak.blightBleedStacks).toBe(1);
  });

  it('ticks compounding Blight Bleed in Phase 4', () => {
    const solak = initializeSolakState(1);
    solak.phase = 4;
    solak.blightBleedStacks = 1;

    // Stack 1 on 1,000 max HP player -> 25 damage (2.5%)
    const tick1 = processPhase4BlightBleed(solak, 1000);
    expect(tick1.bleedDamage).toBe(25);
    expect(solak.blightBleedStacks).toBe(2);

    // Stack 2 on 1,000 max HP player -> 50 damage (5.0%)
    const tick2 = processPhase4BlightBleed(solak, 1000);
    expect(tick2.bleedDamage).toBe(50);
    expect(solak.blightBleedStacks).toBe(3);
  });
});
