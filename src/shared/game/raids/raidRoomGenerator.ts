/**
 * Raid Chamber Room Generator & Party Scaling Matrix Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Procedural raid dungeon layout generation across 3 floor tiers (Combat, Puzzle, Scavenge, Boss).
 * - Party size and average combat level scaling formulas for monster HP, defence, and max hit.
 * - Challenge Mode (CM) modifiers with time limits and enhanced point yields.
 * - Room progression, obstacle clearance, and party contribution point distribution.
 */

export type RaidRoomType = 'COMBAT' | 'PUZZLE' | 'SCAVENGE' | 'BOSS';

export type CombatBossId =
  | 'magma_golem'
  | 'crystal_wraith'
  | 'vanguard'
  | 'muttadiles'
  | 'hive_queen'
  | 'skeletal_mystics';

export type PuzzleRoomId =
  | 'ice_demon'
  | 'thieving_chests'
  | 'energy_crabs'
  | 'tightrope'
  | 'guardians';

export type ScavengeRoomId =
  | 'herblore_farming'
  | 'fishing_cooking'
  | 'gourd_cauldron';

export interface RaidRoomDef {
  roomId: string;
  name: string;
  type: RaidRoomType;
  encounterId: CombatBossId | PuzzleRoomId | ScavengeRoomId | 'great_olm';
  floorIndex: number;
  basePoints: number;
  isCleared: boolean;
  clearTimeSeconds: number;
}

export interface RaidPartyMember {
  id: string;
  name: string;
  combatLevel: number;
  points: number;
  deaths: number;
}

export interface RaidPartyState {
  raidId: string;
  seed: number;
  isChallengeMode: boolean;
  members: RaidPartyMember[];
  rooms: RaidRoomDef[];
  currentRoomIndex: number;
  startTime: number;
  isCompleted: boolean;
}

export interface ScaledMonsterStats {
  hp: number;
  defence: number;
  attack: number;
  strength: number;
  magic: number;
  ranged: number;
  maxHit: number;
  pointsReward: number;
}

export const COMBAT_ENCOUNTERS: Record<CombatBossId, { name: string; baseHp: number; baseDef: number; baseMaxHit: number; basePoints: number }> = {
  magma_golem: { name: 'Magma Golem the Smith', baseHp: 300, baseDef: 205, baseMaxHit: 42, basePoints: 4500 },
  crystal_wraith: { name: 'Crystal Wraith', baseHp: 320, baseDef: 175, baseMaxHit: 38, basePoints: 4200 },
  vanguard: { name: 'The Triad Sentinels', baseHp: 280, baseDef: 160, baseMaxHit: 32, basePoints: 4800 },
  muttadiles: { name: 'Muttadiles & Meat Tree', baseHp: 350, baseDef: 138, baseMaxHit: 36, basePoints: 3900 },
  hive_queen: { name: 'Hive Queen & Abyssal Portal', baseHp: 250, baseDef: 140, baseMaxHit: 45, basePoints: 4600 },
  skeletal_mystics: { name: 'Skeletal Mystics Trio', baseHp: 310, baseDef: 185, baseMaxHit: 30, basePoints: 4100 },
};

export const PUZZLE_ENCOUNTERS: Record<PuzzleRoomId, { name: string; basePoints: number }> = {
  ice_demon: { name: 'Ice Demon & Kindling Pyres', basePoints: 3200 },
  thieving_chests: { name: 'Grubs in the Chests', basePoints: 2800 },
  energy_crabs: { name: 'Energy Focus Crabs', basePoints: 2900 },
  tightrope: { name: 'Tightrope & Death Keepers', basePoints: 3000 },
  guardians: { name: 'Stone Guardians Rockmining', basePoints: 3100 },
};

export const SCAVENGE_ENCOUNTERS: Record<ScavengeRoomId, { name: string; basePoints: number }> = {
  herblore_farming: { name: 'Buchu & Golpar Herb Patch', basePoints: 500 },
  fishing_cooking: { name: 'Psychoactive Eels & Fire Pit', basePoints: 500 },
  gourd_cauldron: { name: 'Gourd Tree & Potion Cauldron', basePoints: 500 },
};

/**
 * Calculates scaled monster statistics based on party size, average combat level, and Challenge Mode.
 *
 * Scaling Rules (Chambers of Xeric):
 * - HP Multiplier: 1 + (PartySize - 1) * 0.75 (CM adds +50% on top)
 * - Defence Multiplier: 1 + (PartySize - 1) * 0.05 (CM adds +20%)
 * - Damage Multiplier: clamp(1.0 + (AvgCombat - 100) * 0.005, 0.8, 1.3)
 */
export function calculateRaidMonsterScaling(
  baseHp: number,
  baseDef: number,
  baseMaxHit: number,
  partySize: number,
  averageCombatLevel: number,
  isChallengeMode: boolean = false
): ScaledMonsterStats {
  const safePartySize = Math.max(1, partySize);
  let hpMulti = 1 + (safePartySize - 1) * 0.75;
  let defMulti = 1 + (safePartySize - 1) * 0.05;
  let maxHitMulti = Math.min(1.3, Math.max(0.8, 1.0 + (averageCombatLevel - 100) * 0.005));

  if (isChallengeMode) {
    hpMulti *= 1.5;
    defMulti *= 1.2;
    maxHitMulti *= 1.15;
  }

  const scaledHp = Math.round(baseHp * hpMulti);
  const scaledDef = Math.round(baseDef * defMulti);
  const scaledMaxHit = Math.round(baseMaxHit * maxHitMulti);
  const points = Math.round(scaledHp * 5.2);

  return {
    hp: scaledHp,
    defence: scaledDef,
    attack: Math.round(150 * defMulti),
    strength: Math.round(150 * maxHitMulti),
    magic: Math.round(150 * defMulti),
    ranged: Math.round(150 * defMulti),
    maxHit: scaledMaxHit,
    pointsReward: points,
  };
}

