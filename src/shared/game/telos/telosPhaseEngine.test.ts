import { describe, it, expect } from 'vitest';
import {
  calculateEnrageScaling,
  initializeTelosState,
  applyDamageToTelos,
  tickAnimaBeam,
} from './telosPhaseEngine';

describe('Telos: Warden of the Telosian Core Phase & Enrage Engine', () => {
  it('scales boss stats across Enrage percentages (0% vs 500%) and unlocks Phase 5', () => {
    // 0% Enrage -> 1.0x HP/Dmg, No Phase 5
    const zero = calculateEnrageScaling(0);
    expect(zero.hpMultiplier).toBe(1.0);
    expect(zero.damageMultiplier).toBe(1.0);
    expect(zero.unlocksPhase5).toBe(false);

    // 500% Enrage -> 1 + 5*0.25 = 2.25x HP, 1 + 5*0.50 = 3.5x Dmg, Phase 5 unlocked
    const high = calculateEnrageScaling(500);
    expect(high.hpMultiplier).toBe(2.25);
    expect(high.damageMultiplier).toBe(3.5);
    expect(high.unlocksPhase5).toBe(true);
  });

  it('progresses through Phase 1 -> 4 at 0% Enrage and defeats Telos', () => {
    const telos = initializeTelosState(0); // 600,000 HP
    expect(telos.phase).toBe(1);
    expect(telos.activeAnimaBeam).toBe('GREEN');

    // P1 -> P2 at <= 75% (450k)
    const hit1 = applyDamageToTelos(telos, 160000);
    expect(hit1.phaseAdvanced).toBe(true);
    expect(telos.phase).toBe(2);
    expect(telos.activeAnimaBeam).toBe('BLACK');

    // P2 -> P3 at <= 50% (300k) (player blocks black beam to deal full damage)
    telos.playerBlockingBeam = true;
    applyDamageToTelos(telos, 150000);
    expect(telos.phase).toBe(3);
    expect(telos.activeAnimaBeam).toBe('RED');

    // P3 -> P4 at <= 25% (150k)
    applyDamageToTelos(telos, 150000);
    expect(telos.phase).toBe(4);

    // Finish Phase 4 at 0% Enrage -> Boss Defeated
    const kill = applyDamageToTelos(telos, 150000);
    expect(kill.isDefeated).toBe(true);
    expect(telos.isDead).toBe(true);
  });

  it('unlocks Phase 5 at 100%+ Enrage after clearing Phase 4', () => {
    const telos = initializeTelosState(150); // 150% Enrage -> Unlocks Phase 5
    telos.phase = 4;
    telos.hp = 10000;

    const hit = applyDamageToTelos(telos, 10000);
    expect(hit.phaseAdvanced).toBe(true);
    expect(hit.newPhase).toBe(5);
    expect(telos.phase).toBe(5);
    expect(telos.isDead).toBe(false);
    expect(telos.hp).toBeGreaterThan(0);
  });

  it('evaluates Anima Beam standing effects (Green boost vs Black defense)', () => {
    const telos = initializeTelosState(0);
    telos.activeAnimaBeam = 'GREEN';

    // Player inside Green beam -> +35% damage, 5 prayer drain
    const greenInside = tickAnimaBeam(telos, true);
    expect(greenInside.playerDamageMultiplier).toBe(1.35);
    expect(greenInside.playerPrayerDrain).toBe(5);

    // Player outside Black beam -> Telos heavily reduces incoming damage
    telos.activeAnimaBeam = 'BLACK';
    const blackOutside = tickAnimaBeam(telos, false);
    expect(blackOutside.playerDamageMultiplier).toBe(0.25);
    expect(blackOutside.telosBuffed).toBe(true);
  });
});
