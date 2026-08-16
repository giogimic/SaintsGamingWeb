/**
 * Saints Gaming — Wave-Based Monster Arena & Fight Cave Engine (Bible 24)
 * Manages monster wave spawners, arena perimeter coordinates, wave advancement, and token/cape rewards.
 */

export type AttackStyle = 'MELEE' | 'RANGED' | 'MAGIC';

export interface ArenaMonsterDefinition {
  id: string;
  name: string;
  combatLevel: number;
  maxHp: number;
  attackStyle: AttackStyle;
}

export const ARENA_MONSTERS: Record<string, ArenaMonsterDefinition> = {
  monster_tz_bat: {
    id: 'monster_tz_bat',
    name: 'Tz-Kek Bat',
    combatLevel: 22,
    maxHp: 20,
    attackStyle: 'MELEE',
  },
  monster_tz_bird: {
    id: 'monster_tz_bird',
    name: 'Tz-Kih Bird',
    combatLevel: 45,
    maxHp: 40,
    attackStyle: 'RANGED',
  },
  monster_tz_demon: {
    id: 'monster_tz_demon',
    name: 'Tz-Haar Champion',
    combatLevel: 90,
    maxHp: 120,
    attackStyle: 'MELEE',
  },
  monster_tz_shaman: {
    id: 'monster_tz_shaman',
    name: 'Tz-Haar Magus',
    combatLevel: 140,
    maxHp: 200,
    attackStyle: 'MAGIC',
  },
  monster_tz_boss_jad: {
    id: 'monster_tz_boss_jad',
    name: 'TzTok-Jad (Arena Overlord)',
    combatLevel: 702,
    maxHp: 500,
    attackStyle: 'MAGIC',
  },
};

export interface ActiveMonster {
  uid: string;
  monsterId: string;
  name: string;
  currentHp: number;
  maxHp: number;
  x: number;
  y: number;
}

export interface ArenaSession {
  id: string;
  playerId: string;
  currentWave: number;
  totalWaves: number;
  activeMonsters: ActiveMonster[];
  isCompleted: boolean;
  isDefeated: boolean;
  tokensEarned: number;
}

/**
 * Initializes a new arena session.
 */
export function createArenaSession(
  playerId: string,
  totalWaves: number = 5
): ArenaSession {
  return {
    id: `arena_${playerId}_${Date.now()}`,
    playerId,
    currentWave: 1,
    totalWaves,
    activeMonsters: [],
    isCompleted: false,
    isDefeated: false,
    tokensEarned: 0,
  };
}

/**
 * Spawns monsters for a given wave.
 */
export function spawnWave(
  session: ArenaSession,
  monstersToSpawn: Array<{ monsterId: string; count: number }>
): ActiveMonster[] {
  const spawned: ActiveMonster[] = [];
  const arenaRadius = 12;
  const centerX = 20;
  const centerY = 20;

  let spawnIndex = 0;
  const totalMonsters = monstersToSpawn.reduce((acc, m) => acc + m.count, 0);

  for (const item of monstersToSpawn) {
    const def = ARENA_MONSTERS[item.monsterId];
    if (!def) continue;

    for (let c = 0; c < item.count; c++) {
      const angle = (spawnIndex / Math.max(1, totalMonsters)) * Math.PI * 2;
      const x = Math.round(centerX + Math.cos(angle) * arenaRadius);
      const y = Math.round(centerY + Math.sin(angle) * arenaRadius);

      const monster: ActiveMonster = {
        uid: `m_${session.currentWave}_${spawnIndex}_${Date.now()}`,
        monsterId: def.id,
        name: def.name,
        currentHp: def.maxHp,
        maxHp: def.maxHp,
        x,
        y,
      };

      spawned.push(monster);
      spawnIndex++;
    }
  }

  session.activeMonsters = spawned;
  return spawned;
}

/**
 * Damages an active arena monster and evaluates wave/arena completion.
 */
export function damageArenaMonster(
  session: ArenaSession,
  monsterUid: string,
  damage: number
): {
  monsterKilled: boolean;
  waveCompleted: boolean;
  arenaCompleted: boolean;
  rewardItem?: string;
  tokensAwarded: number;
  remainingMonsters: number;
} {
  if (session.isCompleted || session.isDefeated) {
    return {
      monsterKilled: false,
      waveCompleted: false,
      arenaCompleted: false,
      tokensAwarded: 0,
      remainingMonsters: session.activeMonsters.length,
    };
  }

  const target = session.activeMonsters.find((m) => m.uid === monsterUid);
  if (!target) {
    return {
      monsterKilled: false,
      waveCompleted: false,
      arenaCompleted: false,
      tokensAwarded: 0,
      remainingMonsters: session.activeMonsters.length,
    };
  }

  target.currentHp = Math.max(0, target.currentHp - damage);
  const killed = target.currentHp === 0;

  if (killed) {
    session.activeMonsters = session.activeMonsters.filter((m) => m.uid !== monsterUid);
  }

  const remaining = session.activeMonsters.length;
  let waveCompleted = false;
  let arenaCompleted = false;
  let rewardItem: string | undefined = undefined;
  let tokensAwarded = 0;

  if (remaining === 0) {
    waveCompleted = true;
    tokensAwarded = session.currentWave * 100;
    session.tokensEarned += tokensAwarded;

    if (session.currentWave >= session.totalWaves) {
      session.isCompleted = true;
      arenaCompleted = true;
      rewardItem = 'item_fire_cape';
    } else {
      session.currentWave += 1;
    }
  }

  return {
    monsterKilled: killed,
    waveCompleted,
    arenaCompleted,
    rewardItem,
    tokensAwarded,
    remainingMonsters: remaining,
  };
}
