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

export const SKILL_GUIDE_REGISTRY: Record<string, SkillGuideEntry> = {
  attack: {
    slug: 'attack',
    name: 'Attack',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#ef4444',
    bgGradient: 'from-red-950/40 via-red-900/20 to-black',
    iconName: 'Sword',
    tagline: 'Mastery of blade, blunt, and melee precision.',
    summary: 'Attack governs your melee weapon accuracy, armor penetration, and unlocks the ability to wield higher-tier swords, daggers, and halberds.',
    perLevelPerks: [
      '+1.5% Base Melee Hit & Accuracy Rating',
      '+0.4% Critical Strike Chance on Melee hits',
      'Unlocks higher tier melee weapon equip requirements',
      'Reduces enemy parry and block effectiveness',
    ],
    trainingMethods: [
      'Engage wild creatures and monsters with melee weapons (Sword, Dagger, Axe).',
      'Execute Slash and Thrust combat abilities in real-time combat.',
      'Spar with training dummies in the Saint Sanctuary.',
    ],
    staticMilestones: [
      { level: 1, title: 'Bronze Weaponry', description: 'Equip Bronze Sword, Bronze Dagger, and Crude Axe.', type: 'EQUIPMENT' },
      { level: 5, title: 'Slash Technique', description: 'Unlock the rapid Slash RT combat ability combo.', type: 'ABILITY' },
      { level: 10, title: 'Iron Weaponry', description: 'Equip Iron Broadsword, Battleaxe, and Scimitar.', type: 'EQUIPMENT' },
      { level: 15, title: 'Thrust Strike', description: 'Armor-piercing thrust ability with 1.3x multiplier.', type: 'ABILITY' },
      { level: 20, title: 'Steel Weaponry', description: 'Equip Steel Longsword, Claymore, and Rapier.', type: 'EQUIPMENT' },
      { level: 25, title: 'Mithril Weaponry', description: 'Equip lightweight Mithril blade weapons.', type: 'EQUIPMENT' },
      { level: 30, title: 'Flurry of Blows', description: 'Three-hit rapid melee ability triggering weapon effects.', type: 'ABILITY' },
      { level: 35, title: 'Adamant Weaponry', description: 'Equip heavy Adamantite blades with +20% penetration.', type: 'EQUIPMENT' },
      { level: 40, title: 'Rune Weaponry', description: 'Equip legendary Rune broadswords and two-handers.', type: 'EQUIPMENT' },
      { level: 45, title: 'Saintly Blade Mastery', description: 'Passive: Melee attacks have a 15% chance to double-strike.', type: 'PASSIVE' },
      { level: 50, title: 'Celestial Vanguard Armaments', description: 'Equip transcendent endgame celestial blades.', type: 'EQUIPMENT' },
    ],
    battlepassTiers: [
      { tier: 1, level: 5, rewardName: 'Title: Novice Swordsman', rewardType: 'TITLE', description: 'Unlocks the [Novice Swordsman] title on your character nameplate.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 10, rewardName: 'Emote: Blade Flourish', rewardType: 'EMOTE', description: 'Perform an acrobatic sword spin flourish.', iconName: 'Sparkles', rarity: 'UNCOMMON' },
      { tier: 3, level: 15, rewardName: 'Banner: Crimson Vanguard', rewardType: 'BANNER', description: 'Player card banner featuring crossed blood-red blades.', iconName: 'Flag', rarity: 'UNCOMMON' },
      { tier: 4, level: 20, rewardName: 'Aura: Crimson Sparks', rewardType: 'AURA', description: 'Red ember particle aura emanating from your melee weapon.', iconName: 'Flame', rarity: 'RARE' },
      { tier: 5, level: 25, rewardName: 'Title: Blademaster', rewardType: 'TITLE', description: 'Unlocks the prestigious [Blademaster] title.', iconName: 'Award', rarity: 'RARE' },
      { tier: 6, level: 30, rewardName: 'Cosmetic: Crimson Scabbard', rewardType: 'COSMETIC', description: 'Gilded red hip scabbard for sheathed blades.', iconName: 'Shield', rarity: 'EPIC' },
      { tier: 7, level: 35, rewardName: 'Aura: Radiant Slash Trails', rewardType: 'AURA', description: 'Brilliant ruby arc trails when swinging weapons.', iconName: 'Zap', rarity: 'EPIC' },
      { tier: 8, level: 40, rewardName: 'Title: Grand Warmaster', rewardType: 'TITLE', description: 'Unlocks the [Grand Warmaster] title in golden lettering.', iconName: 'Award', rarity: 'LEGENDARY' },
      { tier: 9, level: 45, rewardName: 'Aura: War God Presence', rewardType: 'AURA', description: 'Intense crimson halo aura hovering above your operative.', iconName: 'Sun', rarity: 'LEGENDARY' },
      { tier: 10, level: 50, rewardName: 'Mastery Cape: Cape of Attack', rewardType: 'CAPE', description: 'Flowing crimson cape trimmed in gold with custom attack emote.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  strength: {
    slug: 'strength',
    name: 'Strength',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#f97316',
    bgGradient: 'from-orange-950/40 via-orange-900/20 to-black',
    iconName: 'Dumbbell',
    tagline: 'Raw physical might, crushing force, and heavy armor poise.',
    summary: 'Strength dictates maximum damage output with all melee weapons, improves knockback impact, and allows wearing heavy crushing equipment.',
    perLevelPerks: [
      '+1.8% Maximum Melee Damage multiplier',
      '+0.5% Knockback Resistance and Poise',
      'Increases maximum inventory weight threshold',
      'Boosts effectiveness of crushing warhammers and mauls',
    ],
    trainingMethods: [
      'Use heavy crushing combat abilities (Smash, Heavy Swing, Ground Slam).',
      'Train with two-handed heavy weaponry against high-health bosses.',
      'Perform manual mining and heavy log haul activities in Sanctuary.',
    ],
    staticMilestones: [
      { level: 1, title: 'Bronze Heavy Armaments', description: 'Equip Bronze Battleaxe, Warhammer, and Clubs.', type: 'EQUIPMENT' },
      { level: 5, title: 'Power Strike', description: 'Unlocks the Power Strike heavy attack ability.', type: 'ABILITY' },
      { level: 10, title: 'Iron Crushing Weaponry', description: 'Equip Iron Battleaxe, Warhammer, and Two-Handed Greatswords.', type: 'EQUIPMENT' },
      { level: 15, title: 'War Cry Shout', description: 'AoE buff increasing melee physical damage by 20% for 15s.', type: 'ABILITY' },
      { level: 20, title: 'Steel Heavy Armaments', description: 'Equip Steel Battleaxe, Warhammer, and Mauls.', type: 'EQUIPMENT' },
      { level: 25, title: 'Mithril Heavy Weaponry', description: 'Equip Mithril Battleaxe and Resonant Warhammers.', type: 'EQUIPMENT' },
      { level: 30, title: 'Ground Slam AoE', description: 'Tectonic ground impact dealing heavy stagger to surrounding enemies.', type: 'ABILITY' },
      { level: 35, title: 'Adamant Colossus Gear', description: 'Equip massive Adamant Broadswords and 2H Greatswords.', type: 'EQUIPMENT' },
      { level: 40, title: 'Rune Heavy Masterworks', description: 'Equip masterwork Rune Battleaxes and devastating 2H Greatswords.', type: 'EQUIPMENT' },
      { level: 45, title: 'Colossus Earthshaker Maul', description: 'Equip ancient Colossus Mauls that cause tectonic fissures.', type: 'EQUIPMENT' },
      { level: 50, title: 'Titan Worldbreaker & Immortal Brawn', description: 'Equip Titan Worldbreaker Hammer & gain 25% passive armor penetration.', type: 'EQUIPMENT' },
    ],
    battlepassTiers: [
      { tier: 1, level: 5, rewardName: 'Title: Novice Brawler', rewardType: 'TITLE', description: 'Unlocks the [Novice Brawler] title on your character nameplate.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 10, rewardName: 'Emote: Muscle Flex', rewardType: 'EMOTE', description: 'Show off your physical power with a heavy muscle flex emote.', iconName: 'Sparkles', rarity: 'UNCOMMON' },
      { tier: 3, level: 15, rewardName: 'Banner: Titan Sigil', rewardType: 'BANNER', description: 'Player card banner featuring the blazing fist of the Titans.', iconName: 'Flag', rarity: 'UNCOMMON' },
      { tier: 4, level: 20, rewardName: 'Aura: Earth Tremor Steps', rewardType: 'AURA', description: 'Pulsing shockwave rings beneath your operative while moving.', iconName: 'Flame', rarity: 'RARE' },
      { tier: 5, level: 25, rewardName: 'Title: Colossus of Iron', rewardType: 'TITLE', description: 'Unlocks the heavy [Colossus of Iron] title.', iconName: 'Award', rarity: 'RARE' },
      { tier: 6, level: 30, rewardName: 'Cosmetic: Spiked Pauldrons', rewardType: 'COSMETIC', description: 'Heavy battle-forged spiked shoulder guards.', iconName: 'Shield', rarity: 'EPIC' },
      { tier: 7, level: 35, rewardName: 'Aura: Molten Impact Trails', rewardType: 'AURA', description: 'Fiery shockwave arcs trailing behind heavy weapon swings.', iconName: 'Zap', rarity: 'EPIC' },
      { tier: 8, level: 40, rewardName: 'Title: Unstoppable Juggernaut', rewardType: 'TITLE', description: 'Unlocks the legendary [Unstoppable Juggernaut] title.', iconName: 'Award', rarity: 'LEGENDARY' },
      { tier: 9, level: 45, rewardName: 'Aura: Titan Amber Glow', rewardType: 'AURA', description: 'Intense amber radiant steam rising from your operative.', iconName: 'Sun', rarity: 'LEGENDARY' },
      { tier: 10, level: 50, rewardName: 'Mastery Cape: Cape of Strength', rewardType: 'CAPE', description: 'Heavy orange cape adorned with gilded titan crest and custom boulder lift emote.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  defence: {
    slug: 'defence',
    name: 'Defence',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#3b82f6',
    bgGradient: 'from-blue-950/40 via-blue-900/20 to-black',
    iconName: 'Shield',
    tagline: 'Armor mitigation, parry timing, and damage deflection.',
    summary: 'Defence reduces incoming physical and projectile damage, expands perfect parry windows, and unlocks heavy platebody armor.',
    perLevelPerks: [
      '+1.2% Overall Damage Reduction from physical attacks',
      '+0.8% Chance to completely deflect incoming hits',
      'Unlocks high-tier shield and plate armor requirements',
      'Extends shield block and parry reaction windows',
    ],
    trainingMethods: [
      'Equip shields and use defensive combat stances (Block, Bulwark).',
      'Mitigate damage during dangerous monster and boss encounters.',
      'Trigger successful parries during creature battles.',
    ],
    staticMilestones: [
      { level: 1, title: 'Bronze Plate Armor & Kiteshield', description: 'Equip Bronze Full Helm, Platebody, Platelegs, and Kiteshield.', type: 'EQUIPMENT' },
      { level: 5, title: 'Shield Block Stance', description: 'Activate active block reducing incoming hit damage by 50% and resisting stagger.', type: 'ABILITY' },
      { level: 10, title: 'Iron Plate Armor & Kiteshield', description: 'Equip full Iron plate armor sets and heavy iron kiteshields.', type: 'EQUIPMENT' },
      { level: 15, title: 'Bulwark Fortification', description: 'Defensive surge granting temporary immunity to stun and knockback for 8s.', type: 'ABILITY' },
      { level: 20, title: 'Steel Plate Armor & Tower Shield', description: 'Equip tempered Steel plate armor and total-body tower shields.', type: 'EQUIPMENT' },
      { level: 25, title: 'Mithril Plate Armor & Kiteshield', description: 'Equip lightweight Mithril plate armor and rapid-parry azure kiteshields.', type: 'EQUIPMENT' },
      { level: 30, title: 'Iron Fortress Wall', description: 'Creates a protective energy barrier absorbing up to 250 incoming damage.', type: 'ABILITY' },
      { level: 35, title: 'Adamant Plate Armor & Tower Shield', description: 'Equip monolithic emerald Adamantine plate armor and siege shields.', type: 'EQUIPMENT' },
      { level: 40, title: 'Rune Masterwork Armor Set', description: 'Equip masterwork cyan Runite plate armor and protection kiteshields.', type: 'EQUIPMENT' },
      { level: 45, title: 'Saintly Bastion Aegis & Plate', description: 'Equip consecrated Saintly Bastion Aegis and divine Radiant Cuirass.', type: 'EQUIPMENT' },
      { level: 50, title: 'Celestial Cosmos Bulwark & Fortress Plate', description: 'Equip ultimate Celestial Cosmos Bulwark and gain 10% damage reflection passive.', type: 'EQUIPMENT' },
    ],
    battlepassTiers: [
      { tier: 1, level: 5, rewardName: 'Title: Shieldbearer', rewardType: 'TITLE', description: 'Unlocks the [Shieldbearer] title on your character nameplate.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 10, rewardName: 'Emote: Shield Salute', rewardType: 'EMOTE', description: 'Bang your sword against your shield in a valiant combat salute.', iconName: 'Sparkles', rarity: 'UNCOMMON' },
      { tier: 3, level: 15, rewardName: 'Banner: Blue Aegis', rewardType: 'BANNER', description: 'Emblazoned azure shield player card banner.', iconName: 'Flag', rarity: 'UNCOMMON' },
      { tier: 4, level: 20, rewardName: 'Aura: Sapphire Barrier', rewardType: 'AURA', description: 'Soft glowing blue protective energy rings circling your operative.', iconName: 'Shield', rarity: 'RARE' },
      { tier: 5, level: 25, rewardName: 'Title: Iron Wall Sentinel', rewardType: 'TITLE', description: 'Unlocks the prestigious [Iron Wall Sentinel] title.', iconName: 'Award', rarity: 'RARE' },
      { tier: 6, level: 30, rewardName: 'Cosmetic: Diamond Hardened Pauldrons', rewardType: 'COSMETIC', description: 'Glittering heavy diamond-reinforced shoulder armor.', iconName: 'Shield', rarity: 'EPIC' },
      { tier: 7, level: 35, rewardName: 'Aura: Prismatic Ward Dome', rewardType: 'AURA', description: 'Faint crystalline hexagonal shield dome encircling your hero.', iconName: 'Zap', rarity: 'EPIC' },
      { tier: 8, level: 40, rewardName: 'Title: Immortal Bastion', rewardType: 'TITLE', description: 'Unlocks the [Immortal Bastion] title in gleaming cobalt font.', iconName: 'Award', rarity: 'LEGENDARY' },
      { tier: 9, level: 45, rewardName: 'Aura: Celestial Aegis Halo', rewardType: 'AURA', description: 'Brilliant sapphire and gold holy halo hovering above.', iconName: 'Sun', rarity: 'LEGENDARY' },
      { tier: 10, level: 50, rewardName: 'Mastery Cape: Cape of Defence', rewardType: 'CAPE', description: 'Cobalt blue master cape with glowing shield trim and custom fortress ward emote.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  hitpoints: {
    slug: 'hitpoints',
    name: 'Hitpoints',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#10b981',
    bgGradient: 'from-emerald-950/40 via-emerald-900/20 to-black',
    iconName: 'Heart',
    tagline: 'Vitality reservoir, passive health regeneration, and life force.',
    summary: 'Hitpoints determines your maximum Health Pool (HP), out-of-combat regeneration speed, and resilience against fatal blows.',
    perLevelPerks: [
      '+5 Maximum HP per level',
      '+0.3 HP/sec out-of-combat natural regeneration',
      'Higher threshold before entering wounded or critical states',
      'Improves healing received from food and potions by +1% per level',
    ],
    trainingMethods: [
      'Gains passive XP from all combat encounters, monster defeats, and turn battles.',
      'Consuming nutritious gourmet meals and healing salves.',
    ],
    staticMilestones: [
      { level: 1, title: 'Base Vitality (10 HP) & Fresh Rations', description: 'Consume Fresh Bread and Cooked Fish to replenish health.', type: 'RECIPE' },
      { level: 5, title: 'Field Dressing & Salves', description: 'Apply Field Dressing Kits restoring 40 HP instantly.', type: 'RECIPE' },
      { level: 10, title: 'Rainbow Trout Rations (50 HP)', description: 'Consume grilled freshwater fish for hearty mid-combat healing.', type: 'RECIPE' },
      { level: 15, title: 'Vitality Draught Infusion', description: 'Consume herbal vitality tonics granting rapid burst health restoration.', type: 'RECIPE' },
      { level: 20, title: 'Crimson Salmon Rations (100 HP)', description: 'Nutrient-rich salmon that strengthens cellular regeneration.', type: 'RECIPE' },
      { level: 25, title: 'Heartstone Amulet & Resilient Core', description: 'Equip Heartstone Amulets (+50 HP) & gain 10% poison/burn resistance.', type: 'EQUIPMENT' },
      { level: 30, title: 'Butter-Seared Lobster Feasts', description: 'Gourmet seafood feast restoring 200 HP with ongoing regeneration.', type: 'RECIPE' },
      { level: 35, title: 'Elixir of Rapid Mending', description: 'High-grade alchemical elixir restoring 300 HP and curing bleeds.', type: 'RECIPE' },
      { level: 40, title: 'Apex Shark Steaks (200 HP)', description: 'Consume apex predator rations delivering massive surge healing.', type: 'RECIPE' },
      { level: 45, title: 'Saintly Ambrosia Nectar', description: 'Nectar of the saints restoring 650 HP and expanding max health pool.', type: 'RECIPE' },
      { level: 50, title: 'Phoenix Rebirth Heart & Immortal Vigor', description: 'Consume Phoenix Rebirth Elixirs & gain fatal blow survival ward with +50 passive max HP.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 5, rewardName: 'Title: Novice Vitalist', rewardType: 'TITLE', description: 'Unlocks the [Novice Vitalist] title on your character nameplate.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 10, rewardName: 'Emote: Deep Breath Recovery', rewardType: 'EMOTE', description: 'Take a focused deep breath, summoning a brief healing glow.', iconName: 'Sparkles', rarity: 'UNCOMMON' },
      { tier: 3, level: 15, rewardName: 'Banner: Verdant Bloom', rewardType: 'BANNER', description: 'Player card banner featuring an unfurling emerald life blossom.', iconName: 'Flag', rarity: 'UNCOMMON' },
      { tier: 4, level: 20, rewardName: 'Aura: Emerald Pulse', rewardType: 'AURA', description: 'Soothing emerald heartbeat pulse rings radiating outward from your operative.', iconName: 'Heart', rarity: 'RARE' },
      { tier: 5, level: 25, rewardName: 'Title: Resilient Soul', rewardType: 'TITLE', description: 'Unlocks the [Resilient Soul] title in vibrant green lettering.', iconName: 'Award', rarity: 'RARE' },
      { tier: 6, level: 30, rewardName: 'Cosmetic: Lifebloom Brooch', rewardType: 'COSMETIC', description: 'Glowing emerald leaf brooch pinned to chest armor.', iconName: 'Shield', rarity: 'EPIC' },
      { tier: 7, level: 35, rewardName: 'Aura: Vitality Blossom Swarm', rewardType: 'AURA', description: 'Swirling green healing petals orbiting your character continuously.', iconName: 'Zap', rarity: 'EPIC' },
      { tier: 8, level: 40, rewardName: 'Title: Living Phoenix', rewardType: 'TITLE', description: 'Unlocks the legendary [Living Phoenix] title.', iconName: 'Award', rarity: 'LEGENDARY' },
      { tier: 9, level: 45, rewardName: 'Aura: Divine Fountain Halo', rewardType: 'AURA', description: 'Radiant emerald and gold halo emitting soothing water droplet particles.', iconName: 'Sun', rarity: 'LEGENDARY' },
      { tier: 10, level: 50, rewardName: 'Mastery Cape: Cape of Hitpoints', rewardType: 'CAPE', description: 'Regal emerald green cape trimmed in gold with custom phoenix rebirth animation emote.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  ranged: {
    slug: 'ranged',
    name: 'Ranged',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#14b8a6',
    bgGradient: 'from-teal-950/40 via-teal-900/20 to-black',
    iconName: 'Crosshair',
    tagline: 'Precision marksmanship, bows, crossbows, and ammunition.',
    summary: 'Ranged increases accuracy and damage with bows and projectile weaponry, increases attack distance, and unlocks specialized arrow types.',
    perLevelPerks: [
      '+1.6% Ranged Damage & Projectile Speed',
      '+1.2% Ranged Accuracy Rating',
      'Unlocks higher tier bows, crossbows, and quivers',
      'Expands maximum targeting range by +0.1 tiles per level',
    ],
    trainingMethods: [
      'Engage enemies from afar with bows, crossbows, and throwing darts.',
      'Use ranged abilities like Snipe, Multi-shot, and Arrow Rain.',
      'Practice target shooting at the Sanctuary Archery Range.',
    ],
    staticMilestones: [
      { level: 1, title: 'Wooden Shortbow & Leather Chaps', description: 'Equip starter hunting shortbows and tanned leather archery chaps.', type: 'EQUIPMENT' },
      { level: 5, title: 'Quick Shot RT Technique', description: 'Instant snap-shot ability dealing physical ranged pierce.', type: 'ABILITY' },
      { level: 10, title: 'Oak Recurve Bow & Volley', description: 'Equip Oak Recurve Bows and unleash multi-arrow volleys.', type: 'EQUIPMENT' },
      { level: 15, title: 'Studded Leather Armor & Snare', description: 'Equip Studded Leather Tunics and set pinning Geo traps.', type: 'EQUIPMENT' },
      { level: 20, title: 'Willow Composite Bow', description: 'Equip rapid-fire Willow Composite Bows with increased critical chance.', type: 'EQUIPMENT' },
      { level: 25, title: 'Maple War Bow & Snipe Shot', description: 'Equip heavy tension Maple War Bows with high effective range.', type: 'EQUIPMENT' },
      { level: 30, title: 'Emerald Wyrmhide Tunic', description: 'Equip supple Wyrmhide tunics with high magic defense and ranged accuracy.', type: 'EQUIPMENT' },
      { level: 35, title: 'Yew Sniper Longbow', description: 'Equip long-range Yew Sniper Longbows dealing armor-piercing critical strikes.', type: 'EQUIPMENT' },
      { level: 40, title: 'Enchanted Magic Shortbow', description: 'Equip rune-inscribed Magic Shortbows with double-shot special volleys.', type: 'EQUIPMENT' },
      { level: 45, title: 'Darkveil Siege Crossbow & Saintly Garb', description: 'Equip Darkveil Siege Ballistas and divine Sunstrider Garb.', type: 'EQUIPMENT' },
      { level: 50, title: 'Celestial Sunstriker Greatbow & Eagle Eye', description: 'Equip Celestial Sunstriker Greatbow firing cosmic plasma arrows with 25% ammo retrieval passive.', type: 'EQUIPMENT' },
    ],
    battlepassTiers: [
      { tier: 1, level: 5, rewardName: 'Title: Novice Marksman', rewardType: 'TITLE', description: 'Unlocks the [Novice Marksman] title on your character nameplate.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 10, rewardName: 'Emote: Arrow Twirl', rewardType: 'EMOTE', description: 'Deftly spin an arrow around your fingers with marksmanship flair.', iconName: 'Sparkles', rarity: 'UNCOMMON' },
      { tier: 3, level: 15, rewardName: 'Banner: Falcon Talon', rewardType: 'BANNER', description: 'Player card banner featuring a diving falcon with drawn bow.', iconName: 'Flag', rarity: 'UNCOMMON' },
      { tier: 4, level: 20, rewardName: 'Aura: Gale Wind Trails', rewardType: 'AURA', description: 'Soft teal aerodynamic wind vortices swirling at your feet.', iconName: 'Wind', rarity: 'RARE' },
      { tier: 5, level: 25, rewardName: 'Title: Windstrider', rewardType: 'TITLE', description: 'Unlocks the [Windstrider] title in glowing teal font.', iconName: 'Award', rarity: 'RARE' },
      { tier: 6, level: 30, rewardName: 'Cosmetic: Feathered Quiver', rewardType: 'COSMETIC', description: 'Ornate back-mounted quiver filled with iridescent fletched arrows.', iconName: 'Shield', rarity: 'EPIC' },
      { tier: 7, level: 35, rewardName: 'Aura: Phantom Arrow Trails', rewardType: 'AURA', description: 'Ethereal teal vapor trails streaking behind every fired projectile.', iconName: 'Zap', rarity: 'EPIC' },
      { tier: 8, level: 40, rewardName: 'Title: Deadeye Sniper', rewardType: 'TITLE', description: 'Unlocks the legendary [Deadeye Sniper] title.', iconName: 'Award', rarity: 'LEGENDARY' },
      { tier: 9, level: 45, rewardName: 'Aura: Solar Scope Halo', rewardType: 'AURA', description: 'Floating holographic crosshair target reticle above your operative.', iconName: 'Sun', rarity: 'LEGENDARY' },
      { tier: 10, level: 50, rewardName: 'Mastery Cape: Cape of Ranged', rewardType: 'CAPE', description: 'Teal & gold master cloak trimmed in falcon feathers with custom eagle shot emote.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  agility: {
    slug: 'agility',
    name: 'Agility',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#06b6d4',
    bgGradient: 'from-cyan-950/40 via-cyan-900/20 to-black',
    iconName: 'Wind',
    tagline: 'Movement speed, stamina recharge, dodge roll, and map shortcuts.',
    summary: 'Agility enables swift combat evasions, reduces stamina drain during sprints, and unlocks hidden terrain shortcut passages across the realm.',
    perLevelPerks: [
      '+0.8% Sprint Movement Speed bonus',
      '+1.5% Stamina Recovery Rate',
      'Reduces dodge roll cooldown and stamina cost',
      'Unlocks world agility shortcuts, fences, and ledge leaps',
    ],
    trainingMethods: [
      'Complete Agility Obstacle Courses in towns and mountain passes.',
      'Execute successful dodge rolls in active combat.',
      'Traverse high-tier world shortcut obstacles.',
    ],
    staticMilestones: [
      { level: 1, title: 'Basic Sprint', description: 'Base sprint duration and roll evasion.', type: 'PASSIVE' },
      { level: 10, title: 'Saints Village Fence Shortcut', description: 'Hop over the southern perimeter fence.', type: 'ZONE' },
      { level: 20, title: 'Acrobatic Roll', description: 'Dodge roll grants 0.3s invulnerability frames (i-frames).', type: 'ABILITY' },
      { level: 35, title: 'Mountain Cliffside Traverse', description: 'Scale sheer cliffs to skip lengthy switchback routes.', type: 'ZONE' },
      { level: 50, title: 'Windrunner Stride', description: 'Passive: Sprinting no longer drains stamina out of combat.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Nimble', rewardType: 'TITLE', description: 'Unlocks the [Nimble] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 25, rewardName: 'Aura: Gust Streamers', rewardType: 'AURA', description: 'Cyan wind ribbons trailing behind character movement.', iconName: 'Wind', rarity: 'RARE' },
      { tier: 3, level: 50, rewardName: 'Mastery Cape: Cape of Agility', rewardType: 'CAPE', description: 'Aerodynamic cyan master cape with feathered trim.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  perception: {
    slug: 'perception',
    name: 'Perception',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#8b5cf6',
    bgGradient: 'from-purple-950/40 via-purple-900/20 to-black',
    iconName: 'Eye',
    tagline: 'Critical precision, stealth detection, and hidden treasure radar.',
    summary: 'Perception heightens your sensory acuity, detecting hidden stealth monsters, revealing secret wall passages, and amplifying critical strike chance.',
    perLevelPerks: [
      '+0.6% Critical Hit Chance across all attack types',
      '+1.2% Critical Damage Multiplier',
      'Reveals invisible traps and stealthed shadow enemies',
      'Expands MiniMap radar vision radius for rare creature spawns',
    ],
    trainingMethods: [
      'Land critical strikes in real-time combat.',
      'Uncover hidden loot caches and decipher ancient runes.',
      'Track rare remarkable/shiny creature tracks.',
    ],
    staticMilestones: [
      { level: 1, title: 'Keen Eye', description: 'Detect standard traps and hidden footprints.', type: 'PASSIVE' },
      { level: 15, title: 'Weak-Point Analysis', description: 'Ability that marks a target, increasing party crit chance by 15%.', type: 'ABILITY' },
      { level: 30, title: 'Shadow Sight', description: 'Passive: See stealthed stalkers and rogue NPCs.', type: 'PASSIVE' },
      { level: 50, title: 'Omnipresent Gaze', description: 'Passive: 100% chance to critically strike targets below 25% HP.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Scout', rewardType: 'TITLE', description: 'Unlocks the [Scout] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 25, rewardName: 'Aura: Mystic Third Eye', rewardType: 'AURA', description: 'Glowing purple eye sigil above your character forehead.', iconName: 'Eye', rarity: 'RARE' },
      { tier: 3, level: 50, rewardName: 'Mastery Cape: Cape of Perception', rewardType: 'CAPE', description: 'Violet silk cape shimmering with starlight glyphs.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  wisdom: {
    slug: 'wisdom',
    name: 'Wisdom',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#6366f1',
    bgGradient: 'from-indigo-950/40 via-indigo-900/20 to-black',
    iconName: 'BookOpen',
    tagline: 'Mana reserves, elemental resistance, and restorative support.',
    summary: 'Wisdom governs your Mana Pool (MP), party healing potency, and protective barriers against elemental fire, frost, and void spells.',
    perLevelPerks: [
      '+6 Maximum Mana Pool per level',
      '+1.5% Healing & Shield Potency granted to allies',
      '+0.8% Magic and Elemental Resistance',
      'Reduces mana cost of recovery and support spells',
    ],
    trainingMethods: [
      'Cast restoration and shielding spells on self or party members.',
      'Absorb spiritual energy from Sacred Wellsprings.',
      'Perform turn-based soul pacification rituals.',
    ],
    staticMilestones: [
      { level: 1, title: 'Minor Mend', description: 'Basic restorative spell healing 30 HP.', type: 'ABILITY' },
      { level: 15, title: 'Luminescence Barrier', description: 'Shields ally for 100 damage absorption.', type: 'ABILITY' },
      { level: 30, title: 'Sanctuary Wave', description: 'Group AoE heal cleansing burn and bleed status.', type: 'ABILITY' },
      { level: 50, title: 'Ascended Serenity', description: 'Passive: Mana regenerates at 5% per second during combat.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Disciple', rewardType: 'TITLE', description: 'Unlocks the [Disciple] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 25, rewardName: 'Aura: Indigo Halo', rewardType: 'AURA', description: 'Celestial indigo energy orbit around character hands.', iconName: 'Sparkles', rarity: 'RARE' },
      { tier: 3, level: 50, rewardName: 'Mastery Cape: Cape of Wisdom', rewardType: 'CAPE', description: 'Indigo velvet cape with glowing gold scripture.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  intelligence: {
    slug: 'intelligence',
    name: 'Intelligence',
    category: 'Combat',
    maxLevel: 50,
    themeColor: '#ec4899',
    bgGradient: 'from-pink-950/40 via-pink-900/20 to-black',
    iconName: 'Cpu',
    tagline: 'Spellcasting potency, ability haste, and arcane elemental force.',
    summary: 'Intelligence amplifies the destructive output of all spells, decreases ability cooldown timers, and unlocks arcane staves and wands.',
    perLevelPerks: [
      '+2.0% Magic Spell Damage multiplier',
      '+0.5% Ability Cooldown Haste',
      'Unlocks elemental staves, arcane orbs, and grimoires',
      'Increases spell critical strike damage',
    ],
    trainingMethods: [
      'Cast offensive spells (Fireball, Frost Nova, Arcane Bolt) in RT combat.',
      'Decipher ancient arcane spellbooks in library archives.',
      'Craft high-tier magic runes and glyph matrices.',
    ],
    staticMilestones: [
      { level: 1, title: 'Arcane Spark & Wooden Staff', description: 'Basic spell bolt and focus weapon.', type: 'EQUIPMENT' },
      { level: 10, title: 'Fireball', description: 'High-damage explosive fireball projectile with burn effect.', type: 'ABILITY' },
      { level: 25, title: 'Frost Nova', description: 'Freezes all surrounding enemies in a 3-tile radius for 2s.', type: 'ABILITY' },
      { level: 40, title: 'Meteor Strike', description: 'Calls down celestial devastation over target area.', type: 'ABILITY' },
      { level: 50, title: 'Archmage Primacy', description: 'Passive: All spell critical strikes refund 100% of their mana cost.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Scholar', rewardType: 'TITLE', description: 'Unlocks the [Scholar] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 25, rewardName: 'Aura: Arcane Glyphs', rewardType: 'AURA', description: 'Rotating magenta runic circles orbiting feet.', iconName: 'Cpu', rarity: 'RARE' },
      { tier: 3, level: 50, rewardName: 'Mastery Cape: Cape of Intelligence', rewardType: 'CAPE', description: 'Magenta & black cape woven from pure mana threads.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  farming: {
    slug: 'farming',
    name: 'Farming',
    category: 'Gathering',
    maxLevel: 99,
    themeColor: '#84cc16',
    bgGradient: 'from-lime-950/40 via-lime-900/20 to-black',
    iconName: 'Sprout',
    tagline: 'Crop cultivation, rare herb patches, and botanical yields.',
    summary: 'Farming allows planting, tending, and harvesting crops, magical herbs for Herblore, and fruit trees across Sanctuary estate plots.',
    perLevelPerks: [
      '+1.0% Chance for Double Harvest yield per crop',
      '+0.8% Crop Growth Speed reduction',
      'Unlocks rare magical seeds, herbs, and fruit saplings',
      'Protects crops against blight and disease',
    ],
    trainingMethods: [
      'Plant seeds in tilled soil plots in the Sanctuary Farm.',
      'Harvest mature wheat, vegetables, and rare alchemy herbs.',
      'Tend orchard trees and compost fertile soil.',
    ],
    staticMilestones: [
      { level: 1, title: 'Wheat & Potato Seeds', description: 'Basic staple crops for food recipes.', type: 'GATHER' },
      { level: 15, title: 'Marrentill & Tarromin Herbs', description: 'Basic healing herb cultivation.', type: 'GATHER' },
      { level: 30, title: 'Ranarr Weed', description: 'Sacred herb used to brew powerful restoration potions.', type: 'GATHER' },
      { level: 50, title: 'Torstol Herb', description: 'Master alchemy herb for overcharge elixirs.', type: 'GATHER' },
      { level: 99, title: 'Spirit Tree Orchard', description: 'Cultivate teleportation spirit trees in your sanctuary.', type: 'ZONE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Harvester', rewardType: 'TITLE', description: 'Unlocks the [Harvester] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Sprouting Flora', rewardType: 'AURA', description: 'Lush flowers sprout beneath operative footprints.', iconName: 'Sprout', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Farming', rewardType: 'CAPE', description: 'Vibrant green cape trimmed with golden wheat embroidery.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  fishing: {
    slug: 'fishing',
    name: 'Fishing',
    category: 'Gathering',
    maxLevel: 99,
    themeColor: '#0ea5e9',
    bgGradient: 'from-sky-950/40 via-sky-900/20 to-black',
    iconName: 'Fish',
    tagline: 'Coastal angling, deep-sea trawling, and aquatic bounties.',
    summary: 'Fishing provides raw seafood ingredients for high-stat Cooking recipes and soul bait for aquatic creature encounters.',
    perLevelPerks: [
      '+1.2% Faster catch rate at fishing spots',
      '+0.5% Chance to catch double fish per cast',
      'Unlocks higher tier fishing equipment (Rods, Harpoons, Cages)',
      'Reveals secret glowing whirlpools containing sunken treasure',
    ],
    trainingMethods: [
      'Cast net and fishing rod at coastline, river, and deep-sea fishing nodes.',
      'Harvest trout, salmon, lobsters, and deep-sea manta rays.',
    ],
    staticMilestones: [
      { level: 1, title: 'Small Net & Shrimps', description: 'Catch small shrimps and anchovies at coastal shallows.', type: 'GATHER' },
      { level: 20, title: 'Fly Fishing Rod & Trout', description: 'Catch river trout and salmon in freshwater streams.', type: 'GATHER' },
      { level: 40, title: 'Lobster Pot & Cage', description: 'Catch succulent lobsters on offshore rock reefs.', type: 'GATHER' },
      { level: 76, title: 'Harpoon & Shark', description: 'Harpoon vicious sharks in deep ocean waters.', type: 'GATHER' },
      { level: 99, title: 'Kraken Angler', description: 'Fish colossal legendary sea beasts from abyss waters.', type: 'GATHER' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Angler', rewardType: 'TITLE', description: 'Unlocks the [Angler] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Aqua Splash Rings', rewardType: 'AURA', description: 'Rippling water rings beneath your feet.', iconName: 'Fish', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Fishing', rewardType: 'CAPE', description: 'Deep ocean-blue master cape with aquatic wave trims.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  hunter: {
    slug: 'hunter',
    name: 'Hunter',
    category: 'Gathering',
    maxLevel: 99,
    themeColor: '#d97706',
    bgGradient: 'from-amber-950/40 via-amber-900/20 to-black',
    iconName: 'Target',
    tagline: 'Wildlife tracking, box traps, baiting, and camouflage.',
    summary: 'Hunter allows capturing wild creatures, tracking elusive beasts across harsh biomes, and gathering rare furs, chinchompas, and feathers.',
    perLevelPerks: [
      '+1.5% Trap Success & Catch Rate',
      '+1 Max active simultaneous traps deployed',
      'Unlocks exotic creature baits, falconry, and pitfall traps',
      'Reduces creature detection radius while sneaking',
    ],
    trainingMethods: [
      'Set bird snares, box traps, and deadfalls in wilderness zones.',
      'Track creature tracks through tall grass with magnifying lens.',
    ],
    staticMilestones: [
      { level: 1, title: 'Bird Snares', description: 'Catch crimson finches and copper birds in woodlands.', type: 'GATHER' },
      { level: 27, title: 'Box Trapping', description: 'Capture wild ferrets and explosive chinchompas.', type: 'GATHER' },
      { level: 53, title: 'Black Chinchompa', description: 'Catch highly dangerous explosive rodents in PvP wilderness.', type: 'GATHER' },
      { level: 99, title: 'Apex Predator', description: 'Track mythical chimeric apex beasts across the realm.', type: 'GATHER' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Tracker', rewardType: 'TITLE', description: 'Unlocks the [Tracker] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Camo Dust', rewardType: 'AURA', description: 'Swirling autumn leaves and camouflage particles.', iconName: 'Target', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Hunter', rewardType: 'CAPE', description: 'Fur-lined master cape with stag antler insignia.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  mining: {
    slug: 'mining',
    name: 'Mining',
    category: 'Gathering',
    maxLevel: 99,
    themeColor: '#78716c',
    bgGradient: 'from-stone-950/40 via-stone-900/20 to-black',
    iconName: 'Pickaxe',
    tagline: 'Ore excavation, crystal quarrying, and geology mastery.',
    summary: 'Mining extracts metal ores, coal, and glowing crystal dust from geological rock veins to fuel Smithing, Crafting, and capture technology.',
    perLevelPerks: [
      '+1.2% Ore Extraction Speed per strike',
      '+0.4% Chance to find uncut precious gems (Ruby, Diamond, Onyx)',
      'Unlocks higher tier pickaxes (Bronze to Rune to Celestial)',
      'Reduces mineral vein depletion speed',
    ],
    trainingMethods: [
      'Mine rock veins across caves, quarries, and mountain mines.',
      'Extract crystal dust from rare geode clusters.',
    ],
    staticMilestones: [
      { level: 1, title: 'Copper & Tin Ores', description: 'Mine base metals for Bronze smelting.', type: 'GATHER' },
      { level: 15, title: 'Iron Ore', description: 'Excavate dense iron deposits in mountain quarries.', type: 'GATHER' },
      { level: 30, title: 'Coal Veins', description: 'Mine essential coal fuel required for steel and high alloys.', type: 'GATHER' },
      { level: 55, title: 'Mithril Ore', description: 'Extract lightweight azure mithril minerals.', type: 'GATHER' },
      { level: 70, title: 'Adamantite Ore', description: 'Mine resilient green adamantite deposits.', type: 'GATHER' },
      { level: 85, title: 'Runite Ore', description: 'Excavate rare cyan runite boulders.', type: 'GATHER' },
      { level: 99, title: 'Celestial Starmetal', description: 'Mine fallen meteor fragments containing pure cosmic star ore.', type: 'GATHER' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Prospector', rewardType: 'TITLE', description: 'Unlocks the [Prospector] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Crystal Shards', rewardType: 'AURA', description: 'Glittering mineral gems orbiting character shoulders.', iconName: 'Pickaxe', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Mining', rewardType: 'CAPE', description: 'Stone-grey and turquoise cape with pickaxe crest.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  woodcutting: {
    slug: 'woodcutting',
    name: 'Woodcutting',
    category: 'Gathering',
    maxLevel: 99,
    themeColor: '#15803d',
    bgGradient: 'from-green-950/40 via-green-900/20 to-black',
    iconName: 'Axe',
    tagline: 'Forestry, timber harvesting, and enchanted woodcrafting.',
    summary: 'Woodcutting harvests lumber logs from regular, oak, willow, yew, and magic trees for Fletching, Firemaking, and Construction.',
    perLevelPerks: [
      '+1.4% Tree Chopping Speed per swing',
      '+0.5% Chance to find rare birds nests containing seeds and rings',
      'Unlocks higher tier hatchets and lumber tools',
      'Improves log yield before tree stump depletion',
    ],
    trainingMethods: [
      'Chop trees across forests, groves, and Sanctuary estates.',
      'Harvest exotic timber from overgrown rainforests.',
    ],
    staticMilestones: [
      { level: 1, title: 'Regular Trees', description: 'Chop basic wood logs for starter campfires and bows.', type: 'GATHER' },
      { level: 15, title: 'Oak Trees', description: 'Harvest sturdy oak logs for construction framing.', type: 'GATHER' },
      { level: 30, title: 'Willow Trees', description: 'Chop fast-respawning willow trees near riverbanks.', type: 'GATHER' },
      { level: 60, title: 'Yew Trees', description: 'Harvest resilient yew lumber for high-tier longbows.', type: 'GATHER' },
      { level: 75, title: 'Magic Trees', description: 'Chop glowing arcane trees pulsing with ambient mana.', type: 'GATHER' },
      { level: 90, title: 'Elder Redwood Trees', description: 'Fell towering colossal redwood giants.', type: 'GATHER' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Lumberjack', rewardType: 'TITLE', description: 'Unlocks the [Lumberjack] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Swirling Leaves', rewardType: 'AURA', description: 'Green forest leaf vortex circling your operative.', iconName: 'Axe', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Woodcutting', rewardType: 'CAPE', description: 'Deep evergreen cape with gilded oak leaf trim.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  construction: {
    slug: 'construction',
    name: 'Construction',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#a16207',
    bgGradient: 'from-yellow-950/40 via-yellow-900/20 to-black',
    iconName: 'Home',
    tagline: 'Sanctuary estate building, trophy halls, and teleporters.',
    summary: 'Construction enables building and customizing your personal Sanctuary Estate, including crafting workshops, portals, trophy rooms, and monster menageries.',
    perLevelPerks: [
      '+1 Room capacity in Player Sanctuary Estate',
      'Unlocks high-tier furniture, crafting benches, and altars',
      'Reduces materials required for workshop building',
      'Enables rapid teleportation nexus gates inside house',
    ],
    trainingMethods: [
      'Build and upgrade furniture, chairs, tables, and larders in estate.',
      'Plank sawmill manufacturing in town workshops.',
    ],
    staticMilestones: [
      { level: 1, title: 'Sanctuary Foundation', description: 'Purchase estate deed and build Parlour and Kitchen.', type: 'ZONE' },
      { level: 25, title: 'Workshop & Crafting Anvil', description: 'Install estate repair stands and indoor forge.', type: 'RECIPE' },
      { level: 50, title: 'Portal Chamber', description: 'Build teleportation portal frame linking major cities.', type: 'ZONE' },
      { level: 80, title: 'Rejuvenation Pool', description: 'Build pool that restores 100% HP, Mana, and Run energy.', type: 'RECIPE' },
      { level: 99, title: 'Grand Estate Citadel', description: 'Unlock floating celestial sanctuary realm expansion.', type: 'ZONE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Builder', rewardType: 'TITLE', description: 'Unlocks the [Builder] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Construction', rewardType: 'CAPE', description: 'Ochre & mahogany cape with estate key insignia.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  cooking: {
    slug: 'cooking',
    name: 'Cooking',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#ea580c',
    bgGradient: 'from-orange-950/40 via-orange-900/20 to-black',
    iconName: 'UtensilsCrossed',
    tagline: 'Gourmet rations, feast banquets, and stat-buffing meals.',
    summary: 'Cooking transforms raw fish, meats, and vegetables into nutritious rations that heal health, restore stamina, and grant long-duration combat stat buffs.',
    perLevelPerks: [
      '-1.0% Chance of Burning Food over campfires/ranges',
      '+0.5% Bonus HP restoration on cooked food items',
      'Unlocks gourmet multi-ingredient banquet recipes',
      'Adds bonus duration to food buff effects',
    ],
    trainingMethods: [
      'Cook raw fish and meats on campfires and kitchen ranges.',
      'Bake breads, pies, and multi-course royal feasts.',
    ],
    staticMilestones: [
      { level: 1, title: 'Cooked Shrimps (Heals 3 HP)', description: 'Basic starter meal.', type: 'RECIPE' },
      { level: 25, title: 'Cooked Salmon (Heals 9 HP)', description: 'Mid-tier restoration meal.', type: 'RECIPE' },
      { level: 40, title: 'Lobster Feast (Heals 12 HP)', description: 'Popular adventurer ration.', type: 'RECIPE' },
      { level: 80, title: 'Cooked Shark (Heals 20 HP)', description: 'High-tier combat staple meal.', type: 'RECIPE' },
      { level: 99, title: 'Ambrosia of the Saints', description: 'Heals 50 HP and grants +10% to all combat stats for 10m.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Chef', rewardType: 'TITLE', description: 'Unlocks the [Chef] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Cooking', rewardType: 'CAPE', description: 'Pure white chef master cape with crimson fire embroidery.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  crafting: {
    slug: 'crafting',
    name: 'Crafting',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#c084fc',
    bgGradient: 'from-purple-950/40 via-purple-900/20 to-black',
    iconName: 'Hammer',
    tagline: 'Soul cameras, capture film, gem jewelry, and leathercraft.',
    summary: 'Crafting manufactures soul-capturing devices, standard and fine grain capture films, gem-encrusted amulets, rings, and leather operative armor.',
    perLevelPerks: [
      '+1.0% Capture Device Catch-Rate multiplier bonus',
      '+0.8% Chance to save raw crafting materials',
      'Unlocks high-grade capture devices (Grand Ball, Mega Ball, Master Device)',
      'Unlocks enchanted gemstone jewelry crafting',
    ],
    trainingMethods: [
      'Craft capture devices and film stock at Crafting Stations.',
      'Cut raw gemstones (Sapphires, Emeralds, Rubies, Diamonds).',
      'Tether leather armors and weave enchanted textiles.',
    ],
    staticMilestones: [
      { level: 1, title: 'Standard Film & Capture Device', description: 'Craft basic soul-binding tools.', type: 'RECIPE' },
      { level: 10, title: 'Grand Capture Device', description: 'Craft 1.5x catch rate capture capsules.', type: 'RECIPE' },
      { level: 25, title: 'Fine Grain Film', description: 'Craft high-sensitivity film with 2.0x catch rate.', type: 'RECIPE' },
      { level: 50, title: 'Mega Capture Device & Diamond Ring', description: 'Craft advanced capturing gear and rings.', type: 'RECIPE' },
      { level: 99, title: 'Master Soul Matrix Device', description: 'Craft ultimate 100% capture device for mythical beings.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Artisan', rewardType: 'TITLE', description: 'Unlocks the [Artisan] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Crafting', rewardType: 'CAPE', description: 'Rich purple cape with golden needle and lens emblem.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  firemaking: {
    slug: 'firemaking',
    name: 'Firemaking',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#f87171',
    bgGradient: 'from-red-950/40 via-red-900/20 to-black',
    iconName: 'Flame',
    tagline: 'Campfire warmth, thermal beacons, and forge preheating.',
    summary: 'Firemaking ignites wood logs into radiant campfires, illuminates dark cavern dungeons, warms frost-bitten operatives, and activates thermal buffs.',
    perLevelPerks: [
      '+1.5% Campfire Warmth HP Regen aura radius and strength',
      '+1.0% Torch and lantern lighting duration in dark dungeons',
      'Unlocks bonfire social XP boosting mechanics',
      'Preheats smithing forges for faster metal smelting',
    ],
    trainingMethods: [
      'Ignite log trails with tinderbox across world zones.',
      'Maintain community bonfires in town squares.',
    ],
    staticMilestones: [
      { level: 1, title: 'Normal Log Fire', description: 'Basic campfire for warmth and cooking.', type: 'GATHER' },
      { level: 30, title: 'Willow Fire', description: 'Brighter flame with +15% warmth duration.', type: 'GATHER' },
      { level: 60, title: 'Yew Pyre', description: 'Intense fire boosting party combat stats by 5% nearby.', type: 'GATHER' },
      { level: 90, title: 'Magic Pyre Beacon', description: 'Colossal beacon visible across entire regional shard.', type: 'ZONE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Pyromancer', rewardType: 'TITLE', description: 'Unlocks the [Pyromancer] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Firemaking', rewardType: 'CAPE', description: 'Flame-orange cape tipped in flickering ember particles.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  fletching: {
    slug: 'fletching',
    name: 'Fletching',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#10b981',
    bgGradient: 'from-emerald-950/40 via-emerald-900/20 to-black',
    iconName: 'Feather',
    tagline: 'Bow carving, arrow fletching, and projectile munitions.',
    summary: 'Fletching carves timber logs into shortbows, longbows, crossbow stocks, and crafts specialized poisoned, barbed, and enchanted arrow ammunition.',
    perLevelPerks: [
      '+1.2% Faster fletching crafting speed',
      '+0.4% Chance to craft extra arrows per headless shaft batch',
      'Unlocks high-tier bow carving (Oak, Willow, Yew, Magic, Celestial)',
      'Enables tipping arrows with elemental gem dust',
    ],
    trainingMethods: [
      'Whittle logs into bows with a knife.',
      'Attach feathers to arrow shafts and attach metal arrowheads.',
    ],
    staticMilestones: [
      { level: 1, title: 'Wooden Shortbow & Bronze Arrows', description: 'Basic ranged weaponry crafting.', type: 'RECIPE' },
      { level: 25, title: 'Oak Longbow & Iron Arrows', description: 'Carve oak timber into distance bows.', type: 'RECIPE' },
      { level: 50, title: 'Yew Shortbow & Broad Bolts', description: 'High precision ranged munitions.', type: 'RECIPE' },
      { level: 70, title: 'Magic Shortbow & Rune Arrows', description: 'Rapid double-shot capable bow crafting.', type: 'RECIPE' },
      { level: 99, title: 'Celestial Starstring Longbow', description: 'Carve transcendent bow pulsing with starlight.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Fletcher', rewardType: 'TITLE', description: 'Unlocks the [Fletcher] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Fletching', rewardType: 'CAPE', description: 'Forest green cape featuring bow and quiver crest.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  herblore: {
    slug: 'herblore',
    name: 'Herblore',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#22c55e',
    bgGradient: 'from-green-950/40 via-green-900/20 to-black',
    iconName: 'FlaskConical',
    tagline: 'Alchemy potions, combat tinctures, and battle elixirs.',
    summary: 'Herblore cleans raw herbs and brews them into combat boost potions (Attack, Strength, Defence), energy elixirs, and antivenom antidotes.',
    perLevelPerks: [
      '+1.5% Extended Potion Buff Duration',
      '+0.5% Chance to brew 4-dose potion instead of 3-dose',
      'Unlocks extreme combat overcharge and super-stat potions',
      'Reduces toxicity and cooldown between potion sips',
    ],
    trainingMethods: [
      'Clean grimy herbs gathered from Farming and monster drops.',
      'Mix herbs into vials of water with secondary reagents.',
    ],
    staticMilestones: [
      { level: 1, title: 'Attack Potion', description: 'Brew potion boosting Attack level by +10% for 5m.', type: 'RECIPE' },
      { level: 12, title: 'Strength Potion', description: 'Brew potion boosting Strength damage by +10%.', type: 'RECIPE' },
      { level: 38, title: 'Prayer Restoration Potion', description: 'Restores divine prayer and faith points.', type: 'RECIPE' },
      { level: 72, title: 'Ranged Potion', description: 'Increases ranged accuracy and damage by +15%.', type: 'RECIPE' },
      { level: 99, title: 'Grand Overload Elixir', description: 'Massive +20% boost to ALL combat stats simultaneously.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Apothecary', rewardType: 'TITLE', description: 'Unlocks the [Apothecary] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Herblore', rewardType: 'CAPE', description: 'Herbal jade-green cape with vial flask insignia.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  runecrafting: {
    slug: 'runecrafting',
    name: 'Runecrafting',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#a855f7',
    bgGradient: 'from-purple-950/40 via-purple-900/20 to-black',
    iconName: 'Sparkle',
    tagline: 'Rune essence infusion, elemental glyphs, and spell tablets.',
    summary: 'Runecrafting channels pure raw essence at mysterious elemental altars, synthesizing Air, Fire, Water, Chaos, Death, and Blood runes for Magic casting.',
    perLevelPerks: [
      '+1.0% Multiplier for Extra Runes crafted per essence',
      'Unlocks access to higher tier Altars (Chaos, Nature, Death, Blood)',
      'Enables crafting combination runes (Steam, Mist, Lava, Dust)',
      'Increases essence pouch carrying capacity',
    ],
    trainingMethods: [
      'Mine pure rune essence in essence mines.',
      'Travel to elemental altars through talisman ruins to bind runes.',
    ],
    staticMilestones: [
      { level: 1, title: 'Air & Mind Runes', description: 'Craft basic elemental and strike spell runes.', type: 'RECIPE' },
      { level: 14, title: 'Fire Runes', description: 'Craft fire runes for combat combustion spells.', type: 'RECIPE' },
      { level: 44, title: 'Nature Runes', description: 'Craft nature runes essential for alchemy transmutation.', type: 'RECIPE' },
      { level: 65, title: 'Death Runes', description: 'Craft death runes for catastrophic destruction spells.', type: 'RECIPE' },
      { level: 77, title: 'Blood Runes', description: 'Craft blood runes for lifesteal and ancient magicks.', type: 'RECIPE' },
      { level: 99, title: 'Soul Runes', description: 'Infuse divine soul runes for ultimate reality bending.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Runesmith', rewardType: 'TITLE', description: 'Unlocks the [Runesmith] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Runecrafting', rewardType: 'CAPE', description: 'Cosmic amethyst cape woven with glowing elemental glyphs.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  smithing: {
    slug: 'smithing',
    name: 'Smithing',
    category: 'Artisan',
    maxLevel: 99,
    themeColor: '#f59e0b',
    bgGradient: 'from-amber-950/40 via-amber-900/20 to-black',
    iconName: 'Anvil',
    tagline: 'Ore smelting, metal bar forging, and plate armor assembly.',
    summary: 'Smithing smelts mined ores into metal bars and hammers them on anvils into swords, axes, daggers, platebodies, helms, and heavy shields.',
    perLevelPerks: [
      '+1.5% Faster anvil hammering & smelting speed',
      '+0.4% Chance to smelt double metal bars without extra coal',
      'Unlocks higher metal alloy tiers (Bronze to Mithril to Rune)',
      'Improves stats of player-crafted masterwork equipment by +5%',
    ],
    trainingMethods: [
      'Smelt raw ores at blast furnaces into metal ingots.',
      'Hammer metal bars into armor and weaponry on town anvils.',
    ],
    staticMilestones: [
      { level: 1, title: 'Bronze Smelting & Forging', description: 'Craft Bronze Swords, Daggers, and Helms.', type: 'RECIPE' },
      { level: 15, title: 'Iron Smelting & Forging', description: 'Craft sturdy Iron weaponry and plate armor.', type: 'RECIPE' },
      { level: 30, title: 'Steel Alloy Smelting', description: 'Smelt iron and coal into durable Steel bars.', type: 'RECIPE' },
      { level: 50, title: 'Mithril Forging', description: 'Craft lightweight azure Mithril plate armor and blades.', type: 'RECIPE' },
      { level: 70, title: 'Adamantite Forging', description: 'Hammer heavy Adamantite armor and battleaxes.', type: 'RECIPE' },
      { level: 85, title: 'Runite Masterwork Forging', description: 'Forge legendary Rune platebodies and two-handers.', type: 'RECIPE' },
      { level: 99, title: 'Celestial Star-Forging', description: 'Smelt starmetal into god-tier divine plate armor.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Blacksmith', rewardType: 'TITLE', description: 'Unlocks the [Blacksmith] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Molten Sparks', rewardType: 'AURA', description: 'Fiery gold anvil sparks flying from operative hands.', iconName: 'Flame', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Smithing', rewardType: 'CAPE', description: 'Heavy golden-bronze cape with glowing hammer and anvil crest.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  thieving: {
    slug: 'thieving',
    name: 'Thieving',
    category: 'Support',
    maxLevel: 99,
    themeColor: '#64748b',
    bgGradient: 'from-slate-950/40 via-slate-900/20 to-black',
    iconName: 'Key',
    tagline: 'Lockpicking, stealth infiltration, pickpocketing, and vault cracking.',
    summary: 'Thieving allows lifting coin pouches from NPCs, bypassing locked security gates and dungeon doors, disarming treasure traps, and sneak attacks.',
    perLevelPerks: [
      '+1.2% Pickpocketing Success Rate & Gold Stolen',
      '+0.8% Lockpicking Speed and Success on master vaults',
      'Reduces NPC stun duration on caught attempts',
      'Reveals hidden backdoors and rogue black market traders',
    ],
    trainingMethods: [
      'Pickpocket market merchants, guards, and rogue bandits.',
      'Crack locked treasure chests and security doors in dungeons.',
    ],
    staticMilestones: [
      { level: 1, title: 'Town Peasants & Bread Stalls', description: 'Pickpocket starter coins and food.', type: 'GATHER' },
      { level: 25, title: 'Village Guards & Lockpicks', description: 'Pickpocket guards for iron keys and coins.', type: 'GATHER' },
      { level: 55, title: 'Knight Paladins & Gem Stalls', description: 'Steal precious gemstones and gold purses.', type: 'GATHER' },
      { level: 82, title: 'Rogue Vault Cracking', description: 'Crack high-security subterranean bank vaults.', type: 'ZONE' },
      { level: 99, title: 'Phantom Shadowstep', description: 'Passive: Pickpocket attempts never stun you on failure.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Rogue', rewardType: 'TITLE', description: 'Unlocks the [Rogue] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Thieving', rewardType: 'CAPE', description: 'Midnight black velvet cloak lined with silver lockpick embroidery.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  summoning: {
    slug: 'summoning',
    name: 'Summoning',
    category: 'Support',
    maxLevel: 99,
    themeColor: '#059669',
    bgGradient: 'from-emerald-950/40 via-emerald-900/20 to-black',
    iconName: 'Sparkles',
    tagline: 'Creature soul bonding, familiar pacts, and combat beast synergy.',
    summary: 'Summoning binds soul charms with essence pouches, conjuring loyal companion familiars that fight beside you, carry extra inventory, and cast special scrolls.',
    perLevelPerks: [
      '+1.5% Summoned Companion Health and Attack Power',
      '+1.0% Extended Familiar Summon Duration',
      'Unlocks higher tier creature pouches (Pack Beasts, War Familiars)',
      'Reduces familiar scroll special attack point cost',
    ],
    trainingMethods: [
      'Infuse soul charms (Gold, Green, Crimson, Blue) at Summoning Obelisks.',
      'Fight alongside active summoned familiars in combat.',
    ],
    staticMilestones: [
      { level: 1, title: 'Dreadwolf Pouch', description: 'Summon small canine companion for basic melee assistance.', type: 'RECIPE' },
      { level: 25, title: 'Spirit Pack Beast', description: 'Summons pack mule beast capable of storing 12 extra items.', type: 'RECIPE' },
      { level: 52, title: 'War Titan Familiar', description: 'Heavy tank familiar that taunts monsters off player.', type: 'RECIPE' },
      { level: 85, title: 'Abyssal Dragon Familiar', description: 'Breathes searing hellfire dealing devastating AoE magic.', type: 'RECIPE' },
      { level: 99, title: 'Celestial Chimera Avatar', description: 'Summon god-beast companion granting massive aura buffs.', type: 'RECIPE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Soulbinder', rewardType: 'TITLE', description: 'Unlocks the [Soulbinder] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Summoning', rewardType: 'CAPE', description: 'Jade and amber cape with glowing spirit wolf sigil.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  magic: {
    slug: 'magic',
    name: 'Magic',
    category: 'Support',
    maxLevel: 99,
    themeColor: '#38bdf8',
    bgGradient: 'from-sky-950/40 via-sky-900/20 to-black',
    iconName: 'Wand2',
    tagline: 'Elemental incantations, teleportation portals, and alchemy.',
    summary: 'Magic commands elemental forces to unleash destructive combat strikes, teleport across world continents instantly, and transmute ores into pure gold.',
    perLevelPerks: [
      '+1.5% Magic Spell Accuracy & Damage',
      'Unlocks continental teleportation spells to major cities',
      'Enables High-Alchemy converting items into gold credits',
      'Reduces rune consumption chance on basic utility spells',
    ],
    trainingMethods: [
      'Cast combat spells (Wind Strike, Fire Blast) against monsters.',
      'Cast utility teleportation and alchemy conversion spells.',
    ],
    staticMilestones: [
      { level: 1, title: 'Wind Strike & Confuse', description: 'Basic elemental offensive strike.', type: 'ABILITY' },
      { level: 25, title: 'Varrock Teleport', description: 'Instant teleportation to the capital city square.', type: 'ABILITY' },
      { level: 55, title: 'High Level Alchemy', description: 'Convert items directly into gold credits anywhere.', type: 'ABILITY' },
      { level: 75, title: 'Fire Wave & Enfeeble', description: 'High tier combat destruction spells.', type: 'ABILITY' },
      { level: 99, title: 'Storm of the Ancients', description: 'Channel devastating lightning vortex across entire screen.', type: 'ABILITY' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Wizard', rewardType: 'TITLE', description: 'Unlocks the [Wizard] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Magic', rewardType: 'CAPE', description: 'Celestial blue wizard cape trimmed with golden stars.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  prayer: {
    slug: 'prayer',
    name: 'Prayer',
    category: 'Support',
    maxLevel: 99,
    themeColor: '#facc15',
    bgGradient: 'from-yellow-950/40 via-yellow-900/20 to-black',
    iconName: 'Sun',
    tagline: 'Divine blessings, holy protection shields, and combat auras.',
    summary: 'Prayer invokes holy faith powers to grant temporary combat buffs, 100% damage immunity shields (Protect from Melee/Missiles/Magic), and smite drain.',
    perLevelPerks: [
      '+1.0 Max Prayer / Faith Points per level',
      '+0.8% Duration of active prayer blessings before drain',
      'Unlocks overhead protection prayers granting damage mitigation',
      'Enables high-tier piety and retribution holy auras',
    ],
    trainingMethods: [
      'Bury animal bones and dragon bones in sacred soil.',
      'Offer bones at consecrated Church altars with lit incense burners.',
    ],
    staticMilestones: [
      { level: 1, title: 'Thick Skin (+5% Defence)', description: 'Basic holy defence aura.', type: 'ABILITY' },
      { level: 37, title: 'Protect from Magic', description: 'Overhead prayer deflecting 100% of monster magic damage.', type: 'ABILITY' },
      { level: 40, title: 'Protect from Missiles', description: 'Overhead prayer deflecting 100% of ranged projectile attacks.', type: 'ABILITY' },
      { level: 43, title: 'Protect from Melee', description: 'Overhead prayer deflecting 100% of melee attacks.', type: 'ABILITY' },
      { level: 70, title: 'Piety (+20% Atk, +23% Str, +25% Def)', description: 'Ultimate holy knight melee combat aura.', type: 'ABILITY' },
      { level: 99, title: 'Angelic Retribution', description: 'Passive: Upon death, unleash divine explosion restoring all allies to full HP.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Holy Cleric', rewardType: 'TITLE', description: 'Unlocks the [Holy Cleric] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 99, rewardName: 'Mastery Cape: Cape of Prayer', rewardType: 'CAPE', description: 'Pure white holy cape radiating brilliant golden sun rays.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
  necromancy: {
    slug: 'necromancy',
    name: 'Necromancy',
    category: 'Support',
    maxLevel: 99,
    themeColor: '#7c3aed',
    bgGradient: 'from-violet-950/40 via-violet-900/20 to-black',
    iconName: 'Skull',
    tagline: 'Dark soul reaping, shadow rituals, and undead thrall command.',
    summary: 'Necromancy reaps spiritual souls from defeated foes, conduits darkness into shadow volleys, and commands undead thralls (Skeleton Warriors, Spectres, Zombies).',
    perLevelPerks: [
      '+1.8% Shadow & Dark Magic Damage potency',
      '+1.0% Soul Reaping charge accumulation rate',
      'Unlocks higher tier Undead Thrall summons and spectral conduits',
      'Empowers lifesteal siphon from cursed enemies',
    ],
    trainingMethods: [
      'Conduct dark rituals at underworld soul altars.',
      'Reap souls from formidable elite monsters in combat.',
      'Command spectral summons in battle.',
    ],
    staticMilestones: [
      { level: 1, title: 'Soul Reaping & Skeletal Warrior', description: 'Basic soul harvesting and undead minion.', type: 'ABILITY' },
      { level: 30, title: 'Vengeful Ghost Spectre', description: 'Summon haunting spectre that casts freezing spirit bolts.', type: 'ABILITY' },
      { level: 60, title: 'Living Death Surge', description: 'Enter shadow form: critical hits deal 2.0x and heal you.', type: 'ABILITY' },
      { level: 85, title: 'Undead Behemoth Thrall', description: 'Colossal skeletal giant that cleaves multiple enemies.', type: 'ABILITY' },
      { level: 99, title: 'Lord of the Undying', description: 'Passive: Defeated non-boss foes rise as temporary thralls for 15s.', type: 'PASSIVE' },
    ],
    battlepassTiers: [
      { tier: 1, level: 10, rewardName: 'Title: Soul Reaver', rewardType: 'TITLE', description: 'Unlocks the [Soul Reaver] title.', iconName: 'Award', rarity: 'COMMON' },
      { tier: 2, level: 50, rewardName: 'Aura: Shadow Mist', rewardType: 'AURA', description: 'Swirling dark purple vapor and spectral skulls.', iconName: 'Skull', rarity: 'RARE' },
      { tier: 3, level: 99, rewardName: 'Mastery Cape: Cape of Necromancy', rewardType: 'CAPE', description: 'Tattered shadow-black cape with glowing purple skull brooch.', iconName: 'Crown', rarity: 'MYTHIC' },
    ],
  },
};

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
