import { describe, it, expect } from 'vitest';
import {
  initializeNexState,
  applyDamageToNex,
  resolveBloodSacrifice,
  resolveIcePrison,
  resolveShadowTrap,
} from './nexPhaseEngine';

describe('Nex: Angel of Death Phase Engine & Mechanics', () => {
  it('advances through 5 elemental phases and handles Blood Siphon healing', () => {
    const nex = initializeNexState(1); // 3,000,000 HP
    expect(nex.phase).toBe('SMOKE');

    // Phase 1 -> Phase 2 (Drop below 80% = 2.4M HP)
    const hit1 = applyDamageToNex(nex, 650000);
    expect(hit1.phaseTransitioned).toBe(true);
    expect(hit1.newPhase).toBe('SHADOW');
    expect(nex.phase).toBe('SHADOW');

    // Drop below 60% = 1.8M HP -> BLOOD Phase
    const hit2 = applyDamageToNex(nex, 600000);
    expect(hit2.newPhase).toBe('BLOOD');

    // Enable Blood Siphon -> Attack heals Nex
    nex.isSiphoningBlood = true;
    const healHit = applyDamageToNex(nex, 100000);
    expect(healHit.effectiveDamage).toBe(0);
    expect(healHit.healedAmount).toBe(100000);
    expect(nex.hp).toBe(1850000);

    // Disable Siphon, drop below 40% = 1.2M -> ICE Phase
    nex.isSiphoningBlood = false;
    const hit3 = applyDamageToNex(nex, 700000);
    expect(hit3.newPhase).toBe('ICE');

    // Drop below 20% = 600k -> ZAROS ENRAGE
    const hit4 = applyDamageToNex(nex, 600000);
    expect(hit4.newPhase).toBe('ZAROS_ENRAGE');
    expect(nex.isEnraged).toBe(true);
  });

  it('evaluates Blood Sacrifice 7-tile distance escape', () => {
    const nexPos = { x: 20, y: 20 };

    // Player ran 8 tiles away (20, 28) -> Escaped
    const escape = resolveBloodSacrifice({ x: 20, y: 28 }, nexPos, 990, 990, 99);
    expect(escape.escaped).toBe(true);
    expect(escape.damageDealt).toBe(0);

    // Player stayed close (20, 24 = 4 tiles) -> Takes 80% HP sacrifice damage and 33% prayer drain
    const trapped = resolveBloodSacrifice({ x: 20, y: 24 }, nexPos, 990, 990, 99);
    expect(trapped.escaped).toBe(false);
    expect(trapped.damageDealt).toBe(792); // 990 * 0.80
    expect(trapped.prayerDrained).toBe(33); // 99 * 0.33
  });

  it('resolves Ice Prison shatter damage vs broken prison', () => {
    // Teammates broke prison (remaining HP 0) -> 15% minor damage
    const broken = resolveIcePrison(0, 990);
    expect(broken.broken).toBe(true);
    expect(broken.damageDealt).toBe(149);

    // Prison not broken -> 95% shattering lethal damage
    const unbroken = resolveIcePrison(15000, 990);
    expect(unbroken.broken).toBe(false);
    expect(unbroken.damageDealt).toBe(941);
  });

  it('resolves Shadow Trap collision', () => {
    const traps = [{ x: 15, y: 15 }, { x: 16, y: 16 }];
    // Direct trap hit
    const hit = resolveShadowTrap({ x: 15, y: 15 }, traps);
    expect(hit.triggered).toBe(true);
    expect(hit.damageDealt).toBeGreaterThanOrEqual(45);

    // Safe step
    const safe = resolveShadowTrap({ x: 14, y: 15 }, traps);
    expect(safe.triggered).toBe(false);
    expect(safe.damageDealt).toBe(0);
  });
});
