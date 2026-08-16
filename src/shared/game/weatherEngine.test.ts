import { describe, it, expect } from 'vitest';
import { resolveEnvironmentalProfile } from './weatherEngine';

describe('Weather & Environmental Lighting Engine (Bible 25)', () => {
  it('resolves default clear day profile with full sunlight and zero fog', () => {
    const profile = resolveEnvironmentalProfile('day', 'clear');

    expect(profile.weather).toBe('clear');
    expect(profile.lighting).toBe('day');
    expect(profile.ambientColor).toBe('#ffffff');
    expect(profile.sunIntensity).toBe(1.0);
    expect(profile.fogDensity).toBe(0.0);
    expect(profile.particleEffect).toBeUndefined();
    expect(profile.elementalMultipliers.water).toBe(1.0);
  });

  it('applies rain weather modifiers (rain drops, boosted water, reduced fire)', () => {
    const profile = resolveEnvironmentalProfile('day', 'rain');

    expect(profile.fogDensity).toBe(0.25);
    expect(profile.particleEffect).toBe('rain_drops');
    expect(profile.sunIntensity).toBe(0.75);
    expect(profile.elementalMultipliers.water).toBe(1.3);
    expect(profile.elementalMultipliers.fire).toBe(0.7);
  });

  it('applies storm weather modifiers (lightning, boosted electric & water)', () => {
    const profile = resolveEnvironmentalProfile('dusk', 'storm');

    expect(profile.particleEffect).toBe('storm_lightning');
    expect(profile.ambientColor).toBe('#e89758');
    expect(profile.sunIntensity).toBeCloseTo(0.3, 2); // 0.6 * 0.5
    expect(profile.elementalMultipliers.electric).toBe(1.4);
    expect(profile.elementalMultipliers.water).toBe(1.2);
    expect(profile.elementalMultipliers.fire).toBe(0.5);
  });

  it('applies dense fog parameters for fog weather', () => {
    const profile = resolveEnvironmentalProfile('night', 'fog');

    expect(profile.fogDensity).toBe(0.65);
    expect(profile.particleEffect).toBe('fog_mist');
    expect(profile.ambientColor).toBe('#1a233a');
  });
});
