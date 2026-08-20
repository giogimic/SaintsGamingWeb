/**
 * Saints Gaming — Canonical Elemental Type Chart Engine (Bible 25 §3.7 & Bible 11 §3)
 * Defines the canonical attacker -> defender multiplier matrix for both:
 * 1. Real-Time MMO Hero Battles (monsters, bosses, player abilities, equipment)
 * 2. Instanced Turn-Based Saints Buddy Battles (creatures & collection)
 */

export const CANONICAL_ELEMENT_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'earth',
  'wind',
  'shadow',
  'holy',
  'none',
] as const;

export type ElementType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'earth'
  | 'wind'
  | 'shadow'
  | 'holy'
  | 'none'
  | 'None'
  | 'Solar'
  | 'Hydro'
  | 'Bio'
  | 'Volt'
  | 'Geo'
  | 'Cryo'
  | 'Aero'
  | 'Cyber';

export interface TypeChartDef {
  id: string;
  name: string;
  matrix: Record<string, Record<string, number>>;
}

/**
 * Normalizes any element name (including legacy aliases) to a canonical lower-case key.
 */
export function normalizeElementType(type: string | undefined | null): string {
  if (!type) return 'none';
  const clean = type.trim().toLowerCase();
  switch (clean) {
    case 'solar':
      return 'fire';
    case 'hydro':
      return 'water';
    case 'bio':
    case 'wood':
    case 'plant':
      return 'grass';
    case 'volt':
    case 'electricity':
      return 'electric';
    case 'geo':
      return 'earth';
    case 'cryo':
    case 'frost':
      return 'ice';
    case 'aero':
    case 'sky':
    case 'air':
      return 'wind';
    case 'cyber':
    case 'dark':
      return 'shadow';
    case 'sacred':
    case 'light':
    case 'aether':
      return 'holy';
    case '':
    case 'none':
      return 'none';
    default:
      return clean;
  }
}

export const CANONICAL_TYPE_CHART: TypeChartDef = {
  id: 'standard_elemental_v1',
  name: 'Standard 10-Element Matrix',
  matrix: {
    fire: {
      grass: 2.0,
      ice: 2.0,
      water: 0.5,
      fire: 0.5,
    },
    water: {
      fire: 2.0,
      earth: 2.0,
      grass: 0.5,
      water: 0.5,
    },
    grass: {
      water: 2.0,
      earth: 2.0,
      fire: 0.5,
      grass: 0.5,
    },
    electric: {
      water: 2.0,
      wind: 2.0,
      earth: 0.0,
      electric: 0.5,
    },
    ice: {
      grass: 2.0,
      earth: 2.0,
      wind: 2.0,
      fire: 0.5,
      ice: 0.5,
    },
    earth: {
      fire: 2.0,
      electric: 2.0,
      wind: 0.5,
      grass: 0.5,
    },
    wind: {
      grass: 2.0,
      earth: 1.5,
      electric: 0.5,
    },
    shadow: {
      holy: 2.0,
      shadow: 0.5,
      normal: 1.2,
    },
    holy: {
      shadow: 2.0,
      holy: 0.5,
    },
    normal: {
      shadow: 0.8,
    },
  },
};

/**
 * Calculates the elemental damage multiplier given attacking type and defending type(s).
 */
export function getElementalMultiplier(
  attackType: ElementType | string,
  defendTypes: ElementType | string | (ElementType | string)[],
  typeChart: TypeChartDef = CANONICAL_TYPE_CHART
): number {
  const atk = normalizeElementType(attackType);
  if (atk === 'none') return 1.0;

  const defs = Array.isArray(defendTypes)
    ? defendTypes.map((d) => normalizeElementType(d))
    : [normalizeElementType(defendTypes)];

  let multiplier = 1.0;
  const atkRow = typeChart.matrix[atk];

  if (!atkRow) return 1.0;

  for (const def of defs) {
    if (def === 'none') continue;
    if (def in atkRow) {
      multiplier *= atkRow[def];
    }
  }

  return multiplier;
}

/**
 * Single canonical 1v1 combat multiplier resolver for both MMO & Buddy battles.
 */
export function getCombatMultiplier(
  attacker: ElementType | string,
  defender: ElementType | string,
  typeChart: TypeChartDef = CANONICAL_TYPE_CHART
): number {
  return getElementalMultiplier(attacker, defender, typeChart);
}

