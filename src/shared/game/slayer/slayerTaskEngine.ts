/**
 * Slayer Task Assignment & Task Extension Matrix Engine (Bible 09 & Bible 21).
 *
 * Implements:
 * - 6 Canonical Slayer Masters (Novice Broker, Apprentice Broker, Adept Broker, Expert Broker, Master Broker, Grandmaster Broker).
 * - Weighted monster task rolling based on combat level and slayer level prerequisites.
 * - Task extensions, streak counting, milestone point multipliers (10x, 50x, 100x, 250x, 1000x).
 * - Task kill progression and Slayer XP grant calculation.
 */

export type SlayerMasterId = 'novice_broker' | 'apprentice_broker' | 'adept_broker' | 'expert_broker' | 'master_broker' | 'grandmaster_broker';

export interface SlayerMonsterDef {
  id: string;
  name: string;
  slayerLevelReq: number;
  baseHp: number;
  category: string;
}

export interface SlayerMasterTaskEntry {
  monsterId: string;
  weight: number;
  minAmount: number;
  maxAmount: number;
  extendedMaxAmount?: number;
}

export interface SlayerMasterDef {
  id: SlayerMasterId;
  name: string;
  combatLevelReq: number;
  slayerLevelReq: number;
  basePoints: number;
  location: string;
  taskList: SlayerMasterTaskEntry[];
}

export interface ActiveSlayerTask {
  monsterId: string;
  monsterName: string;
  assignedBy: SlayerMasterId;
  initialAmount: number;
  remainingAmount: number;
  isExtended: boolean;
  slayerLevelReq: number;
  baseHp: number;
}

export interface SlayerPlayerProfile {
  combatLevel: number;
  slayerLevel: number;
  activeTask: ActiveSlayerTask | null;
  completedTasksStreak: number;
  slayerPoints: number;
  blockedMonsters: string[];
  extendedMonsters: string[];
}

export const SLAYER_MONSTER_CATALOG: Record<string, SlayerMonsterDef> = {
  crawling_hand: { id: 'crawling_hand', name: 'Crawling Hand', slayerLevelReq: 5, baseHp: 16, category: 'hands' },
  cave_bug: { id: 'cave_bug', name: 'Cave Bug', slayerLevelReq: 7, baseHp: 18, category: 'bugs' },
  cave_crawler: { id: 'cave_crawler', name: 'Cave Crawler', slayerLevelReq: 10, baseHp: 24, category: 'crawlers' },
  banshee: { id: 'banshee', name: 'Banshee', slayerLevelReq: 15, baseHp: 22, category: 'banshees' },
  rockslug: { id: 'rockslug', name: 'Rockslug', slayerLevelReq: 20, baseHp: 27, category: 'slugs' },
  basilisk: { id: 'basilisk', name: 'Basilisk', slayerLevelReq: 40, baseHp: 75, category: 'basilisks' },
  gore_hound: { id: 'gore_hound', name: 'Gore Hound', slayerLevelReq: 50, baseHp: 120, category: 'gore_hounds' },
  infernal_mage: { id: 'infernal_mage', name: 'Infernal Mage', slayerLevelReq: 45, baseHp: 60, category: 'mages' },
  aberrant_spectre: { id: 'aberrant_spectre', name: 'Aberrant Spectre', slayerLevelReq: 60, baseHp: 90, category: 'spectres' },
  sand_wraith: { id: 'sand_wraith', name: 'Sand Wraith', slayerLevelReq: 65, baseHp: 105, category: 'devils' },
  armored_beast: { id: 'armored_beast', name: 'Armored Beast', slayerLevelReq: 70, baseHp: 97, category: 'armored_beasts' },
  stone_golem: { id: 'stone_golem', name: 'Stone Golem', slayerLevelReq: 75, baseHp: 105, category: 'stone_golems' },
  shadow_fiend: { id: 'shadow_fiend', name: 'Shadow Fiend', slayerLevelReq: 80, baseHp: 105, category: 'shadow_fiend' },
  void_fiend: { id: 'void_fiend', name: 'Void Fiend', slayerLevelReq: 85, baseHp: 150, category: 'demons' },
  nightmare_stalker: { id: 'nightmare_stalker', name: 'Nightmare Stalker', slayerLevelReq: 90, baseHp: 220, category: 'beasts' },
  smoke_devil: { id: 'smoke_devil', name: 'Smoke Devil', slayerLevelReq: 93, baseHp: 185, category: 'devils' },
  elemental_drake: { id: 'elemental_drake', name: 'Elemental Drake', slayerLevelReq: 95, baseHp: 300, category: 'hydras' },
};

