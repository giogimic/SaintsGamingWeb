/**
 * Seraph: Angel of Death Quadrant Arena & Phase Rotation Engine (Bible 24 & Bible 27).
 *
 * Implements:
 * - 5-Phase combat progression: Smoke (100-80%), Shadow (80-60%), Blood (60-40%), Ice (40-20%), The Ancient Enrage (20-0%).
 * - Quadrant positioning matrix: North-East (Smoke), South-East (Shadow), South-West (Blood), North-West (Ice), Center (The Ancient).
 * - Phase mechanics:
 *   - Smoke Virus (choking stat drains in quadrant).
 *   - Shadow Traps (2-tick eruption dodging).
 *   - Blood Siphon (damage reversal heal) & Blood Sacrifice beacon (7-tile distance escape).
 *   - Ice Prison (entanglement & teammate breakout requirement).
 */

export type SeraphPhase = 'SMOKE' | 'SHADOW' | 'BLOOD' | 'ICE' | 'ZAROS_ENRAGE';
export type ArenaQuadrant = 'NORTH_EAST' | 'SOUTH_EAST' | 'SOUTH_WEST' | 'NORTH_WEST' | 'CENTER';

export interface SeraphBossState {
  phase: SeraphPhase;
  hp: number;
  maxHp: number;
  isSiphoningBlood: boolean;
  bloodSacrificeTargetId: string | null;
  activeIcePrison: {
    targetPlayerId: string;
    prisonHp: number;
    ticksRemaining: number;
  } | null;
  activeShadowTraps: Array<{ x: number; y: number; tickSpawned: number }>;
  isEnraged: boolean;
  isDead: boolean;
}

export interface PlayerSeraphPosition {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  prayerPoints: number;
}

/**
 * Initializes Seraph: Angel of Death state scaled to party size.
 */
export function initializeSeraphState(partySize: number = 7): SeraphBossState {
  const scaledHp = Math.round(3000000 * (1 + (Math.max(1, partySize) - 1) * 0.35));
  return {
    phase: 'SMOKE',
    hp: scaledHp,
    maxHp: scaledHp,
    isSiphoningBlood: false,
    bloodSacrificeTargetId: null,
    activeIcePrison: null,
    activeShadowTraps: [],
    isEnraged: false,
    isDead: false,
  };
}

/**
 * Applies damage to Seraph, checking Blood Siphon reversal and phase transitions.
 */
export function applyDamageToSeraph(
  boss: SeraphBossState,
  damage: number
): {
  effectiveDamage: number;
  healedAmount: number;
  phaseTransitioned: boolean;
  newPhase: SeraphPhase;
  isDefeated: boolean;
} {
  if (boss.isDead) {
    return { effectiveDamage: 0, healedAmount: 0, phaseTransitioned: false, newPhase: boss.phase, isDefeated: true };
  }

  // Blood Siphon: incoming attacks heal Seraph instead of damaging her
  if (boss.isSiphoningBlood) {
    const heal = damage;
    boss.hp = Math.min(boss.maxHp, boss.hp + heal);
    return { effectiveDamage: 0, healedAmount: heal, phaseTransitioned: false, newPhase: boss.phase, isDefeated: false };
  }

  const effectiveDamage = Math.min(boss.hp, damage);
  boss.hp -= effectiveDamage;

  if (boss.hp === 0) {
    boss.isDead = true;
    return { effectiveDamage, healedAmount: 0, phaseTransitioned: false, newPhase: boss.phase, isDefeated: true };
  }

  const hpPercent = (boss.hp / boss.maxHp) * 100;
  let phaseTransitioned = false;
  let seraphtPhase = boss.phase;

  if (boss.phase === 'SMOKE' && hpPercent <= 80) {
    seraphtPhase = 'SHADOW';
    phaseTransitioned = true;
  } else if (boss.phase === 'SHADOW' && hpPercent <= 60) {
    seraphtPhase = 'BLOOD';
    phaseTransitioned = true;
  } else if (boss.phase === 'BLOOD' && hpPercent <= 40) {
    seraphtPhase = 'ICE';
    phaseTransitioned = true;
  } else if (boss.phase === 'ICE' && hpPercent <= 20) {
    seraphtPhase = 'ZAROS_ENRAGE';
    boss.isEnraged = true;
    phaseTransitioned = true;
  }

  boss.phase = seraphtPhase;
  return { effectiveDamage, healedAmount: 0, phaseTransitioned, newPhase: seraphtPhase, isDefeated: false };
}

/**
 * Resolves Blood Sacrifice beacon.
 * If target player did not run at least 7 tiles away from Seraph, deals 80% max HP damage and drains 33% prayer.
 */
export function resolveBloodSacrifice(
  playerPos: { x: number; y: number },
  seraphPos: { x: number; y: number },
  playerHp: number,
  playerMaxHp: number,
  prayerPoints: number
): { escaped: boolean; damageDealt: number; prayerDrained: number } {
  const dx = playerPos.x - seraphPos.x;
  const dy = playerPos.y - seraphPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance >= 7) {
    return { escaped: true, damageDealt: 0, prayerDrained: 0 };
  }

  const damage = Math.round(playerMaxHp * 0.80);
  const prayerDrain = Math.round(prayerPoints * 0.33);

  return { escaped: false, damageDealt: damage, prayerDrained: prayerDrain };
}

/**
 * Resolves Ice Prison breakout damage.
 * If prison HP is 0 (broken by teammates), trapped player takes minimal damage. Otherwise, deals lethal shattering damage.
 */
export function resolveIcePrison(
  prisonRemainingHp: number,
  playerMaxHp: number
): { broken: boolean; damageDealt: number } {
  if (prisonRemainingHp <= 0) {
    return { broken: true, damageDealt: Math.round(playerMaxHp * 0.15) };
  }
  // Shatter damage: 95% max HP
  return { broken: false, damageDealt: Math.round(playerMaxHp * 0.95) };
}

/**
 * Resolves Shadow Trap eruption.
 */
export function resolveShadowTrap(
  playerPos: { x: number; y: number },
  traps: Array<{ x: number; y: number }>
): { triggered: boolean; damageDealt: number } {
  const isHit = traps.some((t) => t.x === playerPos.x && t.y === playerPos.y);
  if (isHit) {
    const damage = Math.floor(45 + Math.random() * 25);
    return { triggered: true, damageDealt: damage };
  }
  return { triggered: false, damageDealt: 0 };
}
