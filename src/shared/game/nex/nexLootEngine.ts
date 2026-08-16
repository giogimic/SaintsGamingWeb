/**
 * Nex: Angel of Death Praesul Codex, Wand & Drop Distribution Matrix Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Praesul Codex unlocking Tier 99 Ancient Curses: Malevolence, Desolation, Affliction (+12% accuracy, +12% damage).
 * - Tier 92 Dual-wield Magic weapons: Wand of the Praesul & Imperium Core.
 * - Nex unique and standard drop distribution matrix with contribution weight scaling.
 */

export type Tier99Curse = 'MALEVOLENCE' | 'DESOLATION' | 'AFFLICTION';

export interface NexUniqueDropEntry {
  itemId: string;
  name: string;
  weight: number;
  rarityTier: 'PRAESUL_CODEX' | 'WEAPON' | 'ARMOR';
}

export interface NexLootResult {
  itemId: string;
  name: string;
  quantity: number;
  isUnique: boolean;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'MEGA_RARE';
}

export const NEX_UNIQUE_TABLE: NexUniqueDropEntry[] = [
  { itemId: 'praesul_codex', name: 'Praesul Codex', weight: 4, rarityTier: 'PRAESUL_CODEX' },
  { itemId: 'wand_of_the_praesul', name: 'Wand of the Praesul', weight: 2, rarityTier: 'WEAPON' },
  { itemId: 'imperium_core', name: 'Imperium Core', weight: 2, rarityTier: 'WEAPON' },
  { itemId: 'torva_platebody', name: 'Torva Platebody', weight: 1, rarityTier: 'ARMOR' },
  { itemId: 'torva_platelegs', name: 'Torva Platelegs', weight: 1, rarityTier: 'ARMOR' },
  { itemId: 'pernix_body', name: 'Pernix Body', weight: 1, rarityTier: 'ARMOR' },
  { itemId: 'pernix_chaps', name: 'Pernix Chaps', weight: 1, rarityTier: 'ARMOR' },
  { itemId: 'virtus_robe_top', name: 'Virtus Robe Top', weight: 1, rarityTier: 'ARMOR' },
  { itemId: 'virtus_robe_legs', name: 'Virtus Robe Legs', weight: 1, rarityTier: 'ARMOR' },
];

export const TOTAL_NEX_UNIQUE_WEIGHT = NEX_UNIQUE_TABLE.reduce((sum, item) => sum + item.weight, 0); // 14

export interface PlayerCurseState {
  prayerLevel: number;
  unlockedTier99Curses: Tier99Curse[];
}

/**
 * Consumes a Praesul Codex to unlock a chosen Tier 99 Ancient Curse.
 */
export function unlockPraesulCurse(
  player: PlayerCurseState,
  chosenCurse: Tier99Curse
): { success: boolean; error?: string } {
  if (player.prayerLevel < 99) {
    return {
      success: false,
      error: `Requires Prayer level 99 to unlock ${chosenCurse} (Current: ${player.prayerLevel})`,
    };
  }

  if (player.unlockedTier99Curses.includes(chosenCurse)) {
    return { success: false, error: `You have already unlocked ${chosenCurse}` };
  }

  player.unlockedTier99Curses.push(chosenCurse);
  return { success: true };
}

/**
 * Calculates combat multipliers from an active Tier 99 curse.
 */
export function getTier99CurseBonus(curse: Tier99Curse | null): {
  accuracyMultiplier: number;
  damageMultiplier: number;
  defenceMultiplier: number;
} {
  if (!curse) {
    return { accuracyMultiplier: 1.0, damageMultiplier: 1.0, defenceMultiplier: 1.0 };
  }

  return {
    accuracyMultiplier: 1.12, // +12%
    damageMultiplier: 1.12,   // +12%
    defenceMultiplier: 1.10,  // +10%
  };
}

/**
 * Rolls loot drops upon Nex: Angel of Death defeat.
 */
export function rollNexLoot(
  damageContributionPercent: number, // 0.0 - 1.0
  uniqueRollSeed: number = Math.random(),
  itemRollSeed: number = Math.random()
): {
  hasUnique: boolean;
  uniqueDrop: NexLootResult | null;
  standardDrops: NexLootResult[];
} {
  // 1/40 base unique chance scaled by player contribution
  const uniqueChance = (1 / 40) * Math.min(1.5, Math.max(0.5, damageContributionPercent * 7));
  const isUniqueHit = uniqueRollSeed < uniqueChance;

  let uniqueDrop: NexLootResult | null = null;
  if (isUniqueHit) {
    let roll = itemRollSeed * TOTAL_NEX_UNIQUE_WEIGHT;
    let chosen = NEX_UNIQUE_TABLE[0];
    for (const item of NEX_UNIQUE_TABLE) {
      roll -= item.weight;
      if (roll <= 0) {
        chosen = item;
        break;
      }
    }

    uniqueDrop = {
      itemId: chosen.itemId,
      name: chosen.name,
      quantity: 1,
      isUnique: true,
      rarity: chosen.rarityTier === 'WEAPON' ? 'MEGA_RARE' : 'RARE',
    };
  }

  const standardDrops: NexLootResult[] = [
    { itemId: 'blood_rune', name: 'Blood Rune', quantity: 2500, isUnique: false, rarity: 'COMMON' },
    { itemId: 'soul_rune', name: 'Soul Rune', quantity: 1800, isUnique: false, rarity: 'UNCOMMON' },
    { itemId: 'onyx_bolts_e', name: 'Onyx Bolts (e)', quantity: 120, isUnique: false, rarity: 'RARE' },
  ];

  return { hasUnique: uniqueDrop !== null, uniqueDrop, standardDrops };
}
