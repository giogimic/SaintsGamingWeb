import { describe, it, expect } from 'vitest';
import {
  initializeWorld Tree GuardianState,
  applyDamageToWorld Tree Guardian,
  processPhase4BlightBleed,
} from './world_tree_guardianPhaseEngine';

describe('World Tree Guardian: The Grove Guardian Phase & Core Engine', () => {
  it('manages limb destruction to expose Blight Core in Phase 1', () => {
    const world_tree_guardian = initializeWorld Tree GuardianState(1); // 3,500,000 HP
    expect(world_tree_guardian.phase).toBe(1);
    expect(world_tree_guardian.isCoreExposed).toBe(false);

    // Destroy Left Leg
    applyDamageToWorld Tree Guardian(world_tree_guardian, 'LEFT_LEG', world_tree_guardian.leftLeg.maxHp);
    expect(world_tree_guardian.leftLeg.hp).toBe(0);
    expect(world_tree_guardian.isCoreExposed).toBe(false);

    // Destroy Right Leg -> Core Exposed
    applyDamageToWorld Tree Guardian(world_tree_guardian, 'RIGHT_LEG', world_tree_guardian.rightLeg.maxHp);
    expect(world_tree_guardian.rightLeg.hp).toBe(0);
    expect(world_tree_guardian.isCoreExposed).toBe(true);

    // Attack Core -> Damage applies directly to World Tree Guardian
    const coreHit = applyDamageToWorld Tree Guardian(world_tree_guardian, 'CORE', 200000);
    expect(coreHit.effectiveDamage).toBe(200000);
    expect(world_tree_guardian.coreHp).toBe(50000);
  });

  it('progresses through Phase 2, Phase 3 Mind Realm, and Phase 4 DPS race', () => {
    const world_tree_guardian = initializeWorld Tree GuardianState(1);

    // Advance to Phase 2 (<= 75% = 2.625M HP)
    applyDamageToWorld Tree Guardian(world_tree_guardian, 'MAIN_BODY', 900000);
    expect(world_tree_guardian.phase).toBe(2);

    // Advance to Phase 3 (<= 50% = 1.75M HP)
    applyDamageToWorld Tree Guardian(world_tree_guardian, 'MAIN_BODY', 900000);
    expect(world_tree_guardian.phase).toBe(3);

    // Cleanse Mind Realm in Phase 3
    applyDamageToWorld Tree Guardian(world_tree_guardian, 'MIND_MANIFESTATION', 500000);
    expect(world_tree_guardian.mindCorruptionPercent).toBe(0);
    expect(world_tree_guardian.phase).toBe(4);
    expect(world_tree_guardian.blightBleedStacks).toBe(1);
  });

  it('ticks compounding Blight Bleed in Phase 4', () => {
    const world_tree_guardian = initializeWorld Tree GuardianState(1);
    world_tree_guardian.phase = 4;
    world_tree_guardian.blightBleedStacks = 1;

    // Stack 1 on 1,000 max HP player -> 25 damage (2.5%)
    const tick1 = processPhase4BlightBleed(world_tree_guardian, 1000);
    expect(tick1.bleedDamage).toBe(25);
    expect(world_tree_guardian.blightBleedStacks).toBe(2);

    // Stack 2 on 1,000 max HP player -> 50 damage (5.0%)
    const tick2 = processPhase4BlightBleed(world_tree_guardian, 1000);
    expect(tick2.bleedDamage).toBe(50);
    expect(world_tree_guardian.blightBleedStacks).toBe(3);
  });
});
