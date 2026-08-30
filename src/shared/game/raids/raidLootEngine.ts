/**
 * Raid Unique Drop Point Scaling & Chest Loot Matrix (Bible 24 & Bible 27).
 *
 * Implements:
 * - Total party point scaling and unique drop probability calculations.
 * - Personal death penalty (-40% personal points and -1% total party points).
 * - Unique drop roll matrix: Twisted Bow, Ancestral Set, Kodai Insignia, Elder Maul, Dragon Claws, Prayer Scrolls.
 * - Challenge Mode Metamorphic Dust & Olmlet Pet rolls.
 * - Standard skilling resource chest drops scaled by personal contribution points.
 */

export interface RaidUniqueItem {
  id: string;
  name: string;
  weight: number;
  rarityTier: 'PRAYER_SCROLL' | 'WEAPON_ARMOR' | 'MEGA_RARE';
}

export interface RaidChestLootEntry {
  itemId: string;
  name: string;
  quantity: number;
  isUnique: boolean;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'MEGA_RARE' | 'SPECIAL';
}

export interface PlayerRaidSummary {
  playerId: string;
  name: string;
  points: number;
  deaths: number;
}

export const UNIQUE_LOOT_TABLE: RaidUniqueItem[] = [
  { id: 'dexterous_prayer_scroll', name: 'Dexterous Prayer Scroll (Rigour)', weight: 20, rarityTier: 'PRAYER_SCROLL' },
  { id: 'arcane_prayer_scroll', name: 'Arcane Prayer Scroll (Augury)', weight: 20, rarityTier: 'PRAYER_SCROLL' },
  { id: 'twisted_buckler', name: 'Twisted Buckler', weight: 4, rarityTier: 'WEAPON_ARMOR' },
  { id: 'dragon_hunter_crossbow', name: 'Dragon Hunter Crossbow', weight: 4, rarityTier: 'WEAPON_ARMOR' },
  { id: 'dragon_claws', name: 'Dragon Claws', weight: 3, rarityTier: 'WEAPON_ARMOR' },
  { id: 'ancestral_hat', name: 'Ancestral Hat', weight: 3, rarityTier: 'WEAPON_ARMOR' },
  { id: 'ancestral_robe_top', name: 'Ancestral Robe Top', weight: 3, rarityTier: 'WEAPON_ARMOR' },
  { id: 'ancestral_robe_bottom', name: 'Ancestral Robe Bottom', weight: 3, rarityTier: 'WEAPON_ARMOR' },
  { id: 'dinhs_bulwark', name: "Dinh's Bulwark", weight: 3, rarityTier: 'WEAPON_ARMOR' },
  { id: 'kodai_insignia', name: 'Kodai Insignia', weight: 2, rarityTier: 'MEGA_RARE' },
  { id: 'elder_maul', name: 'Elder Maul', weight: 2, rarityTier: 'MEGA_RARE' },
  { id: 'twisted_bow', name: 'Twisted Bow', weight: 2, rarityTier: 'MEGA_RARE' },
];

export const TOTAL_UNIQUE_WEIGHT = UNIQUE_LOOT_TABLE.reduce((acc, item) => acc + item.weight, 0); // 69

/**
 * Calculates unique drop chance based on total party contribution points.
 * 8,675 points = 1% chance (1/867,500 per point).
 * Capped at 65.0% per raid completion.
 */
export function calculateUniqueDropChance(totalPartyPoints: number): number {
  const chance = totalPartyPoints / 867500;
  return Math.min(0.65, Math.max(0, chance));
}

/**
 * Applies death penalty to player and raid party points.
 * - Player loses 40% of their current personal points.
 * - Total party points drop by 1% of total.
 */
export function applyRaidDeathPenalty(
  player: PlayerRaidSummary,
  totalPartyPoints: number
): {
  newPlayerPoints: number;
  newPartyPoints: number;
  pointsLost: number;
} {
  const pointsLost = Math.round(player.points * 0.40);
  const newPlayerPoints = Math.max(0, player.points - pointsLost);
  player.points = newPlayerPoints;
  player.deaths += 1;

  const partyLoss = Math.round(totalPartyPoints * 0.01);
  const newPartyPoints = Math.max(0, totalPartyPoints - partyLoss - pointsLost);

  return { newPlayerPoints, newPartyPoints, pointsLost };
}

/**
 * Rolls unique and standard chest rewards for a player at raid completion.
 */
export function rollRaidChestLoot(
  player: PlayerRaidSummary,
  totalPartyPoints: number,
  isChallengeMode: boolean = false,
  cmTimePassed: boolean = false,
  uniqueRollSeed: number = Math.random(),
  itemRollSeed: number = Math.random()
): {
  hasUnique: boolean;
  uniqueItem: RaidChestLootEntry | null;
  standardRewards: RaidChestLootEntry[];
  hasPet: boolean;
  hasDust: boolean;
} {
  const uniqueChance = calculateUniqueDropChance(totalPartyPoints);
  const isUniqueHit = uniqueRollSeed < uniqueChance;
  let uniqueItem: RaidChestLootEntry | null = null;
  let hasPet = false;
  let hasDust = false;

  // Determine who receives the unique based on personal point ratio
  const playerPointRatio = player.points / Math.max(1, totalPartyPoints);

  if (isUniqueHit && Math.random() < playerPointRatio) {
    // Pick unique from table
    let roll = itemRollSeed * TOTAL_UNIQUE_WEIGHT;
    let chosen = UNIQUE_LOOT_TABLE[0];
    for (const u of UNIQUE_LOOT_TABLE) {
      roll -= u.weight;
      if (roll <= 0) {
        chosen = u;
        break;
      }
    }

    uniqueItem = {
      itemId: chosen.id,
      name: chosen.name,
      quantity: 1,
      isUnique: true,
      rarity: chosen.rarityTier === 'MEGA_RARE' ? 'MEGA_RARE' : 'RARE',
    };

    // 1/53 chance for Olmlet pet on unique
    if (Math.random() < 1 / 53) {
      hasPet = true;
    }
  }

  // Challenge Mode Metamorphic Dust (if under target time)
  if (isChallengeMode && cmTimePassed && Math.random() < 1 / 20) {
    hasDust = true;
  }

  // Generate 2 scaled standard resource drops
  const standardRewards: RaidChestLootEntry[] = [];
  const pointScale = Math.max(1, Math.floor(player.points / 1000));

  standardRewards.push({
    itemId: 'blood_rune',
    name: 'Blood Rune',
    quantity: Math.min(6000, Math.round(pointScale * 150)),
    isUnique: false,
    rarity: 'COMMON',
  });

  standardRewards.push({
    itemId: 'grimy_torstol',
    name: 'Grimy Torstol',
    quantity: Math.min(250, Math.round(pointScale * 6)),
    isUnique: false,
    rarity: 'UNCOMMON',
  });

  return {
    hasUnique: uniqueItem !== null,
    uniqueItem,
    standardRewards,
    hasPet,
    hasDust,
  };
}
