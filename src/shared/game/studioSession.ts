/**
 * Saints Studio session — game-engine editor runtime gates (bible 17 / 29 / 30).
 *
 * Studio is the engine development environment. The MMO play loop is a Playtest
 * viewport mode, not the owner of authoring tools.
 *
 * `isEditorMode` — client is on `/studio`.
 * `StudioRuntime` — `editor` (tools on, sim dormant) vs `playtest` (Play).
 * `isCreationMode` — legacy alias for `runtime === 'editor'` (creationActive).
 */

/** Global editor flag — set true when Studio client mounts. */
export let isEditorMode = false;

export function setEditorMode(enabled: boolean): void {
  isEditorMode = enabled;
}

export function getIsEditorMode(): boolean {
  return isEditorMode;
}

/** Engine-editor vs in-viewport playtest. */
export type StudioRuntime = "editor" | "playtest";

export type StudioGameplayGate = {
  isEditorMode: boolean;
  /** True when Studio create docks / paint tools are active (runtime === editor). */
  isCreationMode: boolean;
};

/** Derive runtime from legacy creation flag (single source in editor-store). */
export function studioRuntimeFromCreation(isCreationMode: boolean): StudioRuntime {
  return isCreationMode ? "editor" : "playtest";
}

/** Bible 29: creationActive when not in Walk/playtest. */
export function isCreationActive(gate: StudioGameplayGate): boolean {
  return gate.isEditorMode && gate.isCreationMode;
}

/**
 * Soft-disable combat, encounters, and loot pickup while authoring.
 * Playtest (`!isCreationMode`) keeps play systems on.
 */
export function shouldSuppressGameplaySystems(gate: StudioGameplayGate): boolean {
  return isCreationActive(gate);
}

/** Player HUD chrome (hotbar, orbs, chat) — hide during editor runtime. */
export function shouldShowGameplayHud(gate: StudioGameplayGate): boolean {
  if (!gate.isEditorMode) return true;
  return !gate.isCreationMode;
}

/**
 * Hard gate: player movement, interact, WASD, click-to-move, touch move.
 * True only in Studio editor runtime.
 */
export function shouldDisableGameplayInput(gate: StudioGameplayGate): boolean {
  return isCreationActive(gate);
}

/** Hide local player avatar while authoring (avatar-free editor viewport). */
export function shouldHidePlayerAvatar(gate: StudioGameplayGate): boolean {
  return isCreationActive(gate);
}

/**
 * Bible 32 PIE — private playtest room id (not the public DEMO shard).
 * Base map definition is still loaded from the authored mapId on join.
 */
export function studioPieRoomId(accountId: string): string {
  const safe = String(accountId || "anon").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return `studio_pie_${safe || "anon"}`;
}

/** Editor-only overlays must never be serialized into runtime map exports. */
export function shouldExportEditorOverlays(): boolean {
  return false;
}
