/**
 * Sol Heredit Boss Phase Engine & Sunbeam Mechanics (Bible 24 & Bible 27).
 *
 * Implements:
 * - 3-phase fight progression (Phase 1, Phase 2 Shield Parry, Phase 3 Sunbeam Enrage).
 * - Triple Laser lane sequencing (avoiding charged beam lanes).
 * - Sand Trap expanding shockwave eruptions.
 * - Shield Parry frontal deflection and flank vulnerability calculations.
 * - Sunbeam Barrage orbital dodging.
 */

export type SolPhase = 1 | 2 | 3;
export type LaserLane = 'LEFT' | 'CENTER' | 'RIGHT';

export interface SolHereditState {
  hp: number;
  maxHp: number;
  phase: SolPhase;
  facingDirection: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  isShieldRaised: boolean;
  activeLaserLanes: LaserLane[];
  sandTrapTiles: Array<{ x: number; y: number }>;
  isEnraged: boolean;
  isDead: boolean;
}

/**
 * Initializes Sol Heredit boss state.
 */
export function initializeSolHeredit(maxHp: number = 900): SolHereditState {
  return {
    hp: maxHp,
    maxHp,
    phase: 1,
    facingDirection: 'SOUTH',
    isShieldRaised: false,
    activeLaserLanes: [],
    sandTrapTiles: [],
    isEnraged: false,
    isDead: false,
  };
}

/**
 * Applies damage to Sol Heredit, checking shield deflection and phase transitions.
 */
export function applyDamageToSol(
  boss: SolHereditState,
  damage: number,
  playerRelativePosition: 'FRONT' | 'FLANK' | 'BEHIND'
): {
  damageDealt: number;
  reflectedDamage: number;
  phaseAdvanced: boolean;
  isDefeated: boolean;
} {
  if (boss.isDead) {
    return { damageDealt: 0, reflectedDamage: 0, phaseAdvanced: false, isDefeated: true };
  }

  // Shield Parry mechanic in Phase 2 & 3
  if (boss.isShieldRaised && playerRelativePosition === 'FRONT') {
    return { damageDealt: 0, reflectedDamage: 15, phaseAdvanced: false, isDefeated: false };
  }

  const effectiveDmg = Math.min(boss.hp, damage);
  boss.hp -= effectiveDmg;

  let phaseAdvanced = false;
  const hpPercent = (boss.hp / boss.maxHp) * 100;

  if (boss.hp === 0) {
    boss.isDead = true;
    return { damageDealt: effectiveDmg, reflectedDamage: 0, phaseAdvanced: false, isDefeated: true };
  }

  if (boss.phase === 1 && hpPercent <= 66) {
    boss.phase = 2;
    boss.isShieldRaised = true;
    phaseAdvanced = true;
  } else if (boss.phase === 2 && hpPercent <= 33) {
    boss.phase = 3;
    boss.isEnraged = true;
    phaseAdvanced = true;
  }

  return { damageDealt: effectiveDmg, reflectedDamage: 0, phaseAdvanced, isDefeated: false };
}

/**
 * Resolves Triple Laser lane damage.
 * Sol fires lasers at 2 of the 3 lanes, leaving 1 safe lane.
 */
export function resolveTripleLaser(
  playerLane: LaserLane,
  targetedLanes: LaserLane[]
): { hit: boolean; damage: number } {
  if (targetedLanes.includes(playerLane)) {
    const damage = Math.floor(40 + Math.random() * 25); // 40-65 damage
    return { hit: true, damage };
  }
  return { hit: false, damage: 0 };
}

/**
 * Resolves Sand Trap eruption collision.
 */
export function resolveSandTrapCollision(
  playerTile: { x: number; y: number },
  sandTraps: Array<{ x: number; y: number }>
): { hit: boolean; damage: number; knockbackTiles: number } {
  const isTrap = sandTraps.some((t) => t.x === playerTile.x && t.y === playerTile.y);
  if (isTrap) {
    return { hit: true, damage: 35, knockbackTiles: 2 };
  }
  return { hit: false, damage: 0, knockbackTiles: 0 };
}

/**
 * Evaluates player relative position to Sol based on coordinates.
 */
export function calculateRelativePosition(
  solPos: { x: number; y: number },
  solFacing: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST',
  playerPos: { x: number; y: number }
): 'FRONT' | 'FLANK' | 'BEHIND' {
  const dx = playerPos.x - solPos.x;
  const dy = playerPos.y - solPos.y;

  if (solFacing === 'SOUTH') {
    if (dy < 0) return 'FRONT';
    if (dy > 0) return 'BEHIND';
    return 'FLANK';
  } else if (solFacing === 'NORTH') {
    if (dy > 0) return 'FRONT';
    if (dy < 0) return 'BEHIND';
    return 'FLANK';
  } else if (solFacing === 'EAST') {
    if (dx > 0) return 'FRONT';
    if (dx < 0) return 'BEHIND';
    return 'FLANK';
  } else {
    // WEST
    if (dx < 0) return 'FRONT';
    if (dx > 0) return 'BEHIND';
    return 'FLANK';
  }
}
