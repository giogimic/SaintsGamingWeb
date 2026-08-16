/**
 * Saints Gaming — Target Frame & Cast Range Resolver (Bible 09 & Bible 10)
 * Evaluates target entity relationship, distance, cast range validation, and HUD action triggers.
 */

import { Position2D, calculateDistance } from './aggroEngine';

export type TargetRelationship = 'HOSTILE' | 'NEUTRAL' | 'FRIENDLY';

export type TargetActionType =
  | 'ATTACK'
  | 'DUEL'
  | 'PARTY_INVITE'
  | 'WHISPER'
  | 'TALK'
  | 'CAPTURE';

export interface TargetEntityData {
  entityId: string;
  name: string;
  type: 'player' | 'creature' | 'mob' | 'npc';
  hp: number;
  maxHp: number;
  level?: number;
  position: Position2D;
  isWild?: boolean;
}

export interface TargetFrameState {
  entityId: string;
  name: string;
  type: 'player' | 'creature' | 'mob' | 'npc';
  hp: number;
  maxHp: number;
  hpPercent: number;
  distance: number;
  isInRange: boolean;
  relationship: TargetRelationship;
  availableActions: TargetActionType[];
}

/**
 * Evaluates target frame data and range indicators relative to the player's current position.
 */
export function evaluateTargetFrame(
  playerPos: Position2D,
  target: TargetEntityData,
  abilityRange: number = 2.0
): TargetFrameState {
  const distance = calculateDistance(playerPos, target.position);
  const isInRange = distance <= abilityRange;
  const hpPercent = Math.max(0, Math.min(100, (target.hp / Math.max(1, target.maxHp)) * 100));

  let relationship: TargetRelationship = 'NEUTRAL';
  const availableActions: TargetActionType[] = [];

  switch (target.type) {
    case 'player':
      relationship = 'FRIENDLY';
      availableActions.push('PARTY_INVITE', 'WHISPER', 'DUEL');
      break;

    case 'mob':
      relationship = 'HOSTILE';
      availableActions.push('ATTACK');
      break;

    case 'creature':
      relationship = target.isWild ? 'HOSTILE' : 'NEUTRAL';
      availableActions.push('ATTACK');
      if (target.isWild) {
        availableActions.push('CAPTURE');
      }
      break;

    case 'npc':
    default:
      relationship = 'NEUTRAL';
      availableActions.push('TALK');
      break;
  }

  return {
    entityId: target.entityId,
    name: target.name,
    type: target.type,
    hp: target.hp,
    maxHp: target.maxHp,
    hpPercent,
    distance,
    isInRange,
    relationship,
    availableActions,
  };
}
