/**
 * Lobby soft-reconnect + map hot-reload policy (game MP harden).
 */

import { isSameBaseMap } from "../net/mapIds";

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
