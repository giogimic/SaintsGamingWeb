import { describe, it, expect } from 'vitest';
import {
  filterAndScaleEncounterEntries,
  generateWildEncounter,
  MapEncounterEntry,
} from './encounterGenerator';

describe('Wild Encounter Generator & Environmental Scaling (Bible 25 & Bible 07)', () => {
  const testPool: MapEncounterEntry[] = [
    {
      speciesId: 'rockitten',
      minLevel: 2,
      maxLevel: 5,
      weight: 50,
      timeOfDay: 'day',
      element: 'Geo',
    },
    {
      speciesId: 'aquafox',
      minLevel: 3,
      maxLevel: 6,
      weight: 30,
      timeOfDay: 'any',
      element: 'Hydro',
    },
    {
      speciesId: 'nightowl',
      minLevel: 5,
      maxLevel: 8,
      weight: 40,
      timeOfDay: 'night',
      element: 'Aero',
    },
    {
      speciesId: 'stormdrake',
      minLevel: 10,
      maxLevel: 15,
      weight: 20,
      timeOfDay: 'any',
      element: 'Volt',
      requiredWeather: 'storm',
    },
  ];

  it('filters nocturnal species during daytime and daytime species at night', () => {
    const dayEligible = filterAndScaleEncounterEntries(testPool, 'day', 'clear');
    expect(dayEligible.some((e) => e.slug === 'rockitten')).toBe(true);
    expect(dayEligible.some((e) => e.slug === 'nightowl')).toBe(false);

    const nightEligible = filterAndScaleEncounterEntries(testPool, 'night', 'clear');
    expect(nightEligible.some((e) => e.slug === 'rockitten')).toBe(false);
    expect(nightEligible.some((e) => e.slug === 'nightowl')).toBe(true);
  });

  it('boosts water creature weight during rain weather', () => {
    const clearList = filterAndScaleEncounterEntries(testPool, 'day', 'clear');
    const rainList = filterAndScaleEncounterEntries(testPool, 'day', 'rain');

    const clearHydro = clearList.find((e) => e.slug === 'aquafox');
    const rainHydro = rainList.find((e) => e.slug === 'aquafox');

    expect(rainHydro?.weight).toBe(45); // 30 * 1.5 = 45
    expect(clearHydro?.weight).toBe(30);
  });

  it('filters storm-only species unless active weather is storm', () => {
    const clearList = filterAndScaleEncounterEntries(testPool, 'day', 'clear');
    expect(clearList.some((e) => e.slug === 'stormdrake')).toBe(false);

    const stormList = filterAndScaleEncounterEntries(testPool, 'day', 'storm');
    expect(stormList.some((e) => e.slug === 'stormdrake')).toBe(true);
  });

  it('generates a complete wild encounter instance with scaled stats and moves', () => {
    const encounter = generateWildEncounter(testPool, 'day', 'clear');

    expect(encounter).not.toBeNull();
    if (encounter) {
      expect(encounter.level).toBeGreaterThanOrEqual(2);
      expect(encounter.level).toBeLessThanOrEqual(6);
      expect(encounter.combatant.maxHp).toBeGreaterThan(20);
      expect(encounter.moves.length).toBeGreaterThanOrEqual(1);
    }
  });
});
