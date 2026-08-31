/**
 * Lobby /join_map coalescing — stop UI join storms from tearing down peers.
 */

import { isPublicChannelInstanceId, toBaseMapId } from "../net/mapIds";
import { DEFAULT_SPAWN_MAP_ID } from "./realmSettings";

export type JoinContract = {
  mapId: string;
  lobby: boolean;
  isPrivate: boolean;
  pie: boolean;
};

/** Stable key for the seat contract (not spawn coords). */
export function buildJoinKey(contract: JoinContract): string {
  const base = toBaseMapId(contract.mapId || DEFAULT_SPAWN_MAP_ID);
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
 * Empty map_players must not wipe peers during lobby seat races.
 * Non-empty snapshots always win.
 *
 * Important: character load used to set instanceId to the *base* map id
 * (`DEMO_SANDBOX`) before `map_joined` delivered `*_chN`. Guarding only on
 * `isPublicChannelInstanceId` left that window unprotected.
 */
export function shouldReplacePeerSnapshot(opts: {
  incomingCount: number;
  existingCount: number;
  currentInstanceId?: string | null;
  /** True for /lobby public multiplayer (not Studio private/PIE). */
  lobbySeat?: boolean;
}): boolean {
  if (opts.incomingCount > 0) return true;
  if (opts.existingCount === 0) return true;
  if (opts.lobbySeat) return false;
  if (isPublicChannelInstanceId(opts.currentInstanceId)) return false;
  return true;
}
