export type ElementType = 'Solar' | 'Hydro' | 'Bio' | 'Volt' | 'Geo' | 'Cryo' | 'Aero' | 'Cyber' | 'None';

type MatchupMap = {
  [key in ElementType]?: {
    strongAgainst: ElementType[];
    weakAgainst: ElementType[];
  }
};

const ELEMENT_MATCHUPS: MatchupMap = {
  Solar: { strongAgainst: ['Bio', 'Cryo'], weakAgainst: ['Hydro', 'Cyber'] },
  Hydro: { strongAgainst: ['Solar', 'Geo'], weakAgainst: ['Volt', 'Bio'] },
  Bio: { strongAgainst: ['Geo', 'Volt'], weakAgainst: ['Solar', 'Cryo'] },
  Volt: { strongAgainst: ['Hydro', 'Aero'], weakAgainst: ['Geo', 'Cyber'] },
  Geo: { strongAgainst: ['Volt', 'Cryo'], weakAgainst: ['Hydro', 'Bio'] },
  Cryo: { strongAgainst: ['Bio', 'Aero'], weakAgainst: ['Solar', 'Geo'] },
  Aero: { strongAgainst: ['Bio', 'Solar'], weakAgainst: ['Volt', 'Cryo'] },
  Cyber: { strongAgainst: ['Solar', 'Hydro', 'Volt'], weakAgainst: ['Bio', 'Geo'] },
  None: { strongAgainst: [], weakAgainst: [] }
};

/**
 * Combat Matrix: 8 Reactive Elements
 * Returns the damage multiplier (1.5x for advantage, 1.0x for neutral, 0.5x for disadvantage)
 */
export function getCombatMultiplier(attacker: ElementType, defender: ElementType): number {
  if (attacker === 'None' || defender === 'None') return 1.0;
  if (attacker === defender) return 1.0;

  const attackerMatchup = ELEMENT_MATCHUPS[attacker];
  if (attackerMatchup?.strongAgainst.includes(defender)) return 1.5;
  if (attackerMatchup?.weakAgainst.includes(defender)) return 0.5;

  return 1.0; // Neutral matchup
}
