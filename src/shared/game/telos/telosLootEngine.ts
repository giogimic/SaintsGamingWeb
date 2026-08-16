/**
 * Telos: Warden of the Telosian Core Loot & Weapon Assembly Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Enrage & Killstreak unique drop scaling formula.
 * - Unique drop table: Volcanic, Pure & Corrupted Anima Orbs, Dormant Staff of Sliske,
 *   Dormant Zaros Godsword, Dormant Seren Godbow, and Codex of Lost Knowledge (Reprisal).
 * - Tier 92 Weapon Assembly matrix (Dormant Weapon + 3 Anima Orbs -> Finished God Weapon).
 */

export interface TelosUniqueDropDef {
  id: string;
  name: string;
  weight: number;
  type: 'ORB' | 'DORMANT' | 'CODEX';
}

export interface TelosLootResult {
  itemId: string;
  name: string;
  quantity: number;
  isUnique: boolean;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'MEGA_RARE';
}

export const TELOS_UNIQUE_TABLE: TelosUniqueDropDef[] = [
  { id: 'volcanic_anima_orb', name: 'Volcanic Anima Orb', weight: 10, type: 'ORB' },
  { id: 'corrupted_anima_orb', name: 'Corrupted Anima Orb', weight: 10, type: 'ORB' },
  { id: 'pure_anima_orb', name: 'Pure Anima Orb', weight: 10, type: 'ORB' },
  { id: 'dormant_staff_of_sliske', name: 'Dormant Staff of Sliske', weight: 3, type: 'DORMANT' },
  { id: 'dormant_zaros_godsword', name: 'Dormant Zaros Godsword', weight: 3, type: 'DORMANT' },
  { id: 'dormant_seren_godbow', name: 'Dormant Seren Godbow', weight: 3, type: 'DORMANT' },
  { id: 'codex_of_lost_knowledge', name: 'Codex of Lost Knowledge (Reprisal)', weight: 3, type: 'CODEX' },
];

export const TOTAL_TELOS_WEIGHT = TELOS_UNIQUE_TABLE.reduce((sum, item) => sum + item.weight, 0); // 42

/**
 * Calculates unique drop rate denominator based on Enrage (E) and Streak (S).
 * Formula: 10000 / (10 + 0.25*E + 3*S) clamped to minimum 9 (max ~11% chance).
 */
export function calculateTelosUniqueDropRate(enrage: number, streak: number): {
  denominator: number;
  dropChance: number;
} {
  const safeEnrage = Math.max(0, enrage);
  const safeStreak = Math.max(0, streak);

  const divider = 10 + 0.25 * safeEnrage + 3 * safeStreak;
  const rawDenominator = Math.floor(10000 / divider);
  const denominator = Math.max(9, Math.min(1000, rawDenominator));
  const dropChance = 1 / denominator;

  return { denominator, dropChance };
}

/**
 * Rolls loot drops upon completing a Telos kill.
 */
export function rollTelosLoot(
  enrage: number,
  streak: number,
  uniqueRollSeed: number = Math.random(),
  itemRollSeed: number = Math.random()
): {
  hasUnique: boolean;
  uniqueItem: TelosLootResult | null;
  standardSupplies: TelosLootResult[];
} {
  const { dropChance } = calculateTelosUniqueDropRate(enrage, streak);
  const isUniqueHit = uniqueRollSeed < dropChance;

  let uniqueItem: TelosLootResult | null = null;
  if (isUniqueHit) {
    let roll = itemRollSeed * TOTAL_TELOS_WEIGHT;
    let chosen = TELOS_UNIQUE_TABLE[0];
    for (const item of TELOS_UNIQUE_TABLE) {
      roll -= item.weight;
      if (roll <= 0) {
        chosen = item;
        break;
      }
    }

    uniqueItem = {
      itemId: chosen.id,
      name: chosen.name,
      quantity: 1,
      isUnique: true,
      rarity: chosen.type === 'DORMANT' ? 'MEGA_RARE' : 'RARE',
    };
  }

  const standardSupplies: TelosLootResult[] = [
    { itemId: 'pure_essence', name: 'Pure Essence', quantity: Math.min(50000, 2000 + streak * 500), isUnique: false, rarity: 'COMMON' },
    { itemId: 'battlestaff', name: 'Battlestaff', quantity: Math.min(500, 25 + streak * 10), isUnique: false, rarity: 'UNCOMMON' },
  ];

  return { hasUnique: uniqueItem !== null, uniqueItem, standardSupplies };
}

/**
 * Assembles a Tier 92 God Weapon by combining 3 Anima Orbs with a Dormant weapon base.
 */
export function assembleTelosWeapon(
  dormantItemId: 'dormant_staff_of_sliske' | 'dormant_zaros_godsword' | 'dormant_seren_godbow',
  inventory: {
    hasVolcanicOrb: boolean;
    hasCorruptedOrb: boolean;
    hasPureOrb: boolean;
  }
): { success: boolean; finishedWeaponId?: string; weaponName?: string; error?: string } {
  if (!inventory.hasVolcanicOrb || !inventory.hasCorruptedOrb || !inventory.hasPureOrb) {
    return {
      success: false,
      error: 'Requires all 3 Anima Orbs (Volcanic, Corrupted, and Pure Anima Orb) to charge the dormant weapon',
    };
  }

  if (dormantItemId === 'dormant_staff_of_sliske') {
    return { success: true, finishedWeaponId: 'staff_of_sliske', weaponName: 'Staff of Sliske (Tier 92 Magic)' };
  } else if (dormantItemId === 'dormant_zaros_godsword') {
    return { success: true, finishedWeaponId: 'zaros_godsword', weaponName: 'Zaros Godsword (Tier 92 Melee)' };
  } else if (dormantItemId === 'dormant_seren_godbow') {
    return { success: true, finishedWeaponId: 'seren_godbow', weaponName: 'Seren Godbow (Tier 92 Ranged)' };
  }

  return { success: false, error: 'Invalid dormant weapon item' };
}
