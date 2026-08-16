/**
 * Saints Gaming — Companion Party & Progression Manager (Bible 11 & Bible 07)
 * Manages player party slots (active buddy + 5 reserves), XP progression, level-ups, and stat curves.
 */

import { ElementType } from '../elementMatchups';
import { BattleMove } from './buddyBattleEngine';

export interface CompanionInstance {
  id: string;
  speciesSlug: string;
  nickname?: string;
  level: number;
  currentXp: number;
  element: ElementType;
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  speed: number;
  moves: BattleMove[];
  isShiny?: boolean;
  friendship?: number; // 0 to 255
}

export interface PlayerParty {
  slots: Array<CompanionInstance | null>; // Exactly 6 slots (index 0 is active lead companion)
}

/**
 * Calculates total XP required to reach a specific level (Medium-Fast curve).
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor((4 * Math.pow(level, 3)) / 5);
}

/**
 * Creates a blank party with 6 empty slots.
 */
export function createEmptyParty(): PlayerParty {
  return {
    slots: [null, null, null, null, null, null],
  };
}

/**
 * Adds a companion to the party. Returns true if added, false if party is full (6/6).
 */
export function addCompanionToParty(party: PlayerParty, companion: CompanionInstance): boolean {
  const openIndex = party.slots.findIndex((s) => s === null);
  if (openIndex === -1) return false; // Party is full

  party.slots[openIndex] = companion;
  return true;
}

/**
 * Sets the active lead companion by swapping slot at `index` to slot 0.
 */
export function setActiveCompanion(party: PlayerParty, index: number): boolean {
  if (index < 0 || index >= party.slots.length) return false;
  if (!party.slots[index]) return false;

  if (index === 0) return true; // Already active lead

  const target = party.slots[index];
  party.slots[index] = party.slots[0];
  party.slots[0] = target;
  return true;
}

/**
 * Reorders two slots in the player's party.
 */
export function swapPartySlots(party: PlayerParty, indexA: number, indexB: number): boolean {
  if (
    indexA < 0 ||
    indexA >= party.slots.length ||
    indexB < 0 ||
    indexB >= party.slots.length
  ) {
    return false;
  }

  const temp = party.slots[indexA];
  party.slots[indexA] = party.slots[indexB];
  party.slots[indexB] = temp;
  return true;
}

export interface XpAwardResult {
  leveledUp: boolean;
  levelsGained: number;
  newLevel: number;
  newXp: number;
  statGains: { hp: number; attack: number; defense: number; speed: number };
}

/**
 * Awards XP to a companion and processes level-up stat increases.
 */
export function awardCompanionXp(companion: CompanionInstance, xpAmount: number): XpAwardResult {
  let newXp = companion.currentXp + Math.max(0, xpAmount);
  let currentLevel = companion.level;
  let levelsGained = 0;

  const initialStats = {
    hp: companion.maxHp,
    attack: companion.attack,
    defense: companion.defense,
    speed: companion.speed,
  };

  // Check multiple level threshold crossings
  while (currentLevel < 100 && newXp >= getXpForLevel(currentLevel + 1)) {
    currentLevel += 1;
    levelsGained += 1;

    // Stat Growth per level (+3 HP, +2 Atk, +2 Def, +1.5 Spd)
    companion.maxHp += 3;
    companion.currentHp += 3; // Heal gained HP
    companion.attack += 2;
    companion.defense += 2;
    companion.speed = Math.round(companion.speed + 1.5);
  }

  companion.level = currentLevel;
  companion.currentXp = newXp;

  return {
    leveledUp: levelsGained > 0,
    levelsGained,
    newLevel: currentLevel,
    newXp,
    statGains: {
      hp: companion.maxHp - initialStats.hp,
      attack: companion.attack - initialStats.attack,
      defense: companion.defense - initialStats.defense,
      speed: companion.speed - initialStats.speed,
    },
  };
}
