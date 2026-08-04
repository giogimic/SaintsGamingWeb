import type { PlayerState } from "./store";
import { getItem } from "./data/items";
import { getCreatureById } from "./data/saints-dex";
import {
  getCombatMultiplier,
  type ElementType,
} from "@/shared/game/elementMatchups";

export type { ElementType };
export { getCombatMultiplier };

/**
 * Calculates the total effective ATK and DEF for a player by combining:
 * 1. Player Level (Base stats)
 * 2. Active Daemon stats
 * 3. Equipment stats
 */
export function calculatePlayerCombatStats(player: PlayerState) {
  let totalAtk = player.level * 2;
  let totalDef = player.level * 2;

  if (player.activeDaemonId) {
    const daemon = getCreatureById(player.activeDaemonId);
    if (daemon) {
      totalAtk += daemon.stat_profile.ATK * 0.3;
      totalDef += daemon.stat_profile.DEF * 0.3;
    }
  }

  const eq = player.equipment;
  const slots = [eq.head, eq.chest, eq.legs, eq.weapon];
  slots.forEach((itemId) => {
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
    def: Math.floor(totalDef),
  };
}
