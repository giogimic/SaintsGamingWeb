/**
 * Superior Slayer Monster Spawns & Unique Relic Drops Engine (Bible 09 & Bible 21).
 *
 * Implements:
 * - "Bigger and Badder" 1/200 superior variant spawn roll on task kills.
 * - Superior monster stat scaling, 10x Slayer XP multiplier, and combat mechanics.
 * - Superior unique relic drop table: Imbued Heart, Eternal Gem, Dust & Mist Battlestaffs.
 */

export interface SuperiorMonsterDef {
  baseMonsterId: string;
  superiorId: string;
  name: string;
  slayerLevelReq: number;
  hp: number;
  combatLevel: number;
  xpMultiplier: number;
}

export interface SuperiorDropResult {
  itemId: string;
  name: string;
  quantity: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'VERY_RARE' | 'MEGA_RARE';
}

export const SUPERIOR_MONSTER_REGISTRY: Record<string, SuperiorMonsterDef> = {
  crawling_hand: { baseMonsterId: 'crawling_hand', superiorId: 'crushing_hand', name: 'Crushing Hand', slayerLevelReq: 5, hp: 65, combatLevel: 32, xpMultiplier: 10 },
  cave_crawler: { baseMonsterId: 'cave_crawler', superiorId: 'chasm_crawler', name: 'Chasm Crawler', slayerLevelReq: 10, hp: 95, combatLevel: 45, xpMultiplier: 10 },
  banshee: { baseMonsterId: 'banshee', superiorId: 'screaming_banshee', name: 'Screaming Banshee', slayerLevelReq: 15, hp: 90, combatLevel: 48, xpMultiplier: 10 },
  rockslug: { baseMonsterId: 'rockslug', superiorId: 'giant_rockslug', name: 'Giant Rockslug', slayerLevelReq: 20, hp: 110, combatLevel: 55, xpMultiplier: 10 },
  basilisk: { baseMonsterId: 'basilisk', superiorId: 'monstrous_basilisk', name: 'Monstrous Basilisk', slayerLevelReq: 40, hp: 280, combatLevel: 135, xpMultiplier: 10 },
  gore_hound: { baseMonsterId: 'gore_hound', superiorId: 'insatiable_gore_hound', name: 'Insatiable Gore Hound', slayerLevelReq: 50, hp: 450, combatLevel: 182, xpMultiplier: 10 },
  infernal_mage: { baseMonsterId: 'infernal_mage', superiorId: 'malevolent_mage', name: 'Malevolent Mage', slayerLevelReq: 45, hp: 240, combatLevel: 140, xpMultiplier: 10 },
  aberrant_spectre: { baseMonsterId: 'aberrant_spectre', superiorId: 'abhorrent_spectre', name: 'Abhorrent Spectre', slayerLevelReq: 60, hp: 360, combatLevel: 190, xpMultiplier: 10 },
  sand_wraith: { baseMonsterId: 'sand_wraith', superiorId: 'choke_devil', name: 'Choke Devil', slayerLevelReq: 65, hp: 420, combatLevel: 215, xpMultiplier: 10 },
  armored_beast: { baseMonsterId: 'armored_beast', superiorId: 'king_armored_beast', name: 'King Armored Beast', slayerLevelReq: 70, hp: 420, combatLevel: 245, xpMultiplier: 10 },
  stone_golem: { baseMonsterId: 'stone_golem', superiorId: 'marble_stone_golem', name: 'Marble Stone Golem', slayerLevelReq: 75, hp: 420, combatLevel: 260, xpMultiplier: 10 },
  shadow_fiend: { baseMonsterId: 'shadow_fiend', superiorId: 'nechryarch', name: 'Nechryarch', slayerLevelReq: 80, hp: 420, combatLevel: 285, xpMultiplier: 10 },
  void_fiend: { baseMonsterId: 'void_fiend', superiorId: 'greater_void_fiend', name: 'Greater Void Fiend', slayerLevelReq: 85, hp: 600, combatLevel: 340, xpMultiplier: 10 },
  nightmare_stalker: { baseMonsterId: 'nightmare_stalker', superiorId: 'night_beast', name: 'Night Beast', slayerLevelReq: 90, hp: 880, combatLevel: 382, xpMultiplier: 10 },
  smoke_devil: { baseMonsterId: 'smoke_devil', superiorId: 'nuclear_smoke_devil', name: 'Nuclear Smoke Devil', slayerLevelReq: 93, hp: 740, combatLevel: 350, xpMultiplier: 10 },
};

/**
 * Baseline 1/200 chance to spawn a superior variant when "Bigger and Badder" is unlocked and monster is killed on-task.
 */
export const SUPERIOR_SPAWN_CHANCE = 1 / 200;

export function rollSuperiorSpawn(
  monsterId: string,
  hasBiggerAndBadderUnlocked: boolean,
  isOnTask: boolean,
  rngRoll: number = Math.random()
): { shouldSpawn: boolean; superior?: SuperiorMonsterDef } {
  if (!hasBiggerAndBadderUnlocked || !isOnTask) {
    return { shouldSpawn: false };
  }

  const superior = SUPERIOR_MONSTER_REGISTRY[monsterId];
  if (!superior) {
    return { shouldSpawn: false };
  }

  if (rngRoll < SUPERIOR_SPAWN_CHANCE) {
    return { shouldSpawn: true, superior };
  }

  return { shouldSpawn: false };
}

/**
 * Unique Superior Relic Drop Table:
 * - Imbued Heart (1/512 from top tier superiors, scaled by monster Slayer level)
 * - Eternal Gem (1/512)
 * - Dust Battlestaff (1/128)
 * - Mist Battlestaff (1/128)
 */
export function rollSuperiorUniqueLoot(
  superiorId: string,
  slayerLevelReq: number,
  rngSeed: number = Math.random()
): SuperiorDropResult | null {
  // Higher level superiors have better odds for Imbued Heart and Eternal Gem:
  // Base chance denominator = Math.max(128, Math.floor(1000 - slayerLevelReq * 8))
  const denominator = Math.max(150, Math.floor(800 - slayerLevelReq * 6));
  const heartThreshold = 1 / denominator;
  const gemThreshold = 2 / denominator;
  const mistThreshold = 6 / denominator;
  const dustThreshold = 10 / denominator;

  if (rngSeed < heartThreshold) {
    return { itemId: 'imbued_heart', name: 'Imbued Heart', quantity: 1, rarity: 'MEGA_RARE' };
  }
  if (rngSeed < gemThreshold) {
    return { itemId: 'eternal_gem', name: 'Eternal Gem', quantity: 1, rarity: 'MEGA_RARE' };
  }
  if (rngSeed < mistThreshold) {
    return { itemId: 'mist_battlestaff', name: 'Mist Battlestaff', quantity: 1, rarity: 'RARE' };
  }
  if (rngSeed < dustThreshold) {
    return { itemId: 'dust_battlestaff', name: 'Dust Battlestaff', quantity: 1, rarity: 'RARE' };
  }

  return null;
}

/**
 * Calculates temporary Magic boost from Invoking the Imbued Heart.
 * Formula: Boost = 1 + floor(MagicLevel * 0.10)
 * Cooldown: 420 seconds (7 minutes).
 */
export function calculateImbuedHeartBoost(currentMagicLevel: number): {
  boostAmount: number;
  boostedLevel: number;
  cooldownSeconds: number;
} {
  const boost = 1 + Math.floor(currentMagicLevel * 0.1);
  return {
    boostAmount: boost,
    boostedLevel: currentMagicLevel + boost,
    cooldownSeconds: 420,
  };
}
