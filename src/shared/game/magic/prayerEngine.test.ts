import { describe, it, expect } from 'vitest';
import {
  createPlayerPrayerState,
  togglePrayer,
  drainPrayerTick,
} from './prayerEngine';

describe('Prayer Blessing & Protection Overhead Aura Engine (Bible 10)', () => {
  it('toggles combat stat prayers and protects against low prayer levels', () => {
    const state = createPlayerPrayerState(50);

    // Toggle Thick Skin (level 1 req, success)
    const toggle1 = togglePrayer(state, 'thick_skin', 50);
    expect(toggle1.success).toBe(true);
    expect(toggle1.active).toBe(true);
    expect(state.activePrayerIds).toContain('thick_skin');

    // Attempt to toggle Protect from Melee with low level (requires 43, player has 30 -> blocked)
    const toggleFail = togglePrayer(state, 'protect_from_melee', 30);
    expect(toggleFail.success).toBe(false);
    expect(toggleFail.reason).toContain('Requires Prayer level 43');
  });

  it('enforces mutual exclusivity on overhead protection prayers', () => {
    const state = createPlayerPrayerState(50);

    // Activate Protect from Melee
    togglePrayer(state, 'protect_from_melee', 50);
    expect(state.overheadIcon).toBe('PROTECT_FROM_MELEE');
    expect(state.activePrayerIds).toContain('protect_from_melee');

    // Activate Protect from Missiles -> Should replace Melee
    togglePrayer(state, 'protect_from_missiles', 50);
    expect(state.overheadIcon).toBe('PROTECT_FROM_MISSILES');
    expect(state.activePrayerIds).toContain('protect_from_missiles');
    expect(state.activePrayerIds).not.toContain('protect_from_melee');
  });

  it('drains prayer points over time and discharges all prayers at 0 points', () => {
    const state = createPlayerPrayerState(5); // 5 points
    togglePrayer(state, 'protect_from_melee', 50); // 0.33 drain/sec

    // 10 seconds elapsed -> 3.3 drain (without gear bonus)
    const drain1 = drainPrayerTick(state, 10, 0);
    expect(drain1.prayersDischarged).toBe(false);
    expect(state.currentPrayerPoints).toBeCloseTo(1.7, 1);

    // Another 10 seconds elapsed -> Points hit 0, discharges prayers
    const drain2 = drainPrayerTick(state, 10, 0);
    expect(drain2.prayersDischarged).toBe(true);
    expect(state.currentPrayerPoints).toBe(0);
    expect(state.activePrayerIds.length).toBe(0);
    expect(state.overheadIcon).toBeUndefined();
  });
});
