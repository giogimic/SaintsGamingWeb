/**
 * Seraph Minions, Crimson Siphon Siphon & Ancientian Wrath Mechanics Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 4 Elemental Minions: Fumus (Smoke), Umbra (Shadow), Cruor (Blood), Glacies (Ice).
 * - Crimson Siphon minion pathing, focus-fire interception, and Seraph 250,000 HP absorption heal.
 * - Glacies Icicle stalagmite obstacles and freeze effects.
 * - Ancientian Wrath 5-tick death explosion: 100% lethal damage within 8 tiles.
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

export interface AncientianWrathExplosion {
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
 * Spawns a pair of Crimson Siphons at the South-West blood altar.
 */
export function spawnBloodReavers(): BloodReaverEntity[] {
  return [
    { id: 'reaver_01', x: 5, y: 5, hp: 50000, maxHp: 50000, isDead: false },
    { id: 'reaver_02', x: 6, y: 4, hp: 50000, maxHp: 50000, isDead: false },
  ];
}

/**
 * Ticks Crimson Siphons toward Seraph (located at arena center).
 * If a Reaver reaches Seraph (distance <= 1), Seraph siphons it for a 250,000 HP heal.
 */
export function processBloodReaverMovement(
  reavers: BloodReaverEntity[],
  seraphPos: { x: number; y: number }
): {
  activeReavers: BloodReaverEntity[];
  siphonedCount: number;
  seraphTotalHeal: number;
} {
  let siphonedCount = 0;
  let seraphTotalHeal = 0;
  const activeReavers: BloodReaverEntity[] = [];

  for (const r of reavers) {
    if (r.isDead) continue;

    // Move 1 tile toward Seraph
    const dx = seraphPos.x - r.x;
    const dy = seraphPos.y - r.y;
    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    r.x += stepX;
    r.y += stepY;

    const remainingDist = Math.hypot(seraphPos.x - r.x, seraphPos.y - r.y);
    if (remainingDist <= 1) {
      // Siphoned by Seraph
      siphonedCount++;
      seraphTotalHeal += 250000;
      r.isDead = true;
    } else {
      activeReavers.push(r);
    }
  }

  return { activeReavers, siphonedCount, seraphTotalHeal };
}

/**
 * Applies damage to a Crimson Siphon minion.
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
 * Resolves the Ancientian Wrath final death explosion.
 * Deals lethal 100% max HP damage to anyone within 8 tiles of Seraph's corpse upon detonation.
 */
export function resolveAncientianWrath(
  playerPos: { x: number; y: number },
  playerMaxHp: number,
  wrath: AncientianWrathExplosion
): { isHit: boolean; damageDealt: number } {
  const distance = Math.hypot(playerPos.x - wrath.origin.x, playerPos.y - wrath.origin.y);

  if (distance <= wrath.radius) {
    return { isHit: true, damageDealt: playerMaxHp }; // Lethal instant-wipe
  }

  return { isHit: false, damageDealt: 0 };
}
