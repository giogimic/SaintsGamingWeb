/**
 * Saints Gaming — Canonical Ability Registry & Domain Engine (Bible 25 §3.1)
 * Unifies Real-Time MMO combat abilities and Turn-Based creature abilities under a shared schema.
 */

import { COMBAT_HIT_BASE_XP, COMBAT_UTILITY_XP } from '../combatSkillXp';

export type AbilityDomain = 'player_rt' | 'creature_tb' | 'both';

export type AbilityTarget = 'self' | 'enemy' | 'ally' | 'aoe_enemies' | 'aoe_allies' | 'tile';

export type AbilityStyle = 'MELEE' | 'MAGIC' | 'RANGED' | 'SUPPORT' | 'TECH';

export type AbilityEffect =
  | { type: 'damage'; power: number; style: 'physical' | 'ability' | 'true'; variance?: number }
  | { type: 'heal'; power: number }
  | { type: 'apply_status'; statusId: string; chance: number; turns?: number }
  | { type: 'strip_status'; statusId?: string }
  | { type: 'capture' }
  | { type: 'modify_stat'; stat: string; delta: number; turns: number }
  | { type: 'custom'; id: string; params?: Record<string, unknown> };

export interface AbilityDef {
  id: string;
  name: string;
  description?: string;
  domain: AbilityDomain;
  style: AbilityStyle;
  target: AbilityTarget;
  rangeTiles?: number;
  cooldownMs?: number;
  cooldownTurns?: number;
  accuracy?: number; // 0-100 percentage
  manaCost?: number;
  staminaCost?: number;
  effects: AbilityEffect[];
  grantsSkillXp?: Array<{ skillSlug: string; amount: number }>;
  isCapture: boolean;
  icon?: string;
  animationId?: string;
  tags: string[];
  isActive: boolean;
}

export const CANONICAL_ABILITIES: Record<string, AbilityDef> = {
  strike: {
    id: 'strike',
    name: 'Strike',
    description: 'A swift basic melee strike with high accuracy.',
    domain: 'both',
    style: 'MELEE',
    target: 'enemy',
    rangeTiles: 1,
    cooldownMs: 1500,
    cooldownTurns: 0,
    accuracy: 95,
    staminaCost: 10,
    effects: [{ type: 'damage', power: 40, style: 'physical' }],
    grantsSkillXp: [
      { skillSlug: 'attack', amount: COMBAT_HIT_BASE_XP },
      { skillSlug: 'strength', amount: Math.floor(COMBAT_HIT_BASE_XP * 0.6) },
    ],
    isCapture: false,
    icon: 'Sword',
    tags: ['basic', 'physical', 'melee'],
    isActive: true,
  },
  cleave: {
    id: 'cleave',
    name: 'Cleave',
    description: 'A wide-sweeping slash that deals heavy physical damage.',
    domain: 'both',
    style: 'MELEE',
    target: 'enemy',
    rangeTiles: 1,
    cooldownMs: 4000,
    cooldownTurns: 2,
    accuracy: 90,
    staminaCost: 25,
    effects: [{ type: 'damage', power: 55, style: 'physical' }],
    grantsSkillXp: [
      { skillSlug: 'attack', amount: COMBAT_HIT_BASE_XP },
      { skillSlug: 'strength', amount: COMBAT_HIT_BASE_XP },
    ],
    isCapture: false,
    icon: 'Axe',
    tags: ['heavy', 'physical', 'slash'],
    isActive: true,
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Launches a searing Solar fireball that scorches the enemy target.',
    domain: 'both',
    style: 'MAGIC',
    target: 'enemy',
    rangeTiles: 6,
    cooldownMs: 2000,
    cooldownTurns: 1,
    accuracy: 90,
    manaCost: 20,
    effects: [
      { type: 'damage', power: 50, style: 'ability' },
      { type: 'apply_status', statusId: 'burn', chance: 0.3, turns: 3 },
    ],
    grantsSkillXp: [
      { skillSlug: 'intelligence', amount: COMBAT_HIT_BASE_XP },
      { skillSlug: 'wisdom', amount: Math.floor(COMBAT_HIT_BASE_XP * 0.4) },
    ],
    isCapture: false,
    icon: 'Flame',
    tags: ['spell', 'fire', 'solar'],
    isActive: true,
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Frost Nova',
    description: 'Emits a freezing Cryo wave that chills and slows enemies.',
    domain: 'both',
    style: 'MAGIC',
    target: 'aoe_enemies',
    rangeTiles: 3,
    cooldownMs: 6000,
    cooldownTurns: 3,
    accuracy: 95,
    manaCost: 35,
    effects: [
      { type: 'damage', power: 45, style: 'ability' },
      { type: 'apply_status', statusId: 'frostbite', chance: 0.8, turns: 2 },
    ],
    grantsSkillXp: [
      { skillSlug: 'intelligence', amount: COMBAT_HIT_BASE_XP },
      { skillSlug: 'wisdom', amount: Math.floor(COMBAT_HIT_BASE_XP * 0.7) },
    ],
    isCapture: false,
    icon: 'Snowflake',
    tags: ['spell', 'ice', 'cryo', 'aoe'],
    isActive: true,
  },
  dash: {
    id: 'dash',
    name: 'Tactical Dash',
    description: 'Quickly roll or dash 3 tiles in target direction, evading attacks.',
    domain: 'player_rt',
    style: 'TECH',
    target: 'tile',
    rangeTiles: 3,
    cooldownMs: 8000,
    staminaCost: 20,
    effects: [],
    grantsSkillXp: [{ skillSlug: 'agility', amount: COMBAT_UTILITY_XP }],
    isCapture: false,
    icon: 'Wind',
    tags: ['mobility', 'agility'],
    isActive: true,
  },
  war_cry: {
    id: 'war_cry',
    name: 'War Cry',
    description: 'Empowers self and nearby allies with +20% physical attack power.',
    domain: 'both',
    style: 'SUPPORT',
    target: 'aoe_allies',
    rangeTiles: 0,
    cooldownMs: 12000,
    cooldownTurns: 4,
    staminaCost: 30,
    effects: [{ type: 'apply_status', statusId: 'might', chance: 1.0, turns: 3 }],
    grantsSkillXp: [{ skillSlug: 'strength', amount: COMBAT_UTILITY_XP }],
    isCapture: false,
    icon: 'Megaphone',
    tags: ['buff', 'support', 'shout'],
    isActive: true,
  },
  tuxemon_capture: {
    id: 'tuxemon_capture',
    name: 'Binding Crystal Capture',
    description: 'Attempt to bind a weakened creature in turn-based battle. Forbidden in RT combat.',
    domain: 'creature_tb',
    style: 'SUPPORT',
    target: 'enemy',
    cooldownTurns: 0,
    effects: [{ type: 'capture' }],
    isCapture: true,
    icon: 'Sparkles',
    tags: ['capture', 'tb_only'],
    isActive: true,
  },
};

export function getAbilityDef(id: string): AbilityDef | undefined {
  return CANONICAL_ABILITIES[id.toLowerCase()];
}

export function getAllAbilityDefs(): AbilityDef[] {
  return Object.values(CANONICAL_ABILITIES);
}

export function getAbilitiesByDomain(domain: AbilityDomain): AbilityDef[] {
  return Object.values(CANONICAL_ABILITIES).filter(
    (a) => a.domain === domain || a.domain === 'both'
  );
}
