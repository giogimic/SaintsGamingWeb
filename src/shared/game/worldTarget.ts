/**
 * Saints Gaming — Unified WorldTarget Spatial Interaction System (Bible 34 §4)
 * Shared vocabulary and evaluation pipeline for "What is under the pointer and what can I do with it?"
 */

import { EntityInstanceV1 } from './entities/types';
import { InteractionOption, queryInteractions, PlayerInteractionContext, WorldInteractionContext } from './interactionResolver';

export type WorldTargetKind =
  | 'tile'
  | 'entity'
  | 'object'
  | 'creature'
  | 'player'
  | 'gate'
  | 'resource';

export type TargetInteractionState = 'none' | 'hover' | 'focus' | 'combat';

export interface WorldTargetPrimaryAction {
  type: string;
  label: string;
  key: string;
  enabled: boolean;
  disabledReason?: string;
  payload?: Record<string, unknown>;
}

export interface WorldTarget {
  kind: WorldTargetKind;
  id?: string;
  name: string;
  tile: { r: number; c: number };
  position: { x: number; y: number; z: number };
  distance: number;
  interactable: boolean;
  primaryAction?: WorldTargetPrimaryAction;
  actions: InteractionOption[];
  footprint: {
    width: number;
    height: number;
    radius: number; // in world units for circular ground ring
  };
  status: 'valid' | 'blocked' | 'targetable';
  entityRef?: EntityInstanceV1 | any;
  health?: {
    current: number;
    max: number;
  };
  level?: number;
  tags?: string[];
}

/**
 * Calculates ground target ring radius based on footprint dimensions.
 */
export function calculateFootprintRadius(width = 1, height = 1): number {
  const maxDim = Math.max(width, height);
  if (maxDim <= 1) return 0.55;
  if (maxDim <= 2) return 1.1;
  if (maxDim <= 3) return 1.6;
  return maxDim * 0.55;
}

/**
 * Determines whether a target is within interaction range.
 */
export function isTargetInRange(distance: number, maxReach = 1.6): boolean {
  return distance <= maxReach;
}

/**
 * Resolves the primary interaction action from available options.
 */
export function resolveTargetPrimaryAction(options: InteractionOption[]): WorldTargetPrimaryAction | undefined {
  if (!options || options.length === 0) return undefined;

  const primary = options.find((o) => o.primary && o.enabled) || options.find((o) => o.enabled) || options[0];
  if (!primary) return undefined;

  let defaultKey = 'E';
  if (primary.type === 'ATTACK') defaultKey = 'SPACE';
  else if (primary.type === 'TALK') defaultKey = 'E';
  else if (primary.type === 'HARVEST') defaultKey = 'E';
  else if (primary.type === 'OPEN_CONTAINER') defaultKey = 'E';
  else if (primary.type === 'WARP') defaultKey = 'E';

  return {
    type: primary.type,
    label: primary.label,
    key: defaultKey,
    enabled: primary.enabled,
    disabledReason: primary.disabledReason,
    payload: primary.payload,
  };
}

/**
 * Evaluates an EntityInstance into a complete WorldTarget.
 */
