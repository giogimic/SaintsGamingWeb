/**
 * Lobby soft-reconnect + map hot-reload policy (game MP harden).
 */

import { isSameBaseMap } from "../net/mapIds";

/** Maximum allowed disconnect timeout before session expires and forces title return (20-30s policy). */
export const MAX_DISCONNECT_RECONNECT_WINDOW_MS = 25000; // 25 seconds

/**
 * Returns true if a connection has been lost for longer than the reconnect window.
 */
export function isSessionConnectionStale(
  disconnectedAt: number | null | undefined,
  now = Date.now(),
  maxWindowMs = MAX_DISCONNECT_RECONNECT_WINDOW_MS
): boolean {
  if (!disconnectedAt || disconnectedAt <= 0) return false;
  return now - disconnectedAt >= maxWindowMs;
}

/** Soft transport blips keep peer sprites until `map_players` refreshes. */
export function shouldClearPeersOnDisconnect(reason: string): boolean {
  return reason === "io server disconnect";
}

/**
 * Whether this client should ingest a `map_reloaded` payload.
 * Skip other maps; skip Studio when local paint is unsaved.
 */
export function shouldApplyMapReload(opts: {
  reloadMapId: string | null | undefined;
  currentMapId: string | null | undefined;
  isStudio: boolean;
  mapDirty: boolean;
}): boolean {
  const reload = String(opts.reloadMapId || "");
  const current = String(opts.currentMapId || "");
  if (!reload || !current) return false;
  if (!isSameBaseMap(reload, current)) return false;
  if (opts.isStudio && opts.mapDirty) return false;
  return true;
}

/** Copy server map fields onto the live Studio/lobby document (same object id). */
export function mergeMapDocumentInPlace(
  live: Record<string, unknown>,
  fresh: Record<string, unknown>
): void {
  const keys = [
    "grid",
    "tileLayers",
    "tilesets",
    "gates",
    "npcs",
    "name",
    "width",
    "height",
    "chunks",
  ] as const;
  for (const key of keys) {
    if (key in fresh) {
      live[key] = fresh[key];
    }
  }
  if (fresh.id != null) live.id = fresh.id;
}
