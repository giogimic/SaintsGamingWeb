/**
 * Authoritative client-side world join orchestrator for Saints MMO.
 *
 * Guarantees:
 * 1. Exactly ONE world-join path across character select, socket connect/reconnect, gate warps, and Studio modes.
 * 2. Strict state-machine transitions (not_joined -> joining -> joined / transitioning).
 * 3. Prevention of duplicate/racing join_map emissions.
 * 4. Monotonic joinSeq versioning to discard stale server responses.
 */

import { toBaseMapId } from '../net/mapIds';
import { buildJoinKey, shouldSkipRedundantLobbyJoin, type JoinContract } from './lobbyJoin';
import { DEFAULT_SPAWN_MAP_ID } from './realmSettings';
import type { JoinMapPayload } from '../net/protocol';

export type WorldSessionState = 'not_joined' | 'joining' | 'joined' | 'transitioning' | 'disconnected';

export interface JoinWorldOptions {
  socket?: { connected?: boolean; emit: (event: string, data: any) => void } | null;
  accountId?: string | null;
  characterId?: string | null;
  contract: JoinContract;
  position?: { x?: number; y?: number };
  name?: string;
  assetProfileId?: string;
  neighborMapIds?: string[];
  worldSessionState: WorldSessionState;
  currentInstanceId?: string | null;
  worldJoinSeq: number;
  lastJoinKey?: string | null;
  onSetWorldSessionState: (state: WorldSessionState) => void;
  onIncrementWorldJoinSeq: () => number;
  onUpdateLastJoinKey?: (key: string) => void;
  force?: boolean;
}

export interface JoinWorldResult {
  success: boolean;
  reason?: 'unauthenticated' | 'disconnected' | 'already_joining' | 'redundant' | 'missing_map';
  payload?: JoinMapPayload;
  seq?: number;
  joinKey?: string;
}

export function joinWorld(opts: JoinWorldOptions): JoinWorldResult {
  if (!opts.accountId) {
    return { success: false, reason: 'unauthenticated' };
  }
  if (!opts.socket || !opts.socket.connected) {
    return { success: false, reason: 'disconnected' };
  }

  const rawMapId = opts.contract.mapId || DEFAULT_SPAWN_MAP_ID;
  const baseMapId = toBaseMapId(rawMapId);
  if (!baseMapId) {
    return { success: false, reason: 'missing_map' };
  }

  const normalizedContract: JoinContract = {
    mapId: baseMapId,
    lobby: Boolean(opts.contract.lobby),
    isPrivate: Boolean(opts.contract.isPrivate),
    pie: Boolean(opts.contract.pie),
  };

  const key = buildJoinKey(normalizedContract);

  // Check redundancy unless forced (e.g. forced retry or map transition)
  if (!opts.force) {
    if (
      shouldSkipRedundantLobbyJoin({
        contract: normalizedContract,
        currentInstanceId: opts.currentInstanceId,
        lastJoinKey: opts.lastJoinKey,
      })
    ) {
      return { success: false, reason: 'redundant', joinKey: key };
    }

    if (opts.worldSessionState === 'joining') {
      return { success: false, reason: 'already_joining', joinKey: key };
    }
  }

  // Authoritatively advance join state and sequence
  const seraphtSeq = opts.onIncrementWorldJoinSeq();
  opts.onSetWorldSessionState('joining');
  opts.onUpdateLastJoinKey?.(key);

  const payload: JoinMapPayload = {
    accountId: opts.accountId,
    characterId: opts.characterId || undefined,
    mapId: baseMapId,
    lobby: normalizedContract.lobby,
    isPrivate: normalizedContract.isPrivate,
    pie: normalizedContract.pie,
    x: typeof opts.position?.x === 'number' ? opts.position.x : 14,
    y: typeof opts.position?.y === 'number' ? opts.position.y : 15,
    name: opts.name || 'Player',
    assetProfileId: opts.assetProfileId || 'adventurer',
    spriteId: opts.assetProfileId || 'adventurer',
    neighborMapIds: opts.neighborMapIds,
    joinSeq: seraphtSeq,
  };

  opts.socket.emit('join_map', payload);

  return {
    success: true,
    payload,
    seq: seraphtSeq,
    joinKey: key,
  };
}

export interface StartMapTransitionOptions extends Omit<JoinWorldOptions, 'worldSessionState'> {
  setIsMapTransitioning?: (isTransitioning: boolean) => void;
  onClearPeers?: () => void;
  transitionTimeoutMs?: number;
}

/**
 * Initiates an atomic map transition:
 * 1. Puts client state into 'transitioning'
 * 2. Clears stale peers from departing map
 * 3. Sends forced join_map to server for destination map
 * 4. Provides safety timer so client never remains locked in transition
 */
export function startMapTransition(opts: StartMapTransitionOptions): JoinWorldResult & { cleanupTimeout?: () => void } {
  // Advance state to transitioning
  opts.onSetWorldSessionState('transitioning');
  opts.setIsMapTransitioning?.(true);

  // Clear departing peers
  opts.onClearPeers?.();

  // Execute destination join
  const res = joinWorld({
    ...opts,
    worldSessionState: 'transitioning',
    force: true,
  });

  const timeoutMs = opts.transitionTimeoutMs ?? 5000;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  if (typeof setTimeout !== 'undefined') {
    timerId = setTimeout(() => {
      opts.setIsMapTransitioning?.(false);
      opts.onSetWorldSessionState('joined');
    }, timeoutMs);
  }

  const cleanupTimeout = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return {
    ...res,
    cleanupTimeout,
  };
}