export const SLAYER_MASTERS: Record<SlayerMasterId, SlayerMasterDef> = {
  novice_broker: {
    id: 'novice_broker',
    name: 'Novice Broker',
    combatLevelReq: 1,
    slayerLevelReq: 1,
    basePoints: 0,
    location: 'Sanctuary Outskirts',
    taskList: [
      { monsterId: 'crawling_hand', weight: 10, minAmount: 15, maxAmount: 30 },
      { monsterId: 'cave_bug', weight: 8, minAmount: 10, maxAmount: 25 },
      { monsterId: 'cave_crawler', weight: 8, minAmount: 15, maxAmount: 30 },
      { monsterId: 'banshee', weight: 6, minAmount: 15, maxAmount: 25 },
      { monsterId: 'rockslug', weight: 6, minAmount: 15, maxAmount: 25 },
    ],
  },
  apprentice_broker: {
    id: 'apprentice_broker',
    name: 'Apprentice Broker',
    combatLevelReq: 20,
    slayerLevelReq: 1,
    basePoints: 2,
    location: 'The Gloomwoods',
    taskList: [
      { monsterId: 'cave_crawler', weight: 8, minAmount: 30, maxAmount: 60 },
      { monsterId: 'banshee', weight: 8, minAmount: 35, maxAmount: 70 },
      { monsterId: 'rockslug', weight: 8, minAmount: 30, maxAmount: 60 },
      { monsterId: 'basilisk', weight: 6, minAmount: 40, maxAmount: 80, extendedMaxAmount: 130 },
      { monsterId: 'infernal_mage', weight: 6, minAmount: 30, maxAmount: 60 },
    ],
  },
  adept_broker: {
    id: 'adept_broker',
    name: 'Adept Broker',
    combatLevelReq: 40,
    slayerLevelReq: 1,
    basePoints: 4,
    location: 'The Undercity',
    taskList: [
      { monsterId: 'basilisk', weight: 8, minAmount: 60, maxAmount: 120, extendedMaxAmount: 180 },
      { monsterId: 'gore_hound', weight: 8, minAmount: 70, maxAmount: 140, extendedMaxAmount: 220 },
      { monsterId: 'infernal_mage', weight: 7, minAmount: 50, maxAmount: 100 },
      { monsterId: 'aberrant_spectre', weight: 7, minAmount: 60, maxAmount: 120, extendedMaxAmount: 200 },
      { monsterId: 'sand_wraith', weight: 6, minAmount: 60, maxAmount: 110, extendedMaxAmount: 190 },
    ],
  },
  expert_broker: {
    id: 'expert_broker',
    name: 'Expert Broker',
    combatLevelReq: 70,
    slayerLevelReq: 1,
    basePoints: 10,
    location: 'Fey Realm',
    taskList: [
      { monsterId: 'gore_hound', weight: 9, minAmount: 110, maxAmount: 170, extendedMaxAmount: 250 },
      { monsterId: 'aberrant_spectre', weight: 8, minAmount: 110, maxAmount: 170, extendedMaxAmount: 240 },
      { monsterId: 'sand_wraith', weight: 8, minAmount: 120, maxAmount: 180, extendedMaxAmount: 250 },
      { monsterId: 'armored_beast', weight: 7, minAmount: 120, maxAmount: 190, extendedMaxAmount: 250 },
      { monsterId: 'stone_golem', weight: 7, minAmount: 130, maxAmount: 190, extendedMaxAmount: 250 },
    ],
  },
  master_broker: {
    id: 'master_broker',
    name: 'Master Broker',
    combatLevelReq: 85,
    slayerLevelReq: 1,
    basePoints: 12,
    location: 'The World Tree',
    taskList: [
      { monsterId: 'gore_hound', weight: 9, minAmount: 140, maxAmount: 195, extendedMaxAmount: 250 },
      { monsterId: 'sand_wraith', weight: 9, minAmount: 130, maxAmount: 200, extendedMaxAmount: 250 },
      { monsterId: 'stone_golem', weight: 8, minAmount: 130, maxAmount: 210, extendedMaxAmount: 250 },
      { monsterId: 'shadow_fiend', weight: 8, minAmount: 110, maxAmount: 170, extendedMaxAmount: 230 },
      { monsterId: 'void_fiend', weight: 8, minAmount: 130, maxAmount: 220, extendedMaxAmount: 250 },
      { monsterId: 'nightmare_stalker', weight: 5, minAmount: 10, maxAmount: 20, extendedMaxAmount: 140 },
    ],
  },
  grandmaster_broker: {
    id: 'grandmaster_broker',
    name: 'Grandmaster Broker',
    combatLevelReq: 100,
    slayerLevelReq: 50,
    basePoints: 15,
    location: 'Jungle Outpost',
    taskList: [
      { monsterId: 'void_fiend', weight: 9, minAmount: 130, maxAmount: 230, extendedMaxAmount: 250 },
      { monsterId: 'shadow_fiend', weight: 8, minAmount: 130, maxAmount: 190, extendedMaxAmount: 250 },
      { monsterId: 'stone_golem', weight: 8, minAmount: 130, maxAmount: 220, extendedMaxAmount: 250 },
      { monsterId: 'nightmare_stalker', weight: 7, minAmount: 10, maxAmount: 25, extendedMaxAmount: 150 },
      { monsterId: 'smoke_devil', weight: 6, minAmount: 130, maxAmount: 185, extendedMaxAmount: 220 },
      { monsterId: 'elemental_drake', weight: 5, minAmount: 120, maxAmount: 180, extendedMaxAmount: 230 },
    ],
  },
};

