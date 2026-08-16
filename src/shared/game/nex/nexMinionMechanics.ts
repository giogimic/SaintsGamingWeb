/**
 * Nex Minions, Blood Reaver Siphon & Zarosian Wrath Mechanics Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 4 Elemental Minions: Fumus (Smoke), Umbra (Shadow), Cruor (Blood), Glacies (Ice).
 * - Blood Reaver minion pathing, focus-fire interception, and Nex 250,000 HP absorption heal.
 * - Glacies Icicle stalagmite obstacles and freeze effects.
 * - Zarosian Wrath 5-tick death explosion: 100% lethal damage within 8 tiles.
 */

export interface ElementalMageDef {
  id: 'fumus' | 'umbra' | 'cruor' | 'glacies';
  name: string;
  quadrant: 'NORTH_EAST' | 'SOUTH_EAST' | 'SOUTH_WEST' | 'NORTH_WEST';
  hp: number;
  maxHp: number;
  isDead: boolean;
}

export interface BloodReaverEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
}

export interface ZarosianWrathExplosion {
  isChanneling: boolean;
  channelTicksRemaining: number;
  origin: { x: number; y: number };
  radius: number; // 8 tiles
}

export const ELEMENTAL_MAGES: Record<string, ElementalMageDef> = {
  fumus: { id: 'fumus', name: 'Fumus', quadrant: 'NORTH_EAST', hp: 350000, maxHp: 350000, isDead: false },
  umbra: { id: 'umbra', name: 'Umbra', quadrant: 'SOUTH_EAST', hp: 350000, maxHp: 350000, isDead: false },
  cruor: { id: 'cruor', name: 'Cruor', quadrant: 'SOUTH_WEST', hp: 350000, maxHp: 350000, isDead: false },
  glacies: { id: 'glacies', name: 'Glacies', quadrant: 'NORTH_WEST', hp: 350000, maxHp: 350000, isDead: false },
};

/**
 * Spawns a pair of Blood Reavers at the South-West blood altar.
 */
export function spawnBloodReavers(): BloodReaverEntity[] {
  return [
    { id: 'reaver_01', x: 5, y: 5, hp: 50000, maxHp: 50000, isDead: false },
    { id: 'reaver_02', x: 6, y: 4, hp: 50000, maxHp: 50000, isDead: false },
  ];
}

/**
 * Ticks Blood Reavers toward Nex (located at arena center).
 * If a Reaver reaches Nex (distance <= 1), Nex siphons it for a 250,000 HP heal.
 */
export function processBloodReaverMovement(
  reavers: BloodReaverEntity[],
  nexPos: { x: number; y: number }
): {
  activeReavers: BloodReaverEntity[];
  siphonedCount: number;
  nexTotalHeal: number;
} {
  let siphonedCount = 0;
  let nexTotalHeal = 0;
  const activeReavers: BloodReaverEntity[] = [];

  for (const r of reavers) {
    if (r.isDead) continue;

    // Move 1 tile toward Nex
    const dx = nexPos.x - r.x;
    const dy = nexPos.y - r.y;
    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    r.x += stepX;
    r.y += stepY;

    const remainingDist = Math.hypot(nexPos.x - r.x, nexPos.y - r.y);
    if (remainingDist <= 1) {
      // Siphoned by Nex
      siphonedCount++;
      nexTotalHeal += 250000;
      r.isDead = true;
    } else {
      activeReavers.push(r);
    }
  }

  return { activeReavers, siphonedCount, nexTotalHeal };
}

/**
 * Applies damage to a Blood Reaver minion.
 */
export function damageBloodReaver(
  reaver: BloodReaverEntity,
  damage: number
): { isKilled: boolean; remainingHp: number } {
  if (reaver.isDead) return { isKilled: true, remainingHp: 0 };

  reaver.hp = Math.max(0, reaver.hp - damage);
  if (reaver.hp === 0) {
    reaver.isDead = true;
    return { isKilled: true, remainingHp: 0 };
  }
  return { isKilled: false, remainingHp: reaver.hp };
}

/**
 * Resolves the Zarosian Wrath final death explosion.
 * Deals lethal 100% max HP damage to anyone within 8 tiles of Nex's corpse upon detonation.
 */
export function resolveZarosianWrath(
  playerPos: { x: number; y: number },
  playerMaxHp: number,
  wrath: ZarosianWrathExplosion
): { isHit: boolean; damageDealt: number } {
  const distance = Math.hypot(playerPos.x - wrath.origin.x, playerPos.y - wrath.origin.y);

  if (distance <= wrath.radius) {
    return { isHit: true, damageDealt: playerMaxHp }; // Lethal instant-wipe
  }

  return { isHit: false, damageDealt: 0 };
}
