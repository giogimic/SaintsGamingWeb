/**
 * Saints Gaming — Companion AI, Pet Commands & Buddy Tactics Engine (Bible 09 & Rule 8)
 * Manages companion combat stances, tactical commands, leash tethering, and loyalty bond synergies.
 */

export type CompanionStance = 'AGGRESSIVE' | 'DEFENSIVE' | 'PASSIVE' | 'ASSIST';

export type TacticalCommand =
  | 'ATTACK_TARGET'
  | 'RETURN_TO_ME'
  | 'USE_SPECIAL_ABILITY'
  | 'STAY_POSITION';

export interface CompanionState {
  companionId: string;
  ownerId: string;
  creatureSlug: string;
  name: string;
  stance: CompanionStance;
  targetEntityId: string | null;
  x: number;
  y: number;
  ownerX: number;
  ownerY: number;
  loyaltyLevel: number; // 1 to 100
  specialCooldownUntil: number;
  isStayStationary: boolean;
}

export interface CompanionActionDecision {
  action: 'MOVE' | 'ATTACK' | 'CAST_SPECIAL' | 'IDLE' | 'TELEPORT_LEASH';
  targetCoordinates?: { x: number; y: number };
  targetEntityId?: string;
  specialAbilityName?: string;
  reason?: string;
}

export const MAX_TETHER_DISTANCE = 12;
export const FOLLOW_DESIRED_DISTANCE = 2;

export class CompanionAiEngine {
  /**
   * Updates companion combat stance.
   */
  public setStance(state: CompanionState, stance: CompanionStance): CompanionState {
    state.stance = stance;
    if (stance === 'PASSIVE') {
      state.targetEntityId = null;
    }
    return state;
  }

  /**
   * Issues a tactical player command to the companion.
   */
  public issueCommand(
    state: CompanionState,
    command: TacticalCommand,
    targetEntityId?: string
  ): { success: boolean; state: CompanionState; reason?: string } {
    const now = Date.now();

    switch (command) {
      case 'ATTACK_TARGET':
        if (!targetEntityId) {
          return { success: false, state, reason: 'Target required for ATTACK_TARGET command' };
        }
        state.targetEntityId = targetEntityId;
        state.isStayStationary = false;
        return { success: true, state };

      case 'RETURN_TO_ME':
        state.targetEntityId = null;
        state.isStayStationary = false;
        state.x = state.ownerX;
        state.y = state.ownerY;
        return { success: true, state };

      case 'STAY_POSITION':
        state.isStayStationary = true;
        state.targetEntityId = null;
        return { success: true, state };

      case 'USE_SPECIAL_ABILITY':
        if (state.specialCooldownUntil > now) {
          return {
            success: false,
            state,
            reason: `Special ability on cooldown (${Math.ceil((state.specialCooldownUntil - now) / 1000)}s remaining)`,
          };
        }
        // Apply 30-second cooldown
        state.specialCooldownUntil = now + 30000;
        return { success: true, state };

      default:
        return { success: false, state, reason: 'Unknown command' };
    }
  }

  /**
   * Evaluates AI tick decision based on stance, tether distances, and nearby hostiles.
   */
  public evaluateTick(
    state: CompanionState,
    hostilesInRange: Array<{ id: string; x: number; y: number; isAttackingOwnerOrPet: boolean }>,
    ownerHpRatio: number = 1.0
  ): CompanionActionDecision {
    const distToOwner = Math.hypot(state.x - state.ownerX, state.y - state.ownerY);

    // 1. Leash check: If drifted too far, leash back immediately
    if (!state.isStayStationary && distToOwner > MAX_TETHER_DISTANCE) {
      state.x = state.ownerX;
      state.y = state.ownerY;
      state.targetEntityId = null;
      return {
        action: 'TELEPORT_LEASH',
        targetCoordinates: { x: state.ownerX, y: state.ownerY },
        reason: 'Exceeded maximum leash distance',
      };
    }

    // 2. Loyalty Emergency Guardian Perk (Owner HP < 25% and Loyalty >= 80)
    if (ownerHpRatio <= 0.25 && state.loyaltyLevel >= 80 && Date.now() >= state.specialCooldownUntil) {
      state.specialCooldownUntil = Date.now() + 60000; // 1-minute cooldown on emergency heal
      return {
        action: 'CAST_SPECIAL',
        specialAbilityName: 'Guardian Salve',
        targetCoordinates: { x: state.ownerX, y: state.ownerY },
        reason: 'Emergency guardian heal triggered by critical owner HP',
      };
    }

    // 3. Stance evaluation
    if (state.stance === 'PASSIVE' || state.isStayStationary) {
      if (!state.isStayStationary && distToOwner > FOLLOW_DESIRED_DISTANCE) {
        return {
          action: 'MOVE',
          targetCoordinates: { x: state.ownerX, y: state.ownerY },
          reason: 'Following owner',
        };
      }
      return { action: 'IDLE' };
    }

    // 4. Target Acquisition based on stance
    let target = state.targetEntityId
      ? hostilesInRange.find((h) => h.id === state.targetEntityId)
      : null;

    if (!target) {
      if (state.stance === 'AGGRESSIVE' && hostilesInRange.length > 0) {
        target = hostilesInRange[0];
        state.targetEntityId = target.id;
      } else if (state.stance === 'DEFENSIVE') {
        const threat = hostilesInRange.find((h) => h.isAttackingOwnerOrPet);
        if (threat) {
          target = threat;
          state.targetEntityId = threat.id;
        }
      }
    }

    if (target) {
      const distToTarget = Math.hypot(state.x - target.x, state.y - target.y);
      if (distToTarget <= 1.5) {
        return {
          action: 'ATTACK',
          targetEntityId: target.id,
          reason: 'In melee attack range',
        };
      } else {
        return {
          action: 'MOVE',
          targetCoordinates: { x: target.x, y: target.y },
          targetEntityId: target.id,
          reason: 'Closing distance to attack target',
        };
      }
    }

    // 5. Default: follow owner
    if (distToOwner > FOLLOW_DESIRED_DISTANCE) {
      return {
        action: 'MOVE',
        targetCoordinates: { x: state.ownerX, y: state.ownerY },
        reason: 'Returning to owner proximity',
      };
    }

    return { action: 'IDLE' };
  }

  /**
   * Computes synergy bonuses granted by companion loyalty level.
   */
  public evaluateLoyaltySynergy(loyaltyLevel: number): {
    damageMultiplier: number;
    emergencyHealUnlocked: boolean;
    speedBonus: number;
  } {
    const bounded = Math.max(0, Math.min(100, loyaltyLevel));

    return {
      damageMultiplier: Number((1.0 + (bounded / 100) * 0.15).toFixed(2)), // up to +15% damage bonus
      emergencyHealUnlocked: bounded >= 80,
      speedBonus: bounded >= 50 ? 1 : 0,
    };
  }
}
