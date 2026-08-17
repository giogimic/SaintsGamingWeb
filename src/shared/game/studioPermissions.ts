/**
 * Studio role gates (bible 16 §5).
 * Numeric levels match `PERMISSION_LEVELS` in `@/web/lib/permissions`
 * (ADMIN=400, DEVELOPER=1000). Kept as literals so shared/ tests stay free of web imports.
 *
 * - Player: no /studio
 * - Admin+: Studio create docks + server controls (Developers also qualify: 1000 >= 400)
 * - Developer+: engine config / class registry inside Dev Tools
 * Creator Claims sandbox whitelist remains deferred (no CREATOR level in permissions.ts).
 */

/** Mirrors editor-store PanelId — keep in sync. */
export type StudioDockId =
  | "build"
  | "properties"
  | "assets"
  | "npc"
  | "quest"
  | "dialogue"
  | "creature"
  | "loot"
  | "dev"
  | "characters"
  | "classes"
  | "items"
  | "spawner"
  | "prefab"
  | "atlas"
  | "problems"
  | "gameplay";

/** Minimum level to enter `/studio` and use create docks (= ADMIN). */
export const STUDIO_ENTRY_LEVEL = 400;

/** Map / logic-tile / asset registry writes from Studio (= ADMIN). */
export const STUDIO_CONTENT_WRITE_LEVEL = 400;

/** Dev Tools → Server Controls (= ADMIN). */
export const STUDIO_SERVER_CONTROLS_LEVEL = 400;

/** Dev Tools → Engine Config / Class Registry (= DEVELOPER). */
export const STUDIO_ENGINE_CONFIG_LEVEL = 1000;

/** Per-dock minimum levels (Admin+ today; matrix ready if Creator tier lands later). */
export const STUDIO_DOCK_MIN_LEVEL: Record<StudioDockId, number> = {
  build: STUDIO_ENTRY_LEVEL,
  properties: STUDIO_ENTRY_LEVEL,
  assets: STUDIO_ENTRY_LEVEL,
  npc: STUDIO_ENTRY_LEVEL,
  quest: STUDIO_ENTRY_LEVEL,
  dialogue: STUDIO_ENTRY_LEVEL,
  creature: STUDIO_ENTRY_LEVEL,
  loot: STUDIO_ENTRY_LEVEL,
  characters: STUDIO_ENTRY_LEVEL,
  classes: STUDIO_ENTRY_LEVEL,
  items: STUDIO_ENTRY_LEVEL,
  spawner: STUDIO_ENTRY_LEVEL,
  prefab: STUDIO_ENTRY_LEVEL,
  atlas: STUDIO_ENTRY_LEVEL,
  problems: STUDIO_ENTRY_LEVEL,
  gameplay: STUDIO_ENTRY_LEVEL,
  dev: STUDIO_SERVER_CONTROLS_LEVEL,
};

export function canEnterStudio(permissionLevel: number | null | undefined): boolean {
  return (permissionLevel ?? 0) >= STUDIO_ENTRY_LEVEL;
}

export function canUseStudioDock(
  permissionLevel: number | null | undefined,
  dock: StudioDockId
): boolean {
  const min = STUDIO_DOCK_MIN_LEVEL[dock] ?? STUDIO_ENTRY_LEVEL;
  return (permissionLevel ?? 0) >= min;
}

export function canUseStudioServerControls(permissionLevel: number | null | undefined): boolean {
  return (permissionLevel ?? 0) >= STUDIO_SERVER_CONTROLS_LEVEL;
}

export function canUseStudioEngineConfig(permissionLevel: number | null | undefined): boolean {
  return (permissionLevel ?? 0) >= STUDIO_ENGINE_CONFIG_LEVEL;
}

export function canWriteStudioContent(permissionLevel: number | null | undefined): boolean {
  return (permissionLevel ?? 0) >= STUDIO_CONTENT_WRITE_LEVEL;
}
