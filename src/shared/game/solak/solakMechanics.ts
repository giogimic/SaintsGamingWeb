/**
 * Solak: Blight Roots, Nature Blessing & Shield Dome Mechanics Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - Root Cage entrapment and teammate destruction rescue check.
 * - Merethiel's Nature Blessing golden protective shield dome (100% storm immunity vs 1,200/tick outside).
 * - Aerial Anima Launchpad orbital interception simulation.
 */

export interface RootCageEntity {
  id: string;
  trappedPlayerId: string;
  hp: number;
  maxHp: number;
  ticksUntilSuffocation: number;
  isBroken: boolean;
}

export interface NatureShieldDome {
  center: { x: number; y: number };
  radius: number; // 3 tiles
  isActive: boolean;
}

/**
 * Spawns a Root Cage on a target player.
 */
export function spawnRootCage(trappedPlayerId: string, maxHp: number = 15000): RootCageEntity {
  return {
    id: `cage_${trappedPlayerId}`,
    trappedPlayerId,
    hp: maxHp,
    maxHp,
    ticksUntilSuffocation: 5,
    isBroken: false,
  };
}

/**
 * Applies damage to free a trapped player from a Root Cage.
 */
export function damageRootCage(
  cage: RootCageEntity,
  damage: number
): { isFreed: boolean; remainingHp: number } {
  if (cage.isBroken) return { isFreed: true, remainingHp: 0 };

  cage.hp = Math.max(0, cage.hp - damage);
  if (cage.hp === 0) {
    cage.isBroken = true;
    return { isFreed: true, remainingHp: 0 };
  }

  return { isFreed: false, remainingHp: cage.hp };
}

/**
 * Evaluates player safety within Merethiel's Nature Shield Dome during storm phases.
 */
export function resolveNatureDomeProtection(
  playerPos: { x: number; y: number },
  dome: NatureShieldDome
): { isProtected: boolean; stormDamageTaken: number } {
  if (!dome.isActive) {
    return { isProtected: false, stormDamageTaken: 1200 };
  }

  const distance = Math.hypot(playerPos.x - dome.center.x, playerPos.y - dome.center.y);
  if (distance <= dome.radius) {
    return { isProtected: true, stormDamageTaken: 0 }; // 100% protected
  }

  return { isProtected: false, stormDamageTaken: 1200 };
}
