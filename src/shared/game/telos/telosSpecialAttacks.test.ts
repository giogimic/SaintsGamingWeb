import { describe, it, expect } from 'vitest';
import {
  resolveHoldStill,
  initializeTendrilCheck,
  applyDamageToTendrils,
  resolveAnimaBomb,
} from './telosSpecialAttacks';

describe('Titan Special Attacks & Mechanics Engine', () => {
  it('resolves Hold Still slam with Resonance heal vs unmitigated hit & stun', () => {
    // 100% Enrage raw damage = 5000 * 1.5 = 7500
    // Resonance -> 0 damage, heals 7500
    const reso = resolveHoldStill(100, 'RESONANCE');
    expect(reso.isMitigated).toBe(true);
    expect(reso.damageTaken).toBe(0);
    expect(reso.healedAmount).toBe(7500);
    expect(reso.isStunned).toBe(false);

    // Unmitigated -> takes 7500 damage and gets stunned
    const unmit = resolveHoldStill(100, 'NONE', false);
    expect(unmit.isMitigated).toBe(false);
    expect(unmit.damageTaken).toBe(7500);
    expect(unmit.isStunned).toBe(true);

    // Unmitigated with Freedom/Anticipation -> takes 7500 damage but avoids stun
    const free = resolveHoldStill(100, 'NONE', true);
    expect(free.isStunned).toBe(false);
  });

  it('manages Tendril root DPS check to break free', () => {
    // 0% Enrage requires 15,000 damage
    const tendril = initializeTendrilCheck(0);
    expect(tendril.dpsThresholdRequired).toBe(15000);
    expect(tendril.isBroken).toBe(false);

    // Hit 1: 10,000 damage (5,000 remaining)
    const hit1 = applyDamageToTendrils(tendril, 10000);
    expect(hit1.isBroken).toBe(false);
    expect(hit1.damageRemaining).toBe(5000);

    // Hit 2: 6,000 damage -> Breaks free
    const hit2 = applyDamageToTendrils(tendril, 6000);
    expect(hit2.isBroken).toBe(true);
    expect(tendril.isBroken).toBe(true);
  });

  it('resolves Anima Bomb font absorption vs outside lethal blast', () => {
    // Inside charged font -> 100% absorbed (0 damage)
    const absorbed = resolveAnimaBomb(100, true, true);
    expect(absorbed.absorbed).toBe(true);
    expect(absorbed.damageDealt).toBe(0);

    // Outside font at 100% Enrage -> takes 12000 * 1.5 = 18,000 lethal damage
    const blast = resolveAnimaBomb(100, false, false);
    expect(blast.absorbed).toBe(false);
    expect(blast.damageDealt).toBe(18000);
  });
});
