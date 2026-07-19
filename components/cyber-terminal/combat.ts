export type ElementType = 'Solar' | 'Hydro' | 'Bio' | 'Volt' | 'Geo' | 'Cryo' | 'Aero' | 'Cyber' | 'None';

import type { PlayerState } from './store';
import { getItem } from './data/items';
import { getCreatureById } from './data/saints-dex';

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

/**
 * Calculates the total effective ATK and DEF for a player by combining:
 * 1. Player Level (Base stats)
 * 2. Active Daemon stats
 * 3. Equipment stats
 */
export function calculatePlayerCombatStats(player: PlayerState) {
  // Base stats from level
  let totalAtk = player.level * 2;
  let totalDef = player.level * 2;

  // Add Daemon stats
  if (player.activeDaemonId) {
    const daemon = getCreatureById(player.activeDaemonId);
    if (daemon) {
      totalAtk += daemon.stat_profile.ATK * 0.3; // Daemon contributes 30% of its ATK
      totalDef += daemon.stat_profile.DEF * 0.3; // Daemon contributes 30% of its DEF
    }
  }

  // Add Equipment stats
  const eq = player.equipment;
  const slots = [eq.head, eq.chest, eq.legs, eq.weapon];
  slots.forEach(itemId => {
    if (itemId) {
      const item = getItem(itemId);
      if (item?.stats) {
        if (item.stats.atk) totalAtk += item.stats.atk;
        if (item.stats.def) totalDef += item.stats.def;
      }
    }
  });

  return {
    atk: Math.floor(totalAtk),
    def: Math.floor(totalDef)
  };
}
