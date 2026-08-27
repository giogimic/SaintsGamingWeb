import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_LIGHTING_PRESETS,
  WEATHER_VISUAL_PROFILES,
  evaluateAtmosphere,
} from './atmospherePresets';

describe('atmospherePresets', () => {
  it('defines the core lighting presets with valid color and bloom values', () => {
    expect(ATMOSPHERE_LIGHTING_PRESETS.DAY).toBeDefined();
    expect(ATMOSPHERE_LIGHTING_PRESETS.NIGHT).toBeDefined();
    expect(ATMOSPHERE_LIGHTING_PRESETS.DUNGEON).toBeDefined();
    expect(ATMOSPHERE_LIGHTING_PRESETS.BLOOD_MOON).toBeDefined();
    expect(ATMOSPHERE_LIGHTING_PRESETS.CYBER_NEON).toBeDefined();

    expect(ATMOSPHERE_LIGHTING_PRESETS.DAY.ambientColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(ATMOSPHERE_LIGHTING_PRESETS.DAY.bloomIntensity).toBeGreaterThan(0);
  });

  it('defines weather particle configurations and screen effects', () => {
    expect(WEATHER_VISUAL_PROFILES.RAIN.particleCount).toBeGreaterThan(0);
    expect(WEATHER_VISUAL_PROFILES.RAIN.screenEffect).toBe('rain_streaks');
    expect(WEATHER_VISUAL_PROFILES.THUNDERSTORM.screenEffect).toBe('thunder_flash');
    expect(WEATHER_VISUAL_PROFILES.SNOW.screenEffect).toBe('snow_vignette');
  });

  it('evaluates standard daylight and clear weather by default', () => {
    const result = evaluateAtmosphere();
    expect(result.lighting.presetKey).toBe('DAY');
    expect(result.weather.weatherKey).toBe('CLEAR');
    expect(result.isNight).toBe(false);
    expect(result.finalFogDensity).toBe(ATMOSPHERE_LIGHTING_PRESETS.DAY.fogDensity);
  });

  it('increases fog density when adverse weather (fog, thunderstorm) is active', () => {
    const clearResult = evaluateAtmosphere('DAY', 'CLEAR');
    const fogResult = evaluateAtmosphere('DAY', 'FOG');
    const stormResult = evaluateAtmosphere('DAY', 'THUNDERSTORM');

    expect(fogResult.finalFogDensity).toBeGreaterThan(clearResult.finalFogDensity);
    expect(stormResult.finalFogDensity).toBeGreaterThan(clearResult.finalFogDensity);
  });

  it('falls back gracefully on invalid preset keys', () => {
    const result = evaluateAtmosphere('NON_EXISTENT_PRESET', 'UNKNOWN_WEATHER');
    expect(result.lighting.presetKey).toBe('DAY');
    expect(result.weather.weatherKey).toBe('CLEAR');
  });
});
