/**
 * Master Registry for 27 Saint Proficiencies (Skills),
 * including Per-Level Perks, Milestone Unlocks, and Battlepass Cosmetic Tier Tracks.
 */

import { ITEM_DB, CRAFTING_RECIPES } from '../../web/components/the-lobby/data/items';
import { COMBAT_ABILITIES } from './combatAbilities';
import {
  COMBAT_SKILL_TYPINGS,
  GATHERING_SKILL_SLUGS,
  ARTISAN_SKILL_SLUGS,
  SUPPORT_SKILL_SLUGS,
  normalizeSkillSlug,
  skillSlugToLabel,
} from './skillTypings';

export type SkillCategory = 'Combat' | 'Gathering' | 'Artisan' | 'Support';

export type UnlockType = 'EQUIPMENT' | 'ABILITY' | 'RECIPE' | 'GATHER' | 'PASSIVE' | 'ZONE' | 'CREATURE';

export interface SkillUnlockMilestone {
  level: number;
  title: string;
  description: string;
  type: UnlockType;
  iconName?: string;
}

export type RewardType = 'TITLE' | 'COSMETIC' | 'EMOTE' | 'AURA' | 'BANNER' | 'CAPE';

export interface BattlepassTier {
  tier: number;
  level: number;
  rewardName: string;
  rewardType: RewardType;
  description: string;
  iconName: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
}

export interface SkillGuideEntry {
  slug: string;
  name: string;
  category: SkillCategory;
  maxLevel: number;
  themeColor: string; // Hex color for glowing borders & badges
  bgGradient: string; // Tailwind gradient classes
  iconName: string; // Lucide icon identifier
  tagline: string;
  summary: string;
  perLevelPerks: string[];
  trainingMethods: string[];
  staticMilestones: SkillUnlockMilestone[];
  battlepassTiers: BattlepassTier[];
}

/** Standard 10-tier Battlepass milestone levels for max Lv 50 skills */
export const COMBAT_BATTLEPASS_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/** Standard 10-tier Battlepass milestone levels for max Lv 99 skills */
export const ARTISAN_BATTLEPASS_LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 99];

import rawSkillGuideJson from '../../../public/data/skillGuide.json';

export const SKILL_GUIDE_REGISTRY = rawSkillGuideJson as Record<string, SkillGuideEntry>;

/** Get guide data for a skill slug */
export function getSkillGuide(slugOrLabel: string): SkillGuideEntry | null {
  const slug = normalizeSkillSlug(slugOrLabel);
  return SKILL_GUIDE_REGISTRY[slug] || null;
}

/** Aggregate dynamic item requirements, recipes, and abilities for a skill */
export function resolveDynamicSkillUnlocks(slugOrLabel: string): SkillUnlockMilestone[] {
  const slug = normalizeSkillSlug(slugOrLabel);
  const label = skillSlugToLabel(slug);
  const results: SkillUnlockMilestone[] = [];

  // 1. Dynamic recipes
  for (const recipe of CRAFTING_RECIPES) {
    if (recipe.skill?.toLowerCase() === slug || recipe.skill === label) {
      const item = ITEM_DB[recipe.resultItemId];
      results.push({
        level: recipe.levelReq,
        title: item?.name || recipe.resultItemId,
        description: `Craft ${item?.name || recipe.resultItemId} (+${recipe.xpReward} XP)`,
        type: 'RECIPE',
      });
    }
  }

  // 2. Dynamic Equipment Requirements from ITEM_DB
  if (ITEM_DB) {
    for (const item of Object.values(ITEM_DB)) {
      if (item.reqSkill && (item.reqSkill.toLowerCase() === slug || item.reqSkill === label)) {
        const statStr = item.stats?.atk ? ` (Atk +${item.stats.atk})` : item.stats?.def ? ` (Def +${item.stats.def})` : '';
        results.push({
          level: item.reqLevel || 1,
          title: item.name,
          description: `Equip ${item.name}${statStr} — ${item.description}`,
          type: 'EQUIPMENT',
        });
      }
    }
  }

  // 3. Dynamic Combat abilities
  if (COMBAT_ABILITIES) {
    for (const ability of Object.values(COMBAT_ABILITIES)) {
      if (!ability) continue;
      // Check if ability relates to this skill
      const mapsToSkill =
        (slug === 'attack' && (ability.id.includes('strike') || ability.id.includes('cleave') || ability.category === 'physical')) ||
        (slug === 'strength' && (ability.id.includes('shout') || ability.category === 'buff')) ||
        (slug === 'ranged' && (ability.id.includes('shoot') || ability.id.includes('multishot'))) ||
        (slug === 'agility' && (ability.id.includes('dash') || ability.id.includes('blink'))) ||
        (slug === 'intelligence' && (ability.id.includes('fireball') || ability.id.includes('frost') || ability.category === 'special')) ||
        (slug === 'wisdom' && (ability.id.includes('heal') || ability.id.includes('shield')));

      if (mapsToSkill) {
        results.push({
          level: ability.cooldownMs > 5000 ? 20 : 5,
          title: ability.name,
          description: `${ability.name} [${ability.category.toUpperCase()}] Power: ${ability.power} (${(ability.cooldownMs / 1000).toFixed(1)}s CD)`,
          type: 'ABILITY',
        });
      }
    }
  }

  return results;
}

/** Merge static and dynamic unlocks sorted by level */
export function getAllSkillUnlocks(slugOrLabel: string): SkillUnlockMilestone[] {
  const guide = getSkillGuide(slugOrLabel);
  if (!guide) return [];

  const dynamic = resolveDynamicSkillUnlocks(slugOrLabel);
  const combined = [...guide.staticMilestones];

  // Avoid duplicates by title
  const seenTitles = new Set(combined.map((m) => m.title.toLowerCase()));
  for (const dyn of dynamic) {
    if (!seenTitles.has(dyn.title.toLowerCase())) {
      combined.push(dyn);
      seenTitles.add(dyn.title.toLowerCase());
    }
  }

  return combined.sort((a, b) => a.level - b.level);
}
