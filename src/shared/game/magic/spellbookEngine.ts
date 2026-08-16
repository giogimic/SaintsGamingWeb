/**
 * Saints Gaming — Combat Spellbook & Rune Catalyst Engine (Bible 10)
 * Evaluates elemental spells, rune consumption, elemental staff catalysts, and magic damage rolls.
 */

export type SpellElement = 'AIR' | 'WATER' | 'EARTH' | 'FIRE' | 'ANCIENT' | 'SAINTS';

export interface SpellDefinition {
  id: string;
  name: string;
  element: SpellElement;
  reqMagicLevel: number;
  baseMaxHit: number;
  runesRequired: Record<string, number>;
  xpAwarded: number;
}

export const CANONICAL_SPELLS: Record<string, SpellDefinition> = {
  spell_wind_strike: {
    id: 'spell_wind_strike',
    name: 'Wind Strike',
    element: 'AIR',
    reqMagicLevel: 1,
    baseMaxHit: 2,
    runesRequired: { rune_air: 1, rune_mind: 1 },
    xpAwarded: 5.5,
  },
  spell_fire_bolt: {
    id: 'spell_fire_bolt',
    name: 'Fire Bolt',
    element: 'FIRE',
    reqMagicLevel: 35,
    baseMaxHit: 12,
    runesRequired: { rune_fire: 4, rune_air: 3, rune_chaos: 1 },
    xpAwarded: 22.5,
  },
  spell_ice_burst: {
    id: 'spell_ice_burst',
    name: 'Ice Burst',
    element: 'ANCIENT',
    reqMagicLevel: 70,
    baseMaxHit: 22,
    runesRequired: { rune_water: 4, rune_chaos: 4, rune_death: 2 },
    xpAwarded: 40,
  },
  spell_fire_wave: {
    id: 'spell_fire_wave',
    name: 'Fire Wave',
    element: 'FIRE',
    reqMagicLevel: 75,
    baseMaxHit: 20,
    runesRequired: { rune_fire: 7, rune_air: 5, rune_blood: 1 },
    xpAwarded: 42.5,
  },
  spell_saints_blast: {
    id: 'spell_saints_blast',
    name: "Saint's Holy Blast",
    element: 'SAINTS',
    reqMagicLevel: 90,
    baseMaxHit: 32,
    runesRequired: { rune_air: 10, rune_death: 4, rune_blood: 2 },
    xpAwarded: 65,
  },
};

/**
 * Attempts to cast an elemental magic spell against a target.
 */
export function castCombatSpell(
  spellId: string,
  playerMagicLevel: number,
  runeInventory: Record<string, number>,
  equippedStaffInfiniteRune?: string,
  damageRandomRoll: number = Math.random()
): {
  success: boolean;
  spell?: SpellDefinition;
  damageDealt: number;
  xpAwarded: number;
  consumedRunes: Record<string, number>;
  reason?: string;
} {
  const spell = CANONICAL_SPELLS[spellId];
  if (!spell) {
    return {
      success: false,
      damageDealt: 0,
      xpAwarded: 0,
      consumedRunes: {},
      reason: 'Unknown spell.',
    };
  }

  if (playerMagicLevel < spell.reqMagicLevel) {
    return {
      success: false,
      damageDealt: 0,
      xpAwarded: 0,
      consumedRunes: {},
      reason: `Requires Magic level ${spell.reqMagicLevel} (Current: ${playerMagicLevel})`,
    };
  }

  // Calculate actual required runes (discounting infinite elemental staff)
  const consumedRunes: Record<string, number> = {};
  for (const [runeId, count] of Object.entries(spell.runesRequired)) {
    if (equippedStaffInfiniteRune === runeId) {
      continue; // Staff provides infinite runes of this type
    }
    if ((runeInventory[runeId] ?? 0) < count) {
      return {
        success: false,
        damageDealt: 0,
        xpAwarded: 0,
        consumedRunes: {},
        reason: `Missing required runes: need ${count}x ${runeId}`,
      };
    }
    consumedRunes[runeId] = count;
  }

  // Roll damage (0 to baseMaxHit)
  const damageDealt = Math.floor(damageRandomRoll * (spell.baseMaxHit + 1));
  const baseCastXp = spell.xpAwarded;
  const damageBonusXp = damageDealt * 2; // +2 XP per damage dealt

  return {
    success: true,
    spell,
    damageDealt,
    xpAwarded: baseCastXp + damageBonusXp,
    consumedRunes,
  };
}
