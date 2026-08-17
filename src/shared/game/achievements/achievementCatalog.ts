/**
 * Saints Gaming — Canonical Achievement Registry (Bible 25 & 26)
 * Comprehensive achievement definitions across Combat, Skilling, Exploration, Collection, and Quests.
 */

import { AchievementDefinition } from './achievementEngine';

export const CANONICAL_ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  // COMBAT
  ach_first_blood: {
    id: 'ach_first_blood',
    name: 'First Blood',
    description: 'Defeat your first enemy in real-time MMO combat.',
    category: 'COMBAT',
    points: 5,
    targetCount: 1,
    rewardTitleId: 'title_novice',
  },
  ach_monster_slayer: {
    id: 'ach_monster_slayer',
    name: 'Monster Slayer',
    description: 'Defeat 50 monsters across the realm.',
    category: 'COMBAT',
    points: 25,
    targetCount: 50,
    rewardTitleId: 'title_slayer',
  },
  ach_boss_bane: {
    id: 'ach_boss_bane',
    name: 'Bane of Bosses',
    description: 'Slay an endgame world raid boss (Olm, Solak, Telos, or Nex).',
    category: 'COMBAT',
    points: 50,
    targetCount: 1,
    rewardTitleId: 'title_boss_slayer',
  },
  ach_colosseum_gladiator: {
    id: 'ach_colosseum_gladiator',
    name: 'Colosseum Champion',
    description: 'Complete all 12 waves of Fortis Colosseum and defeat Sol Heredit.',
    category: 'COMBAT',
    points: 100,
    targetCount: 1,
    rewardTitleId: 'title_colosseum_champ',
  },

  // SKILLING
  ach_first_harvest: {
    id: 'ach_first_harvest',
    name: 'Green Thumb',
    description: 'Harvest your first crop or herb from a farming patch.',
    category: 'SKILLING',
    points: 5,
    targetCount: 1,
  },
  ach_master_angler: {
    id: 'ach_master_angler',
    name: 'Master Angler',
    description: 'Catch 100 fish across overworld fishing nodes.',
    category: 'SKILLING',
    points: 50,
    targetCount: 100,
    rewardTitleId: 'title_master_angler',
  },
  ach_artisan_smith: {
    id: 'ach_artisan_smith',
    name: 'Forge Master',
    description: 'Smelt and forge 50 pieces of metal armor or weaponry.',
    category: 'SKILLING',
    points: 25,
    targetCount: 50,
  },
  ach_grandmaster_maxed: {
    id: 'ach_grandmaster_maxed',
    name: 'Grandmaster of All Proficiencies',
    description: 'Achieve max level across all 27 Saint Proficiencies.',
    category: 'SKILLING',
    points: 100,
    targetCount: 27,
    rewardTitleId: 'title_grandmaster',
  },

  // EXPLORATION
  ach_realm_traveler: {
    id: 'ach_realm_traveler',
    name: 'Realm Traveler',
    description: 'Warp through 5 different regional gate atlas connections.',
    category: 'EXPLORATION',
    points: 15,
    targetCount: 5,
  },
  ach_dungeon_delver: {
    id: 'ach_dungeon_delver',
    name: 'Dungeon Delver',
    description: 'Enter and clear a dungeon map instance.',
    category: 'EXPLORATION',
    points: 25,
    targetCount: 1,
  },

  // COLLECTION
  ach_first_companion: {
    id: 'ach_first_companion',
    name: 'First Companion Bound',
    description: 'Capture or bind your first beast companion.',
    category: 'COLLECTION',
    points: 10,
    targetCount: 1,
    rewardTitleId: 'title_tamer',
  },
  ach_dex_collector: {
    id: 'ach_dex_collector',
    name: 'SaintsDex Scholar',
    description: 'Discover and register 20 unique creature species in the SaintsDex.',
    category: 'COLLECTION',
    points: 50,
    targetCount: 20,
  },

  // QUESTS
  ach_quest_initiate: {
    id: 'ach_quest_initiate',
    name: 'Campaign Initiate',
    description: 'Complete your first campaign story quest.',
    category: 'QUESTS',
    points: 10,
    targetCount: 1,
  },
  ach_quest_champion: {
    id: 'ach_quest_champion',
    name: 'Hero of the Realm',
    description: 'Complete 10 story and side quests in the quest journal.',
    category: 'QUESTS',
    points: 50,
    targetCount: 10,
  },
};

export function getAchievementDef(id: string): AchievementDefinition | undefined {
  return CANONICAL_ACHIEVEMENTS[id];
}

export function getAllAchievements(): AchievementDefinition[] {
  return Object.values(CANONICAL_ACHIEVEMENTS);
}
