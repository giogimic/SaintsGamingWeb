/**
 * The Great Wyrm Phase Engine & Special Attack Mechanics (Bible 24 & Bible 27).
 *
 * Implements:
 * - 3-phase fight progression (Phase 1, Phase 2, and Phase 3 Final Enrage).
 * - Component target management: Left Hand (Melee), Right Hand (Mage), and Head (Ranged).
 * - Special attack mechanics:
 *   - Crystal Burst (moving away from crystal spike tiles)
 *   - Lightning Matrix (dodging lightning lines)
 *   - Teleport Pairs (pair proximity resolution)
 *   - Burn Status ("Burn with me!" ticking damage & proximity contagion)
 *   - Falling Crystals ambient hazard.
 */

export type OlmPhase = 1 | 2 | 3;
export type OlmAttackType = 'MAGIC' | 'RANGED' | 'CRYSTAL_BURST' | 'LIGHTNING' | 'TELEPORT_PAIRS' | 'BURN' | 'SPHERES';

export interface OlmHandState {
  hp: number;
  maxHp: number;
  isCrippled: boolean;
  healingTimer: number;
}

export interface OlmBossState {
  phase: OlmPhase;
  headHp: number;
  headMaxHp: number;
  headDirection: 'LEFT' | 'MIDDLE' | 'RIGHT';
  leftHand: OlmHandState;
  rightHand: OlmHandState;
  isHeadVulnerable: boolean;
  attackCycle: number;
  activeSpecialAttack: OlmAttackType | null;
  enraged: boolean;
  isDead: boolean;
}

export interface PlayerRaidPosition {
  playerId: string;
  x: number;
  y: number;
  hp: number;
  isBurning: boolean;
  burnTicksRemaining: number;
}

/**
 * Initializes The Great Wyrm boss fight state scaled to party size.
 */
export function initializeOlmState(partySize: number, isChallengeMode: boolean = false): OlmBossState {
  const hpMulti = (1 + (Math.max(1, partySize) - 1) * 0.75) * (isChallengeMode ? 1.5 : 1.0);
  const baseHeadHp = Math.round(500 * hpMulti);
  const baseHandHp = Math.round(300 * hpMulti);

  return {
    phase: 1,
    headHp: baseHeadHp,
    headMaxHp: baseHeadHp,
    headDirection: 'MIDDLE',
    leftHand: { hp: baseHandHp, maxHp: baseHandHp, isCrippled: false, healingTimer: 0 },
    rightHand: { hp: baseHandHp, maxHp: baseHandHp, isCrippled: false, healingTimer: 0 },
    isHeadVulnerable: false,
    attackCycle: 0,
    activeSpecialAttack: null,
    enraged: false,
    isDead: false,
  };
}

/**
 * Evaluates damage applied to Wyrm's components and checks phase transitions.
 */
