import { describe, expect, it } from 'vitest';
import { WorldEventEngine } from './worldEventEngine';
import { evaluateAtmosphere } from '../atmosphere/atmospherePresets';

describe('World Event & Realm Mutation Engine (Phase 12)', () => {
  it('manages event lifecycle from initiation to automatic expiry', () => {
    const engine = new WorldEventEngine();
    const baseTime = 1000000000000;

    engine.registerTemplate({
      slug: 'blood_moon_invasion',
      name: 'Blood Moon Invasion',
      description: 'The sky turns crimson as monsters surge.',
      durationSeconds: 3600,
      mutations: {
        spawnRateMultiplier: 2.0,
        weatherOverride: 'BLOOD_RAIN',
        lightingPresetOverride: 'BLOOD_MOON',
      },
    });

    const event = engine.startEvent('blood_moon_invasion', 3600, baseTime);
    expect(event.status).toBe('ACTIVE');
    expect(event.endsAt).toBe(baseTime + 3600 * 1000);

    const stateDuring = engine.getCompiledRealmState(baseTime + 1800 * 1000);
    expect(stateDuring.activeEvents).toHaveLength(1);
    expect(stateDuring.activeWeather).toBe('BLOOD_RAIN');
    expect(stateDuring.activeLightingPreset).toBe('BLOOD_MOON');
    expect(stateDuring.effectiveSpawnRateMultiplier).toBe(2.0);

    // After 3600 seconds -> expired
    const stateAfter = engine.getCompiledRealmState(baseTime + 3601 * 1000);
    expect(stateAfter.activeEvents).toHaveLength(0);
    expect(stateAfter.activeWeather).toBeNull();
    expect(stateAfter.effectiveSpawnRateMultiplier).toBe(1.0);
  });

  it('compounds multipliers deterministically when multiple events overlap', () => {
    const engine = new WorldEventEngine();
    const now = 1000000000000;

    engine.registerTemplate({
      slug: 'harvest_festival',
      name: 'Harvest Festival',
      description: 'Generous yields from gathering.',
      durationSeconds: 7200,
      mutations: {
        gatheringYieldMultiplier: 2.0,
        xpMultiplier: 1.25,
      },
    });

    engine.registerTemplate({
      slug: 'celestial_convergence',
      name: 'Celestial Convergence',
      description: 'Cosmic alignment boosting magic.',
      durationSeconds: 3600,
      mutations: {
        magicPowerMultiplier: 1.5,
        xpMultiplier: 1.2,
      },
    });

    engine.startEvent('harvest_festival', 7200, now);
    engine.startEvent('celestial_convergence', 3600, now);

    const compiled = engine.getCompiledRealmState(now + 1000);
    expect(compiled.activeEvents).toHaveLength(2);
    expect(compiled.effectiveGatheringMultiplier).toBe(2.0);
    expect(compiled.effectiveMagicPowerMultiplier).toBe(1.5);
    // 1.25 * 1.2 = 1.50
    expect(compiled.effectiveXpMultiplier).toBe(1.5);
  });

  it('links world event lighting overrides to atmospherePresets evaluator', () => {
    const engine = new WorldEventEngine();
    const now = 1000000000000;

    engine.registerTemplate({
      slug: 'crimson_eclipse',
      name: 'Crimson Eclipse',
      description: 'Dark crimson atmosphere.',
      durationSeconds: 1800,
      mutations: {
        lightingPresetOverride: 'BLOOD_MOON',
        weatherOverride: 'RAIN',
      },
    });

    engine.startEvent('crimson_eclipse', 1800, now);
    const realmState = engine.getCompiledRealmState(now + 100);

    const atmosphere = evaluateAtmosphere(
      realmState.activeLightingPreset || 'DAY',
      realmState.activeWeather || 'CLEAR',
      'NIGHT'
    );

    expect(atmosphere.lighting.presetKey).toBe('BLOOD_MOON');
    expect(atmosphere.lighting.ambientColor).toBe('#591616');
    expect(atmosphere.weather.weatherKey).toBe('RAIN');
  });
});
