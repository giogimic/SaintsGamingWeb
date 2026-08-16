import { describe, it, expect } from 'vitest';
import {
  startColosseumRun,
  draftModifierOptions,
  applyModifierDraft,
  recordColosseumMistake,
  calculateGloryMultiplier,
  completeColosseumWave,
  COLOSSEUM_WAVES,
} from './colosseumWaveEngine';

describe('Fortis Colosseum Wave Spawner & Modifier Matrix Engine', () => {
  it('initializes 12 waves leading up to Sol Heredit on wave 12', () => {
    expect(COLOSSEUM_WAVES.length).toBe(12);
    expect(COLOSSEUM_WAVES[11].enemies[0].enemyId).toBe('sol_heredit');
    expect(COLOSSEUM_WAVES[11].enemies[0].baseHp).toBe(900);

    const run = startColosseumRun('run_01');
    expect(run.currentWave).toBe(1);
    expect(run.doomStacks).toBe(0);
    expect(run.totalGlory).toBe(0);
  });

  it('drafts and applies modifiers with max tier enforcement', () => {
    const run = startColosseumRun('run_02');
    const drafts = draftModifierOptions(run.activeModifiers);
    expect(drafts.length).toBe(3);

    // Apply Doom Tier 1
    const apply1 = applyModifierDraft(run, 'doom');
    expect(apply1.success).toBe(true);
    expect(apply1.newTier).toBe(1);
    expect(run.activeModifiers.doom).toBe(1);

    // Apply Doom Tier 2 & 3
    applyModifierDraft(run, 'doom');
    const apply3 = applyModifierDraft(run, 'doom');
    expect(apply3.newTier).toBe(3);

    // Apply Doom Tier 4 (fails: max tier 3)
    const apply4 = applyModifierDraft(run, 'doom');
    expect(apply4.success).toBe(false);
    expect(apply4.error).toContain('maximum tier');
  });

  it('evaluates Doom mistake stacks and causes instant defeat at 3 stacks', () => {
    const run = startColosseumRun('run_03');
    applyModifierDraft(run, 'doom');

    const m1 = recordColosseumMistake(run);
    expect(m1.doomStacks).toBe(1);
    expect(m1.isFatal).toBe(false);
    expect(run.isFailed).toBe(false);

    const m2 = recordColosseumMistake(run);
    expect(m2.doomStacks).toBe(2);
    expect(m2.isFatal).toBe(false);

    // 3rd mistake -> Instant death
    const m3 = recordColosseumMistake(run);
    expect(m3.doomStacks).toBe(3);
    expect(m3.isFatal).toBe(true);
    expect(run.isFailed).toBe(true);
  });

  it('scales glory points with active modifier multipliers and completes run on wave 12', () => {
    const run = startColosseumRun('run_04');
    // Apply Red Flag (tier 1: +0.30) and Mantimayhem (tier 1: +0.20) -> 1.50x multiplier
    applyModifierDraft(run, 'red_flag');
    applyModifierDraft(run, 'mantimayhem');

    expect(calculateGloryMultiplier(run.activeModifiers)).toBeCloseTo(1.50, 2);

    // Complete Wave 1 (Base 100 * 1.5 = 150)
    const wave1 = completeColosseumWave(run);
    expect(wave1.gloryEarned).toBe(150);
    expect(wave1.totalGlory).toBe(150);
    expect(wave1.isRunComplete).toBe(false);
    expect(run.currentWave).toBe(2);
  });
});
