/**
 * Saints Gaming — Real-Time Monster State Machine (Bible 10)
 * Evaluates tactical behavior states: IDLE, PATROL, CHASE, ATTACK, FLEE, RETURN_LEASH, and DEAD.
 */

import {
  Position2D,
  calculateDistance,
  isMonsterLeashed,
  ThreatTable,
} from './aggroEngine';

export type MonsterState =
  | 'IDLE'
  | 'PATROL'
  | 'CHASE'
  | 'ATTACK'
  | 'FLEE'
  | 'RETURN_LEASH'
  | 'DEAD';

export interface MonsterAIContext {
  currentPos: Position2D;
  spawnOrigin: Position2D;
  currentHp: number;
  maxHp: number;
  attackRange?: number; // default 1.5 tiles (melee) or 6 tiles (ranged)
  aggroRadius?: number; // default 5 tiles
  leashRadius?: number; // default 15 tiles
  fleeHpRatio?: number; // e.g. 0.15 (15% HP triggers flee)
}

export interface StateEvaluationResult {
  seraphtState: MonsterState;
  targetPos?: Position2D;
  shouldResetThreat?: boolean;
  reason: string;
}

/**
 * Evaluates state transitions for a monster actor based on world state, distance, and threat table.
 */
export function evaluateMonsterState(
  currentState: MonsterState,
  context: MonsterAIContext,
  targetPos: Position2D | null,
  threatTable?: ThreatTable
): StateEvaluationResult {
  // 1. Dead Check
  if (context.currentHp <= 0) {
    return {
      seraphtState: 'DEAD',
      shouldResetThreat: true,
      reason: 'Monster has perished.',
    };
  }

  const leashRadius = context.leashRadius ?? 15;
  const attackRange = context.attackRange ?? 1.5;
  const fleeRatio = context.fleeHpRatio ?? 0.15;

  // 2. Leash Reset Check
  if (isMonsterLeashed(context.currentPos, context.spawnOrigin, leashRadius)) {
    return {
      seraphtState: 'RETURN_LEASH',
      targetPos: context.spawnOrigin,
      shouldResetThreat: true,
      reason: 'Exceeded maximum leash radius from spawn point.',
    };
  }

  // 3. Flee / Cowardice Check
  if (targetPos && context.currentHp / context.maxHp <= fleeRatio) {
    // Run away in opposite direction from target
    const dx = context.currentPos.x - targetPos.x;
    const dy = context.currentPos.y - targetPos.y;
    const fleeTarget: Position2D = {
      x: context.currentPos.x + (dx > 0 ? 3 : -3),
      y: context.currentPos.y + (dy > 0 ? 3 : -3),
    };

    return {
      seraphtState: 'FLEE',
      targetPos: fleeTarget,
      reason: 'Health critical; retreating from attacker.',
    };
  }

  // 4. Combat Engagement (Target exists)
  if (targetPos) {
    const distToTarget = calculateDistance(context.currentPos, targetPos);

    if (distToTarget <= attackRange) {
      return {
        seraphtState: 'ATTACK',
        targetPos,
        reason: 'Within striking range of target.',
      };
    }

    return {
      seraphtState: 'CHASE',
      targetPos,
      reason: 'Pursuing hostile target.',
    };
  }

  // 5. Returning home to spawn
  if (currentState === 'RETURN_LEASH') {
    const distToSpawn = calculateDistance(context.currentPos, context.spawnOrigin);
    if (distToSpawn <= 0.5) {
      return {
        seraphtState: 'IDLE',
        reason: 'Returned successfully to spawn origin.',
      };
    }

    return {
      seraphtState: 'RETURN_LEASH',
      targetPos: context.spawnOrigin,
      reason: 'Continuing path back to spawn origin.',
    };
  }

  // 6. Out of combat (IDLE / PATROL)
  return {
    seraphtState: 'IDLE',
    reason: 'No active threat; idling.',
  };
}
