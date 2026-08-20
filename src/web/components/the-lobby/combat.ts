import type { PlayerState } from "./store";
import { getItem } from "./data/items";
import { getCreatureById } from "./data/saints-dex";
import {
  getCombatMultiplier,
  type ElementType,
} from "../../../shared/game/combat/typeChartEngine";

export type { ElementType };
export { getCombatMultiplier };

/**
 * Calculates the total effective ATK and DEF for a player by combining:
 * 1. Player Level (Base stats)
 * 2. Active Daemon stats
 * 3. Equipment stats
 */
export function calculatePlayerCombatStats(player: PlayerState) {
  let totalAtk = (player?.level || 1) * 2;
  let totalDef = (player?.level || 1) * 2;

  if (player?.activeDaemonId) {
    const daemon = getCreatureById(player.activeDaemonId);
    if (daemon?.stat_profile) {
      totalAtk += (daemon.stat_profile.ATK || 0) * 0.3;
      totalDef += (daemon.stat_profile.DEF || 0) * 0.3;
    }
  }

  const eq = player?.equipment || { head: null, chest: null, legs: null, weapon: null };
  const slots = Object.values(eq);
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

import {
  calculateCombatHitDamage,
  type CombatHitResult,
} from "../../../shared/game/combat/combatBalanceEngine";

export { calculateCombatHitDamage, type CombatHitResult };

export {
  computeArmorClass,
  rollHeroAttack,
  rollElementalSave,
  rollInspirationDie,
  type HeroAttackOptions,
  type HeroAttackResult,
} from "../../../shared/game/heroCombatD20";