export function evaluateEntityTarget(params: {
  entity: EntityInstanceV1 | any;
  playerPos: { x: number; y: number };
  playerContext?: PlayerInteractionContext;
  worldContext?: Partial<WorldInteractionContext>;
}): WorldTarget {
  const { entity, playerPos, playerContext, worldContext } = params;
  const rawX = entity.components?.transform?.x ?? entity.position?.x ?? 0;
  const rawY = entity.components?.transform?.y ?? entity.position?.y ?? 0;
  const entityX = Math.round(rawX);
  const entityY = Math.round(rawY);
  const dist = Math.hypot(rawX - playerPos.x, rawY - playerPos.y);

  const defaultPlayerCtx: PlayerInteractionContext = playerContext || {
    id: 'local_player',
    level: 1,
  };

  const defaultWorldCtx: WorldInteractionContext = {
    gameMode: worldContext?.gameMode || 'EXPLORING',
    distance: dist,
    maxDistance: worldContext?.maxDistance || 2.0,
    isCombatActive: worldContext?.isCombatActive || false,
  };

  const options = queryInteractions(defaultPlayerCtx, entity, defaultWorldCtx);
  const primaryAction = resolveTargetPrimaryAction(options);

  const isCreature = Boolean(
    entity.components?.combatant ||
    entity.archetype === 'monster' ||
    entity.id.startsWith('mob_') ||
    entity.components?.ai
  );
  const isPlayer = Boolean(entity.id.startsWith('player_') || entity.id.startsWith('multiplayer_'));
  const kind: WorldTargetKind = isCreature ? 'creature' : isPlayer ? 'player' : 'entity';

  const footprintComp = entity.components?.footprint as { width?: number; height?: number } | undefined;
  const width = footprintComp?.width || 1;
  const height = footprintComp?.height || 1;
  const radius = calculateFootprintRadius(width, height);

  const combatant = entity.components?.combatant;
  const stats = (entity as any).stats || combatant;
  const health = combatant
    ? { current: combatant.currentHp, max: combatant.maxHp }
    : stats
    ? { current: stats.hp, max: stats.maxHp }
    : undefined;

  const identity = entity.components?.identity;
  const name = identity?.name || entity.name || entity.id;

  return {
    kind,
    id: entity.id,
    name,
    tile: { r: entityY, c: entityX },
    position: { x: rawX, y: 0, z: rawY },
    distance: Number(dist.toFixed(2)),
    interactable: options.length > 0 && isTargetInRange(dist, defaultWorldCtx.maxDistance),
    primaryAction,
    actions: options,
    footprint: { width, height, radius },
    status: options.length > 0 ? 'targetable' : 'valid',
    entityRef: entity,
    health,
    level: combatant?.level ?? stats?.level,
    tags: identity?.tags,
  };
}

/**
 * Evaluates a ground tile or map object into a WorldTarget.
 */
export function evaluateTileTarget(params: {
  r: number;
  c: number;
  playerPos: { x: number; y: number };
  isSolid: boolean;
  logicTag?: { id: number; name: string; tagType?: string };
  warpGate?: { name?: string; targetMapId?: string };
  tileName?: string;
}): WorldTarget {
  const { r, c, playerPos, isSolid, logicTag, warpGate, tileName } = params;
  const dist = Math.hypot(c - playerPos.x, r - playerPos.y);

  const actions: InteractionOption[] = [];
  let kind: WorldTargetKind = 'tile';

  if (warpGate) {
    kind = 'gate';
    actions.push({
      id: `gate_${r}_${c}`,
      type: 'WARP',
      label: warpGate.name ? `Enter ${warpGate.name}` : `Travel to ${warpGate.targetMapId || 'Unknown'}`,
      primary: true,
      enabled: isTargetInRange(dist, 1.5),
      payload: { warpGate },
    });
  } else if (logicTag && (logicTag.tagType === 'shop' || logicTag.name?.toLowerCase().includes('shop'))) {
    kind = 'object';
    actions.push({
      id: `shop_region_${r}_${c}`,
      type: 'SHOP',
      label: 'Browse Counter',
      primary: true,
      enabled: isTargetInRange(dist, 1.8),
      payload: { shopId: 'general_store', isRegion: true },
    });
  } else if (logicTag && logicTag.tagType === 'resource') {
    kind = 'resource';
    actions.push({
      id: `resource_${r}_${c}`,
      type: 'HARVEST',
      label: `Harvest ${logicTag.name}`,
      primary: true,
      enabled: isTargetInRange(dist, 1.5),
    });
  }

  const primaryAction = resolveTargetPrimaryAction(actions);

  return {
    kind,
    name: warpGate?.name || (logicTag ? logicTag.name : tileName || `Tile [${c}, ${r}]`),
    tile: { r, c },
    position: { x: c, y: 0, z: r },
    distance: Number(dist.toFixed(2)),
    interactable: actions.length > 0,
    primaryAction,
    actions,
    footprint: { width: 1, height: 1, radius: 0.5 },
    status: isSolid ? 'blocked' : actions.length > 0 ? 'targetable' : 'valid',
  };
}
