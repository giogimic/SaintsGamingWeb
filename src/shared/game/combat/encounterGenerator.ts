/**
 * Saints Gaming — Wild Encounter Generator & Dynamic Environmental Scaling (Bible 25 & Bible 07)
 * Generates wild battle encounters dynamically modulated by time-of-day, active weather, and player level.
 */

import { WeatherType } from '../weatherEngine';
import { ElementType } from '../elementMatchups';
import { BattleCombatantStats, BattleMove } from './buddyBattleEngine';
import { pickWeightedSlug } from '../encounterWeights';

export interface MapEncounterEntry {
  speciesId: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
  timeOfDay?: 'any' | 'day' | 'night';
  element?: ElementType;
  requiredWeather?: WeatherType;
}

export interface GeneratedWildEncounter {
  speciesId: string;
  level: number;
  isShiny: boolean;
  combatant: BattleCombatantStats;
  moves: BattleMove[];
}

/**
 * Computes dynamic spawn weights based on time-of-day and environmental weather conditions.
 */
export function filterAndScaleEncounterEntries(
  pool: MapEncounterEntry[],
  timeOfDay: 'day' | 'night' = 'day',
  weather: WeatherType = 'clear'
): Array<{ slug: string; weight: number; entry: MapEncounterEntry }> {
  const result: Array<{ slug: string; weight: number; entry: MapEncounterEntry }> = [];

  for (const entry of pool) {
    // 1. Time-of-Day Filter
    if (entry.timeOfDay && entry.timeOfDay !== 'any' && entry.timeOfDay !== timeOfDay) {
      continue;
    }

    // 2. Strict Weather Requirement Check
    if (entry.requiredWeather && entry.requiredWeather !== weather) {
      continue;
    }

    // 3. Environmental Weather Synergy Multiplier
    let weightMultiplier = 1.0;
    if (weather === 'rain' && entry.element === 'Hydro') weightMultiplier = 1.5;
    if (weather === 'storm' && (entry.element === 'Volt' || entry.element === 'Hydro')) weightMultiplier = 1.5;
    if (weather === 'snow' && entry.element === 'Cryo') weightMultiplier = 1.5;

    const finalWeight = Math.max(1, Math.round(entry.weight * weightMultiplier));
    result.push({
      slug: entry.speciesId,
      weight: finalWeight,
      entry,
    });
  }

  return result;
}

/**
 * Generates a full wild encounter combatant ready for a Turn-Based Buddy Battle.
 */
export function generateWildEncounter(
  pool: MapEncounterEntry[],
  timeOfDay: 'day' | 'night' = 'day',
  weather: WeatherType = 'clear',
  rng: () => number = Math.random
): GeneratedWildEncounter | null {
  const eligible = filterAndScaleEncounterEntries(pool, timeOfDay, weather);
  if (!eligible.length) return null;

  const pickedSlug = pickWeightedSlug(eligible, rng);
  const matchingItem = eligible.find((e) => e.slug === pickedSlug) || eligible[0];
  const { entry } = matchingItem;

  // Level selection in range [minLevel, maxLevel]
  const levelSpan = Math.max(0, entry.maxLevel - entry.minLevel);
  const level = entry.minLevel + Math.floor(rng() * (levelSpan + 1));

  // Shiny Roll (1 in 512 base)
  const isShiny = rng() < (1 / 512);

  // Scaled Base Stats
  const baseHp = 20 + level * 3;
  const baseAtk = 10 + level * 2;
  const baseDef = 8 + level * 2;
  const baseSpd = 10 + level * 1.5;

  const combatant: BattleCombatantStats = {
    level,
    maxHp: baseHp,
    currentHp: baseHp,
    attack: baseAtk,
    defense: baseDef,
    speed: Math.round(baseSpd),
    element: entry.element || 'None',
    status: null,
  };

  const defaultMove: BattleMove = {
    id: 'tackle',
    name: 'Tackle',
    power: 35,
    accuracy: 95,
    element: 'None',
  };

  const elementalMove: BattleMove | undefined = entry.element && entry.element !== 'None'
    ? {
        id: `${entry.element.toLowerCase()}_strike`,
        name: `${entry.element} Strike`,
        power: 40,
        accuracy: 100,
        element: entry.element,
      }
    : undefined;

  return {
    speciesId: entry.speciesId,
    level,
    isShiny,
    combatant,
    moves: elementalMove ? [defaultMove, elementalMove] : [defaultMove],
  };
}