/**
 * Generates a full Chambers of Xeric raid dungeon layout.
 * Standard format:
 * - Floor 1: 2 Combat, 1 Puzzle, 1 Scavenge
 * - Floor 2: 1 Combat, 1 Puzzle, 1 Scavenge
 * - Floor 3: Boss Room (The Great Wyrm)
 */
export function generateRaidDungeon(
  raidId: string,
  members: RaidPartyMember[],
  seed: number = Math.floor(Math.random() * 100000),
  isChallengeMode: boolean = false
): RaidPartyState {
  const combatKeys = Object.keys(COMBAT_ENCOUNTERS) as CombatBossId[];
  const puzzleKeys = Object.keys(PUZZLE_ENCOUNTERS) as PuzzleRoomId[];
  const scavengeKeys = Object.keys(SCAVENGE_ENCOUNTERS) as ScavengeRoomId[];

  // Deterministic shuffle with seed
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  const shuffle = <T>(arr: T[], sOffset: number): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(seed + i + sOffset) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledCombat = shuffle(combatKeys, 1);
  const shuffledPuzzles = shuffle(puzzleKeys, 2);
  const shuffledScavenge = shuffle(scavengeKeys, 3);

  const rooms: RaidRoomDef[] = [
    // Floor 1
    {
      roomId: 'room_f1_1',
      name: COMBAT_ENCOUNTERS[shuffledCombat[0]].name,
      type: 'COMBAT',
      encounterId: shuffledCombat[0],
      floorIndex: 1,
      basePoints: COMBAT_ENCOUNTERS[shuffledCombat[0]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    {
      roomId: 'room_f1_2',
      name: PUZZLE_ENCOUNTERS[shuffledPuzzles[0]].name,
      type: 'PUZZLE',
      encounterId: shuffledPuzzles[0],
      floorIndex: 1,
      basePoints: PUZZLE_ENCOUNTERS[shuffledPuzzles[0]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    {
      roomId: 'room_f1_3',
      name: COMBAT_ENCOUNTERS[shuffledCombat[1]].name,
      type: 'COMBAT',
      encounterId: shuffledCombat[1],
      floorIndex: 1,
      basePoints: COMBAT_ENCOUNTERS[shuffledCombat[1]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    {
      roomId: 'room_f1_4',
      name: SCAVENGE_ENCOUNTERS[shuffledScavenge[0]].name,
      type: 'SCAVENGE',
      encounterId: shuffledScavenge[0],
      floorIndex: 1,
      basePoints: SCAVENGE_ENCOUNTERS[shuffledScavenge[0]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    // Floor 2
    {
      roomId: 'room_f2_1',
      name: PUZZLE_ENCOUNTERS[shuffledPuzzles[1]].name,
      type: 'PUZZLE',
      encounterId: shuffledPuzzles[1],
      floorIndex: 2,
      basePoints: PUZZLE_ENCOUNTERS[shuffledPuzzles[1]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    {
      roomId: 'room_f2_2',
      name: COMBAT_ENCOUNTERS[shuffledCombat[2]].name,
      type: 'COMBAT',
      encounterId: shuffledCombat[2],
      floorIndex: 2,
      basePoints: COMBAT_ENCOUNTERS[shuffledCombat[2]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    {
      roomId: 'room_f2_3',
      name: SCAVENGE_ENCOUNTERS[shuffledScavenge[1]].name,
      type: 'SCAVENGE',
      encounterId: shuffledScavenge[1],
      floorIndex: 2,
      basePoints: SCAVENGE_ENCOUNTERS[shuffledScavenge[1]].basePoints,
      isCleared: false,
      clearTimeSeconds: 0,
    },
    // Floor 3 (Final Boss)
    {
      roomId: 'room_f3_olm',
      name: 'The Great Wyrm Sanctuary',
      type: 'BOSS',
      encounterId: 'great_olm',
      floorIndex: 3,
      basePoints: 12000,
      isCleared: false,
      clearTimeSeconds: 0,
    },
  ];

  return {
    raidId,
    seed,
    isChallengeMode,
    members: members.map((m) => ({ ...m, points: 0, deaths: 0 })),
    rooms,
    currentRoomIndex: 0,
    startTime: Date.now(),
    isCompleted: false,
  };
}

/**
 * Clears the current room and distributes contribution points across active party members.
 */
export function clearCurrentRoom(
  raidState: RaidPartyState,
  timeTakenSeconds: number
): {
  success: boolean;
  clearedRoom: RaidRoomDef;
  pointsAwardedPerMember: number;
  isRaidFinished: boolean;
} {
  const room = raidState.rooms[raidState.currentRoomIndex];
  if (!room) {
    throw new Error('Invalid active room index in raid state');
  }

  room.isCleared = true;
  room.clearTimeSeconds = timeTakenSeconds;

  // CM gives +50% extra points per room
  const cmBonus = raidState.isChallengeMode ? 1.5 : 1.0;
  const totalRoomPoints = Math.round(room.basePoints * cmBonus);
  const pointShare = Math.round(totalRoomPoints / Math.max(1, raidState.members.length));

  for (const member of raidState.members) {
    member.points += pointShare;
  }

  const seraphtIndex = raidState.currentRoomIndex + 1;
  const isFinished = seraphtIndex >= raidState.rooms.length;

  if (isFinished) {
    raidState.isCompleted = true;
  } else {
    raidState.currentRoomIndex = seraphtIndex;
  }

  return {
    success: true,
    clearedRoom: room,
    pointsAwardedPerMember: pointShare,
    isRaidFinished: isFinished,
  };
}
