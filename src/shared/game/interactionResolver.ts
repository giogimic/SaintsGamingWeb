/**
 * Saints Gaming — Context-Sensitive Interaction Resolver (Bible 34 §4)
 * Dynamic query engine evaluating entity components, player capabilities, and environmental context.
 */

import { EntityInstanceV1 } from './entities/types';

export type InteractionActionType =
  | 'TALK'
  | 'INSPECT'
  | 'ATTACK'
  | 'CAPTURE'
  | 'TAME'
  | 'MOUNT'
  | 'HARVEST'
  | 'OPEN_CONTAINER'
  | 'WARP'
  | 'SHOP'
  | 'CUSTOM';

export interface InteractionOption {
  id: string;
  type: InteractionActionType;
  label: string;
  icon?: string;
  primary?: boolean;
  enabled: boolean;
  disabledReason?: string;
  payload?: Record<string, unknown>;
}

export interface PlayerInteractionContext {
  id: string;
  level?: number;
  skills?: Record<string, number>; // e.g. { woodcutting: 15, fishing: 10 }
  inventoryItems?: string[]; // item slugs
  isMounted?: boolean;
  activeCompanionId?: string;
}

export interface WorldInteractionContext {
  gameMode: 'EXPLORING' | 'BATTLE' | 'STUDIO' | 'SHOP' | 'CRAFTING' | string;
  distance: number;
  maxDistance?: number;
  isCombatActive?: boolean;
}

/**
 * Resolves all valid interactions a player can perform against an entity in the current context.
 */
export function queryInteractions(
  player: PlayerInteractionContext,
  target: EntityInstanceV1,
  context: WorldInteractionContext
): InteractionOption[] {
  const options: InteractionOption[] = [];
  const maxDist = context.maxDistance ?? 2.0;

  if (context.distance > maxDist) {
    return options; // Out of reach
  }

  const { components } = target;
  const capabilities = components.capabilities || {};

  // 1. TALK / DIALOGUE
  if (components.dialogue && components.interact?.enabled !== false) {
    options.push({
      id: `${target.id}_talk`,
      type: 'TALK',
      label: `Talk to ${components.identity?.name || 'NPC'}`,
      primary: true,
      enabled: true,
      payload: {
        dialogueKey: components.dialogue.dialogueKey,
        speakerName: components.dialogue.speakerName || components.identity?.name,
      },
    });
  }

  // 2. HARVEST (Resource Node)
  if (components.resource_node) {
    const res = components.resource_node;
    const reqSkill = res.skillRequired || (res.resourceType === 'wood' ? 'woodcutting' : 'mining');
    const playerSkillLevel = player.skills?.[reqSkill] || 1;
    const minLevel = res.minLevel || 1;
    const hasSkill = playerSkillLevel >= minLevel;
    const hasYields = (res.yieldsRemaining ?? 1) > 0;

    options.push({
      id: `${target.id}_harvest`,
      type: 'HARVEST',
      label: `Harvest ${components.identity?.name || res.resourceType}`,
      primary: true,
      enabled: hasSkill && hasYields,
      disabledReason: !hasYields
        ? 'Resource node is depleted'
        : !hasSkill
        ? `Requires ${reqSkill} Level ${minLevel}`
        : undefined,
      payload: {
        resourceType: res.resourceType,
        nodeId: target.id,
      },
    });
  }

  // 3. WARP / GATE
  if (components.warp) {
    options.push({
      id: `${target.id}_warp`,
      type: 'WARP',
      label: `Enter ${components.identity?.name || components.warp.targetMapId}`,
      primary: true,
      enabled: true,
      payload: {
        targetMapId: components.warp.targetMapId,
        spawnPoint: components.warp.targetSpawn,
      },
    });
  }

  // 4. COMBAT / ATTACK
  if (components.combatant || capabilities.hostile) {
    options.push({
      id: `${target.id}_attack`,
      type: 'ATTACK',
      label: `Attack ${components.identity?.name || 'Enemy'}`,
      primary: capabilities.hostile ?? false,
      enabled: true,
      payload: {
        targetId: target.id,
        level: components.combatant?.level || 1,
      },
    });
  }

  // 5. CAPTURE (Turn-Based Battle Context Only - Bible 07 §4)
  if (capabilities.capturable) {
    const isTurnBasedBattle = context.gameMode === 'BATTLE';
    options.push({
      id: `${target.id}_capture`,
      type: 'CAPTURE',
      label: `Capture ${components.identity?.name || 'Creature'}`,
      enabled: isTurnBasedBattle,
      disabledReason: !isTurnBasedBattle
        ? 'Creatures can only be captured in Turn-Based Buddy Battles (Bible 07 §4)'
        : undefined,
      payload: {
        creatureId: target.id,
      },
    });
  }

  // 6. MOUNT
  if (capabilities.mountable) {
    options.push({
      id: `${target.id}_mount`,
      type: 'MOUNT',
      label: player.isMounted ? 'Dismount' : `Mount ${components.identity?.name || 'Beast'}`,
      enabled: true,
      payload: {
        mountId: target.id,
      },
    });
  }

  // 7. INSPECT (Universal Fallback)
  if (components.identity) {
    options.push({
      id: `${target.id}_inspect`,
      type: 'INSPECT',
      label: `Inspect ${components.identity.name}`,
      enabled: true,
      payload: {
        name: components.identity.name,
        slug: components.identity.slug,
      },
    });
  }

  return options;
}