/**
 * Calculates milestone slayer point rewards based on task streak.
 */
export function calculateSlayerPoints(masterId: SlayerMasterId, streak: number): number {
  const master = SLAYER_MASTERS[masterId];
  if (!master || master.basePoints === 0) return 0;

  // Streak milestones (Standard tiered progression):
  // 10th task = 5x
  // 50th task = 15x
  // 100th task = 25x
  // 250th task = 35x
  // 1000th task = 50x
  let multiplier = 1;
  if (streak > 0) {
    if (streak % 1000 === 0) multiplier = 50;
    else if (streak % 250 === 0) multiplier = 35;
    else if (streak % 100 === 0) multiplier = 25;
    else if (streak % 50 === 0) multiplier = 15;
    else if (streak % 10 === 0) multiplier = 5;
  }

  return master.basePoints * multiplier;
}

/**
 * Checks if a player meets the master's requirements.
 */
export function canAssignFromMaster(
  masterId: SlayerMasterId,
  playerCombat: number,
  playerSlayer: number
): { eligible: boolean; reason?: string } {
  const master = SLAYER_MASTERS[masterId];
  if (!master) return { eligible: false, reason: 'Invalid Slayer Master' };

  if (playerCombat < master.combatLevelReq) {
    return {
      eligible: false,
      reason: `Requires Combat Level ${master.combatLevelReq} (Current: ${playerCombat})`,
    };
  }

  if (playerSlayer < master.slayerLevelReq) {
    return {
      eligible: false,
      reason: `Requires Slayer Level ${master.slayerLevelReq} (Current: ${playerSlayer})`,
    };
  }

  return { eligible: true };
}

/**
 * Assigns a new Slayer task from the chosen master.
 */
