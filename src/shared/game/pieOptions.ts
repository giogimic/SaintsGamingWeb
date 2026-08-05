/**
 * PIE (Play-In-Editor) option defaults — bible 32 §4.
 * Client-enforced for v1 (encounters / step actions); shard isolation stays on.
 */

export type PieOptions = {
  /** Always true in product Lobby vs Studio contracts — kept for UI honesty. */
  isolateShard: boolean;
  /** Skip encounter_check / step combat hooks during Playtest. */
  godMode: boolean;
  /** Soft-pause local spawner/encounter triggers (same gate as godMode for v1). */
  pauseSpawners: boolean;
  /** Reserved — world events not client-driven yet. */
  pauseWorldEvents: boolean;
};

export const DEFAULT_PIE_OPTIONS: PieOptions = {
  isolateShard: true,
  godMode: false,
  pauseSpawners: true,
  pauseWorldEvents: true,
};

/** True when Playtest should soft-suppress encounters/spawn step hooks. */
export function shouldPieSuppressEncounters(
  opts: PieOptions | null | undefined
): boolean {
  if (!opts) return false;
  return opts.godMode === true || opts.pauseSpawners === true;
}
