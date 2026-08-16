/**
 * Solak Loot, Erebus Grimoire & Blightbound Crossbow Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Erebus Grimoire pocket slot item: +12% critical strike rate and 15,000 damage cap expansion.
 * - Tier 92 Blightbound Crossbows (Main-hand & Off-hand) with 50% bolt save chance.
 * - Solak unique and standard drop distribution matrix with Solly pet rolls.
 */

export interface SolakUniqueDropDef {
  id: string;
  name: string;
  weight: number;
  type: 'GRIMOIRE' | 'WEAPON' | 'PET';
}

export interface SolakLootResult {
  itemId: string;
  name: string;
  quantity: number;
  isUnique: boolean;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'MEGA_RARE';
}

export const SOLAK_UNIQUE_TABLE: SolakUniqueDropDef[] = [
  { id: 'grimoire_of_erebus', name: 'Grimoire of Erebus', weight: 4, type: 'GRIMOIRE' },
  { id: 'blightbound_crossbow_mh', name: 'Blightbound Crossbow (Main-hand)', weight: 2, type: 'WEAPON' },
  { id: 'blightbound_crossbow_oh', name: 'Off-hand Blightbound Crossbow', weight: 2, type: 'WEAPON' },
  { id: 'solly_pet', name: 'Solly Pet', weight: 1, type: 'PET' },
];

export const TOTAL_SOLAK_WEIGHT = SOLAK_UNIQUE_TABLE.reduce((sum, item) => sum + item.weight, 0); // 9

export interface GrimoireState {
  isActive: boolean;
  pagesRemaining: number;
  minutesRemaining: number;
}

/**
 * Calculates Erebus Grimoire combat bonuses.
 */
export function calculateGrimoireBonus(grimoire: GrimoireState): {
  critChanceBonus: number;
  damageCap: number;
} {
  if (grimoire.isActive && (grimoire.pagesRemaining > 0 || grimoire.minutesRemaining > 0)) {
    return {
      critChanceBonus: 0.12, // +12% Crit Chance
      damageCap: 15000,      // Raised from 10k to 15k
    };
  }
  return { critChanceBonus: 0, damageCap: 10000 };
}

/**
 * Adds torn grimoire pages to charge the book (45 minutes per page).
 */
export function addGrimoirePages(
  grimoire: GrimoireState,
  pages: number
): { newMinutes: number; totalPages: number } {
  grimoire.pagesRemaining += pages;
  grimoire.minutesRemaining += pages * 45;
  return { newMinutes: grimoire.minutesRemaining, totalPages: grimoire.pagesRemaining };
}

/**
 * Evaluates Blightbound Crossbow bolt saving passive (50% chance to not consume bolt).
 */
export function evaluateBlightboundBoltSave(rngSeed: number = Math.random()): boolean {
  return rngSeed < 0.50;
}

/**
 * Rolls loot drops upon completing a Solak kill.
 */
export function rollSolakLoot(
  uniqueRollSeed: number = Math.random(),
  itemRollSeed: number = Math.random()
): {
  hasUnique: boolean;
  uniqueDrop: SolakLootResult | null;
  tornPages: number;
  standardSupplies: SolakLootResult[];
} {
  // 1/40 base unique rate
  const isUniqueHit = uniqueRollSeed < 1 / 40;

  let uniqueDrop: SolakLootResult | null = null;
  if (isUniqueHit) {
    let roll = itemRollSeed * TOTAL_SOLAK_WEIGHT;
    let chosen = SOLAK_UNIQUE_TABLE[0];
    for (const item of SOLAK_UNIQUE_TABLE) {
      roll -= item.weight;
      if (roll <= 0) {
        chosen = item;
        break;
      }
    }

    uniqueDrop = {
      itemId: chosen.id,
      name: chosen.name,
      quantity: 1,
      isUnique: true,
      rarity: chosen.type === 'WEAPON' ? 'MEGA_RARE' : 'RARE',
    };
  }

  const tornPages = Math.floor(1 + Math.random() * 2); // 1-2 pages guaranteed

  const standardSupplies: SolakLootResult[] = [
    { itemId: 'torn_grimoire_page', name: 'Torn Grimoire Page', quantity: tornPages, isUnique: false, rarity: 'COMMON' },
    { itemId: 'sirenic_scale', name: 'Sirenic Scale', quantity: 6, isUnique: false, rarity: 'UNCOMMON' },
    { itemId: 'hydrix_bolt_tips', name: 'Hydrix Bolt Tips', quantity: 45, isUnique: false, rarity: 'RARE' },
  ];

  return { hasUnique: uniqueDrop !== null, uniqueDrop, tornPages, standardSupplies };
}
