import { describe, it, expect } from 'vitest';
import {
  initializeSolHeredit,
  applyDamageToSol,
  resolveTripleLaser,
  resolveSandTrapCollision,
  calculateRelativePosition,
} from './solHereditEngine';

describe('Sol Heredit Boss Phase Engine & Mechanics', () => {
  it('manages 3 phases, shield parry deflection, and enrage transitions', () => {
    const boss = initializeSolHeredit(900);
    expect(boss.phase).toBe(1);
    expect(boss.isShieldRaised).toBe(false);

    // Damage boss down to Phase 2 (<= 66% = 594 HP)
    const hit1 = applyDamageToSol(boss, 320, 'FRONT');
    expect(hit1.damageDealt).toBe(320);
    expect(hit1.phaseAdvanced).toBe(true);
    expect(boss.phase).toBe(2);
    expect(boss.isShieldRaised).toBe(true);

    // Attack from front while shield is raised -> 0 damage, reflects 15
    const shieldedHit = applyDamageToSol(boss, 100, 'FRONT');
    expect(shieldedHit.damageDealt).toBe(0);
    expect(shieldedHit.reflectedDamage).toBe(15);
    expect(boss.hp).toBe(580);

    // Flank behind -> Bypasses shield
    const flankHit = applyDamageToSol(boss, 300, 'BEHIND');
    expect(flankHit.damageDealt).toBe(300);
    expect(flankHit.reflectedDamage).toBe(0);
    expect(flankHit.phaseAdvanced).toBe(true);
    expect(boss.phase).toBe(3);
    expect(boss.isEnraged).toBe(true);

    // Finish Phase 3 -> Defeated
    const killHit = applyDamageToSol(boss, 300, 'BEHIND');
    expect(killHit.isDefeated).toBe(true);
    expect(boss.isDead).toBe(true);
  });

  it('evaluates Triple Laser lane safety', () => {
    // Left & Center are targeted; Right is safe
    const hit = resolveTripleLaser('LEFT', ['LEFT', 'CENTER']);
    expect(hit.hit).toBe(true);
    expect(hit.damage).toBeGreaterThanOrEqual(40);

    const safe = resolveTripleLaser('RIGHT', ['LEFT', 'CENTER']);
    expect(safe.hit).toBe(false);
    expect(safe.damage).toBe(0);
  });

  it('detects Sand Trap eruptions and knockback', () => {
    const traps = [{ x: 15, y: 15 }, { x: 16, y: 15 }];
    const hit = resolveSandTrapCollision({ x: 15, y: 15 }, traps);
    expect(hit.hit).toBe(true);
    expect(hit.damage).toBe(35);
    expect(hit.knockbackTiles).toBe(2);

    const safe = resolveSandTrapCollision({ x: 14, y: 15 }, traps);
    expect(safe.hit).toBe(false);
    expect(safe.damage).toBe(0);
  });

  it('calculates player relative position to Sol based on facing direction', () => {
    const solPos = { x: 20, y: 20 };
    // Facing SOUTH:
    // Player at (20, 15) is in FRONT (dy < 0)
    expect(calculateRelativePosition(solPos, 'SOUTH', { x: 20, y: 15 })).toBe('FRONT');
    // Player at (20, 25) is BEHIND (dy > 0)
    expect(calculateRelativePosition(solPos, 'SOUTH', { x: 20, y: 25 })).toBe('BEHIND');
    // Player at (25, 20) is on FLANK (dy == 0)
    expect(calculateRelativePosition(solPos, 'SOUTH', { x: 25, y: 20 })).toBe('FLANK');
  });
});