export function applyDamageToOlm(
  state: OlmBossState,
  targetComponent: 'LEFT_HAND' | 'RIGHT_HAND' | 'HEAD',
  damage: number
): {
  state: OlmBossState;
  componentDestroyed: boolean;
  phaseAdvanced: boolean;
  olmDefeated: boolean;
} {
  let componentDestroyed = false;
  let phaseAdvanced = false;
  let olmDefeated = false;

  if (targetComponent === 'LEFT_HAND' && !state.leftHand.isCrippled) {
    state.leftHand.hp = Math.max(0, state.leftHand.hp - damage);
    if (state.leftHand.hp === 0) {
      state.leftHand.isCrippled = true;
      componentDestroyed = true;
    }
  } else if (targetComponent === 'RIGHT_HAND' && !state.rightHand.isCrippled) {
    state.rightHand.hp = Math.max(0, state.rightHand.hp - damage);
    if (state.rightHand.hp === 0) {
      state.rightHand.isCrippled = true;
      componentDestroyed = true;
    }
  } else if (targetComponent === 'HEAD' && state.isHeadVulnerable) {
    state.headHp = Math.max(0, state.headHp - damage);
    if (state.headHp === 0) {
      state.isDead = true;
      olmDefeated = true;
      return { state, componentDestroyed: true, phaseAdvanced: false, olmDefeated: true };
    }
  }

  // Phase 1 & 2: When both hands are crippled, phase advances
  if (state.phase < 3) {
    if (state.leftHand.isCrippled && state.rightHand.isCrippled) {
      state.phase = (state.phase + 1) as OlmPhase;
      phaseAdvanced = true;
      // Reset hands for serapht phase
      state.leftHand.hp = state.leftHand.maxHp;
      state.leftHand.isCrippled = false;
      state.rightHand.hp = state.rightHand.maxHp;
      state.rightHand.isCrippled = false;

      if (state.phase === 3) {
        state.enraged = true;
      }
    }
  } else if (state.phase === 3) {
    // In Phase 3, both hands must be killed to unlock the Head for final execute
    if (state.leftHand.isCrippled && state.rightHand.isCrippled) {
      state.isHeadVulnerable = true;
    }
  }

  return { state, componentDestroyed, phaseAdvanced, olmDefeated };
}

/**
 * Resolves Crystal Burst special attack damage based on player movement.
 * If a player stayed on a crystal burst tile, they take high piercing damage.
 */
export function resolveCrystalBurst(
  playerTile: { x: number; y: number },
  crystalSpikeTiles: Array<{ x: number; y: number }>
): { hit: boolean; damage: number } {
  const isDirectHit = crystalSpikeTiles.some(
    (tile) => tile.x === playerTile.x && tile.y === playerTile.y
  );

  if (isDirectHit) {
    const damage = Math.floor(25 + Math.random() * 20); // 25-45 damage
    return { hit: true, damage };
  }

  return { hit: false, damage: 0 };
}

/**
 * Resolves Teleport Pairs mechanic.
 * If pair of players do not meet on the same tile when the timer expires, they take distance-scaled damage.
 */
export function resolveTeleportPair(
  player1: { x: number; y: number },
  player2: { x: number; y: number }
): { synced: boolean; damagePerPlayer: number } {
  const dx = Math.abs(player1.x - player2.x);
  const dy = Math.abs(player1.y - player2.y);
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return { synced: true, damagePerPlayer: 0 };
  }

  // 5 damage per tile of separation, max 40
  const damage = Math.min(40, Math.round(distance * 5));
  return { synced: false, damagePerPlayer: damage };
}

/**
 * Processes ticking Burn status effect and spreads to adjacent teammates within 1 tile.
 */
export function processBurnTick(players: PlayerRaidPosition[]): {
  updatedPlayers: PlayerRaidPosition[];
  spreadCount: number;
} {
  let spreadCount = 0;
  const burningPositions = players
    .filter((p) => p.isBurning && p.burnTicksRemaining > 0)
    .map((p) => ({ x: p.x, y: p.y }));

  const updatedPlayers = players.map((player) => {
    let p = { ...player };

    if (p.isBurning) {
      // Burn damage equals current ticks remaining (e.g. 5 -> 4 -> 3 -> 2 -> 1)
      const burnDmg = Math.max(1, p.burnTicksRemaining);
      p.hp = Math.max(0, p.hp - burnDmg);
      p.burnTicksRemaining -= 1;
      if (p.burnTicksRemaining <= 0) {
        p.isBurning = false;
      }
    } else {
      // Check if adjacent (within 1 tile Chebyshev distance) to an infected player
      const isAdjacent = burningPositions.some(
        (bPos) => Math.abs(bPos.x - p.x) <= 1 && Math.abs(bPos.y - p.y) <= 1
      );
      if (isAdjacent) {
        p.isBurning = true;
        p.burnTicksRemaining = 5;
        spreadCount++;
      }
    }

    return p;
  });

  return { updatedPlayers, spreadCount };
}
