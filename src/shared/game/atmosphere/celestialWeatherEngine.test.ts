import { describe, expect, it } from 'vitest';
import { CelestialWeatherEngine } from './celestialWeatherEngine';

describe('Master World Time, Astronomical Celestial Events & Seasonal Weather Engine (Phase 35)', () => {
  it('computes synchronized realm clock hours, minutes, and time-of-day periods', () => {
    const engine = new CelestialWeatherEngine();

    // 1 real hour = 1 in-game day (3600 seconds)
    // 1800 real seconds = 12:00 (Noon, DAY)
    const midDay = engine.calculateClock(1800 * 1000, 3600);
    expect(midDay.inGameHour).toBe(12);
    expect(midDay.inGameMinute).toBe(0);
    expect(midDay.period).toBe('DAY');

    // 0 real seconds = 00:00 (Midnight, NIGHT)
    const midnight = engine.calculateClock(0, 3600);
    expect(midnight.inGameHour).toBe(0);
    expect(midnight.period).toBe('NIGHT');

    // 900 real seconds = 06:00 (DAWN)
    const dawn = engine.calculateClock(900 * 1000, 3600);
    expect(dawn.inGameHour).toBe(6);
    expect(dawn.period).toBe('DAWN');
  });

  it('determines cyclical astronomical lunar phases accurately', () => {
    const engine = new CelestialWeatherEngine();

    expect(engine.calculateLunarPhase(0)).toBe('NEW_MOON');
    expect(engine.calculateLunarPhase(14)).toBe('FULL_MOON');
    expect(engine.calculateLunarPhase(27)).toBe('BLOOD_ECLIPSE');
    expect(engine.calculateLunarPhase(13)).toBe('SOLAR_SOLSTICE');
  });

  it('calculates gameplay modifiers for harsh weather and celestial alignments', () => {
    const engine = new CelestialWeatherEngine();

    // 1. Blizzard during Blood Eclipse
    const modBlizzard = engine.calculateModifiers('BLOOD_ECLIPSE', 'BLIZZARD');
    expect(modBlizzard.moveSpeedMultiplier).toBe(0.8);
    expect(modBlizzard.projectileAccuracyPenalty).toBe(20);
    expect(modBlizzard.shadowMagicBonusPercent).toBe(25);
    expect(modBlizzard.lightningHazardActive).toBe(false);

    // 2. Thunderstorm during Solar Solstice
    const modStorm = engine.calculateModifiers('SOLAR_SOLSTICE', 'THUNDERSTORM');
    expect(modStorm.moveSpeedMultiplier).toBe(0.9);
    expect(modStorm.lightningHazardActive).toBe(true);
    expect(modStorm.holyPrayerBonusPercent).toBe(25);
  });
});
