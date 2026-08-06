/**
 * Lobby /join_map coalescing — stop UI join storms from tearing down peers.
 */

import { isPublicChannelInstanceId, toBaseMapId } from "../net/mapIds";

export type JoinContract = {
  mapId: string;
  lobby: boolean;
  isPrivate: boolean;
  pie: boolean;
};

/** Stable key for the seat contract (not spawn coords). */
export function buildJoinKey(contract: JoinContract): string {
  const base = toBaseMapId(contract.mapId || "DEMO_SANDBOX");
  return [
    base,
    contract.lobby ? "lobby" : "studio",
    contract.isPrivate ? "priv" : "pub",
    contract.pie ? "pie" : "nopie",
  ].join("|");
}

/**
 * Skip a redundant join_map when we already hold a matching public lobby seat.
 * Reconnect (new socket) always joins — caller clears lastJoinKey on disconnect.
 */
export function shouldSkipRedundantLobbyJoin(opts: {
  contract: JoinContract;
  currentInstanceId?: string | null;
  lastJoinKey?: string | null;
}): boolean {
  if (!opts.contract.lobby) return false;
  if (opts.contract.isPrivate || opts.contract.pie) return false;
  const key = buildJoinKey(opts.contract);
  if (!opts.lastJoinKey || opts.lastJoinKey !== key) return false;
  return isPublicChannelInstanceId(opts.currentInstanceId);
}

/**
 * Empty map_players must not wipe peers that are still on the same public shard
 * (join-storm race). Non-empty snapshots always win.
 */
export function shouldReplacePeerSnapshot(opts: {
  incomingCount: number;
  existingCount: number;
  currentInstanceId?: string | null;
}): boolean {
  if (opts.incomingCount > 0) return true;
  if (opts.existingCount === 0) return true;
  // Keep peers on a live public shard when the snapshot is empty (race).
  if (isPublicChannelInstanceId(opts.currentInstanceId)) return false;
  return true;
}