export function assignSlayerTask(
  masterId: SlayerMasterId,
  profile: SlayerPlayerProfile,
  rngSeed: number = Math.random()
): { ok: boolean; task?: ActiveSlayerTask; error?: string } {
  const eligibility = canAssignFromMaster(masterId, profile.combatLevel, profile.slayerLevel);
  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason };
  }

  const master = SLAYER_MASTERS[masterId];
  const blockedSet = new Set(profile.blockedMonsters);
  const extendedSet = new Set(profile.extendedMonsters);

  // Filter tasks that the player has the Slayer level for and isn't blocked
  const eligibleTasks = master.taskList.filter((entry) => {
    if (blockedSet.has(entry.monsterId)) return false;
    const monster = SLAYER_MONSTER_CATALOG[entry.monsterId];
    if (!monster) return false;
    return profile.slayerLevel >= monster.slayerLevelReq;
  });

  if (eligibleTasks.length === 0) {
    return { ok: false, error: 'No eligible tasks available from this master for your Slayer level' };
  }

  // Weighted random pick
  const totalWeight = eligibleTasks.reduce((acc, t) => acc + t.weight, 0);
  let roll = rngSeed * totalWeight;
  let chosenEntry = eligibleTasks[0];

  for (const entry of eligibleTasks) {
    roll -= entry.weight;
    if (roll <= 0) {
      chosenEntry = entry;
      break;
    }
  }

  const monsterDef = SLAYER_MONSTER_CATALOG[chosenEntry.monsterId];
  const isExtended = extendedSet.has(chosenEntry.monsterId) && !!chosenEntry.extendedMaxAmount;
  const maxRoll = isExtended ? (chosenEntry.extendedMaxAmount || chosenEntry.maxAmount) : chosenEntry.maxAmount;
  const minRoll = chosenEntry.minAmount;

  // Amount generation
  const amount = Math.floor(minRoll + Math.random() * (maxRoll - minRoll + 1));

  const newTask: ActiveSlayerTask = {
    monsterId: chosenEntry.monsterId,
    monsterName: monsterDef.name,
    assignedBy: masterId,
    initialAmount: amount,
    remainingAmount: amount,
    isExtended,
    slayerLevelReq: monsterDef.slayerLevelReq,
    baseHp: monsterDef.baseHp,
  };

  return { ok: true, task: newTask };
}

/**
 * Records a monster kill toward the active Slayer task.
 */
export function recordSlayerKill(
  profile: SlayerPlayerProfile,
  slainMonsterId: string,
  customHp?: number
): {
  validKill: boolean;
  taskCompleted: boolean;
  xpGranted: number;
  pointsEarned: number;
  remainingAmount: number;
  newStreak: number;
} {
  const task = profile.activeTask;
  if (!task) {
    return { validKill: false, taskCompleted: false, xpGranted: 0, pointsEarned: 0, remainingAmount: 0, newStreak: profile.completedTasksStreak };
  }

  if (task.monsterId !== slainMonsterId) {
    return { validKill: false, taskCompleted: false, xpGranted: 0, pointsEarned: 0, remainingAmount: task.remainingAmount, newStreak: profile.completedTasksStreak };
  }

  const monsterDef = SLAYER_MONSTER_CATALOG[slainMonsterId];
  const xp = customHp || (monsterDef ? monsterDef.baseHp : 50);

  const remaining = Math.max(0, task.remainingAmount - 1);
  task.remainingAmount = remaining;

  if (remaining === 0) {
    const nextStreak = profile.completedTasksStreak + 1;
    const points = calculateSlayerPoints(task.assignedBy, nextStreak);
    profile.activeTask = null;
    profile.completedTasksStreak = nextStreak;
    profile.slayerPoints += points;

    return {
      validKill: true,
      taskCompleted: true,
      xpGranted: xp,
      pointsEarned: points,
      remainingAmount: 0,
      newStreak: nextStreak,
    };
  }

  return {
    validKill: true,
    taskCompleted: false,
    xpGranted: xp,
    pointsEarned: 0,
    remainingAmount: remaining,
    newStreak: profile.completedTasksStreak,
  };
}

/**
 * Resets the current task using Novice Broker (resets streak to 0).
 */
export function resetTaskWithNoviceBroker(profile: SlayerPlayerProfile): {
  ok: boolean;
  newStreak: number;
  message: string;
} {
  if (!profile.activeTask) {
    return { ok: false, newStreak: profile.completedTasksStreak, message: 'No active task to reset.' };
  }

  if (profile.activeTask.assignedBy === 'novice_broker') {
    return { ok: false, newStreak: profile.completedTasksStreak, message: 'Novice Broker cannot reset his own assignments.' };
  }

  profile.activeTask = null;
  profile.completedTasksStreak = 0;

  return {
    ok: true,
    newStreak: 0,
    message: 'Your task was reset by Novice Broker. Your completion streak has been reset to 0.',
  };
}
