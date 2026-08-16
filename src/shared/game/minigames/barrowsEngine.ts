/**
 * Saints Gaming — Barrows Crypts & Ghost Brother Matrix Engine (Bible 27)
 * Manages 6 barrows brother crypts, hidden tunnel discovery, combat triggers, and reward chest loot rolls.
 */

export type BarrowsBrotherId = 'AHRIM' | 'DHAROK' | 'GUTHAN' | 'KARIL' | 'TORAG' | 'VERAC';

export interface BarrowsBrotherDefinition {
  id: BarrowsBrotherId;
  name: string;
  combatLevel: number;
  maxHp: number;
  specialAbility: string;
  armorDrops: string[];
}

export const CANONICAL_BROTHERS: Record<BarrowsBrotherId, BarrowsBrotherDefinition> = {
  DHAROK: {
    id: 'DHAROK',
    name: 'Dharok the Wretched',
    combatLevel: 115,
    maxHp: 100,
    specialAbility: 'WRETCHED_STRENGTH', // Hits harder at low HP
    armorDrops: ['equip_dharok_helm', 'equip_dharok_platebody', 'equip_dharok_platelegs', 'equip_dharok_greataxe'],
  },
  AHRIM: {
    id: 'AHRIM',
    name: 'Ahrim the Blighted',
    combatLevel: 98,
    maxHp: 100,
    specialAbility: 'STAT_DRAIN_MAGIC',
    armorDrops: ['equip_ahrim_hood', 'equip_ahrim_robe_top', 'equip_ahrim_robe_skirt', 'equip_ahrim_staff'],
  },
  GUTHAN: {
    id: 'GUTHAN',
    name: 'Guthan the Infested',
    combatLevel: 115,
    maxHp: 100,
    specialAbility: 'LIFE_LEECH',
    armorDrops: ['equip_guthan_helm', 'equip_guthan_platebody', 'equip_guthan_chainskirt', 'equip_guthan_warspear'],
  },
  KARIL: {
    id: 'KARIL',
    name: 'Karil the Tainted',
    combatLevel: 98,
    maxHp: 100,
    specialAbility: 'AGILITY_DRAIN_BOLTS',
    armorDrops: ['equip_karil_coif', 'equip_karil_leathertop', 'equip_karil_leatherskirt', 'equip_karil_crossbow'],
  },
  TORAG: {
    id: 'TORAG',
    name: 'Torag the Corrupted',
    combatLevel: 115,
    maxHp: 100,
    specialAbility: 'ENERGY_DRAIN_HAMMERS',
    armorDrops: ['equip_torag_helm', 'equip_torag_platebody', 'equip_torag_platelegs', 'equip_torag_hammers'],
  },
  VERAC: {
    id: 'VERAC',
    name: 'Verac the Defiled',
    combatLevel: 115,
    maxHp: 100,
    specialAbility: 'ARMOUR_PIERCE',
    armorDrops: ['equip_verac_helm', 'equip_verac_brassard', 'equip_verac_plateskirt', 'equip_verac_flail'],
  },
};

export interface BarrowsSessionState {
  playerId: string;
  hiddenTunnelBrother: BarrowsBrotherId;
  defeatedBrothers: BarrowsBrotherId[];
  cryptsSearched: BarrowsBrotherId[];
  tunnelEntered: boolean;
  chestOpened: boolean;
}

const ALL_BROTHER_IDS: BarrowsBrotherId[] = ['AHRIM', 'DHAROK', 'GUTHAN', 'KARIL', 'TORAG', 'VERAC'];

/**
 * Initializes a new Barrows run session.
 */
export function startBarrowsRun(
  playerId: string,
  forcedTunnelBrother?: BarrowsBrotherId
): BarrowsSessionState {
  const tunnelBrother =
    forcedTunnelBrother ??
    ALL_BROTHER_IDS[Math.floor(Math.random() * ALL_BROTHER_IDS.length)];

  return {
    playerId,
    hiddenTunnelBrother: tunnelBrother,
    defeatedBrothers: [],
    cryptsSearched: [],
    tunnelEntered: false,
    chestOpened: false,
  };
}

/**
 * Searches a sarcophagus in a brother's crypt.
 */
export function searchSarcophagus(
  session: BarrowsSessionState,
  brotherId: BarrowsBrotherId
): {
  leadsToTunnel: boolean;
  spawnedBrother?: BarrowsBrotherDefinition;
  alreadyDefeated: boolean;
  message: string;
} {
  if (session.defeatedBrothers.includes(brotherId)) {
    return {
      leadsToTunnel: false,
      alreadyDefeated: true,
      message: 'The sarcophagus is empty.',
    };
  }

  if (brotherId === session.hiddenTunnelBrother) {
    session.cryptsSearched.push(brotherId);
    return {
      leadsToTunnel: true,
      alreadyDefeated: false,
      message: 'You find a hidden tunnel leading deep under the barrows mound!',
    };
  }

  session.cryptsSearched.push(brotherId);
  const def = CANONICAL_BROTHERS[brotherId];
  return {
    leadsToTunnel: false,
    spawnedBrother: def,
    alreadyDefeated: false,
    message: `${def.name} rises from the tomb to attack you!`,
  };
}

/**
 * Marks a brother as defeated in combat.
 */
export function defeatBrother(
  session: BarrowsSessionState,
  brotherId: BarrowsBrotherId
): { success: boolean; totalDefeated: number } {
  if (!session.defeatedBrothers.includes(brotherId)) {
    session.defeatedBrothers.push(brotherId);
  }
  return { success: true, totalDefeated: session.defeatedBrothers.length };
}

/**
 * Loots the central Barrows reward chest in the tunnels.
 */
export function lootBarrowsChest(
  session: BarrowsSessionState,
  randomFloatFn: () => number = Math.random
): {
  success: boolean;
  loot: Array<{ itemId: string; name: string; quantity: number; isBarrowsPiece?: boolean }>;
  reason?: string;
} {
  if (session.chestOpened) {
    return { success: false, loot: [], reason: 'The chest is already empty.' };
  }

  session.chestOpened = true;
  const loot: Array<{ itemId: string; name: string; quantity: number; isBarrowsPiece?: boolean }> = [];

  // Guaranteed runes based on defeated brother count
  const multiplier = Math.max(1, session.defeatedBrothers.length);
  loot.push({
    itemId: 'coins',
    name: 'Coins',
    quantity: Math.floor(randomFloatFn() * 5000 + 2000) * multiplier,
  });
  loot.push({
    itemId: 'rune_death',
    name: 'Death Rune',
    quantity: Math.floor(randomFloatFn() * 50 + 20) * multiplier,
  });
  loot.push({
    itemId: 'rune_blood',
    name: 'Blood Rune',
    quantity: Math.floor(randomFloatFn() * 30 + 10) * multiplier,
  });

  // Roll chance for Barrows armor pieces (1 / (450 - 58 * brothersDefeated))
  // With 6 brothers defeated -> ~1/102 per roll across 6 rolls
  for (const broId of session.defeatedBrothers) {
    const bro = CANONICAL_BROTHERS[broId];
    if (bro && randomFloatFn() < 0.1) {
      // 10% test baseline per defeated brother
      const piece = bro.armorDrops[Math.floor(randomFloatFn() * bro.armorDrops.length)];
      loot.push({
        itemId: piece,
        name: piece.replace('equip_', '').replace(/_/g, ' '),
        quantity: 1,
        isBarrowsPiece: true,
      });
    }
  }

  return { success: true, loot };
}
