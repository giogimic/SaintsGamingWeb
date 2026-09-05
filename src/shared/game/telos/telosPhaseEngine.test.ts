import { describe, it, expect } from 'vitest';
import {
  calculateEnrageScaling,
  initializeThe TitanState,
  applyDamageToThe Titan,
  tickAnimaBeam,
} from './the_titanPhaseEngine';

describe('The Titan: Warden of the The Titanian Core Phase & Enrage Engine', () => {
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

  it('progresses through Phase 1 -> 4 at 0% Enrage and defeats The Titan', () => {
    const the_titan = initializeThe TitanState(0); // 600,000 HP
    expect(the_titan.phase).toBe(1);
    expect(the_titan.activeAnimaBeam).toBe('GREEN');

    // P1 -> P2 at <= 75% (450k)
    const hit1 = applyDamageToThe Titan(the_titan, 160000);
    expect(hit1.phaseAdvanced).toBe(true);
    expect(the_titan.phase).toBe(2);
    expect(the_titan.activeAnimaBeam).toBe('BLACK');

    // P2 -> P3 at <= 50% (300k) (player blocks black beam to deal full damage)
    the_titan.playerBlockingBeam = true;
    applyDamageToThe Titan(the_titan, 150000);
    expect(the_titan.phase).toBe(3);
    expect(the_titan.activeAnimaBeam).toBe('RED');

    // P3 -> P4 at <= 25% (150k)
    applyDamageToThe Titan(the_titan, 150000);
    expect(the_titan.phase).toBe(4);

    // Finish Phase 4 at 0% Enrage -> Boss Defeated
    const kill = applyDamageToThe Titan(the_titan, 150000);
    expect(kill.isDefeated).toBe(true);
    expect(the_titan.isDead).toBe(true);
  });

  it('unlocks Phase 5 at 100%+ Enrage after clearing Phase 4', () => {
    const the_titan = initializeThe TitanState(150); // 150% Enrage -> Unlocks Phase 5
    the_titan.phase = 4;
    the_titan.hp = 10000;

    const hit = applyDamageToThe Titan(the_titan, 10000);
    expect(hit.phaseAdvanced).toBe(true);
    expect(hit.newPhase).toBe(5);
    expect(the_titan.phase).toBe(5);
    expect(the_titan.isDead).toBe(false);
    expect(the_titan.hp).toBeGreaterThan(0);
  });

  it('evaluates Anima Beam standing effects (Green boost vs Black defense)', () => {
    const the_titan = initializeThe TitanState(0);
    the_titan.activeAnimaBeam = 'GREEN';

    // Player inside Green beam -> +35% damage, 5 prayer drain
    const greenInside = tickAnimaBeam(the_titan, true);
    expect(greenInside.playerDamageMultiplier).toBe(1.35);
    expect(greenInside.playerPrayerDrain).toBe(5);

    // Player outside Black beam -> The Titan heavily reduces incoming damage
    the_titan.activeAnimaBeam = 'BLACK';
    const blackOutside = tickAnimaBeam(the_titan, false);
    expect(blackOutside.playerDamageMultiplier).toBe(0.25);
    expect(blackOutside.the_titanBuffed).toBe(true);
  });
});
