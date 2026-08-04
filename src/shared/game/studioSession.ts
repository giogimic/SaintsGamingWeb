/**
 * Saints Studio session flags (bible 17).
 *
 * `isEditorMode` is true whenever the client is on `/studio`.
 * Create tools use `isCreationMode` (editor-store); Walk Mode play-tests
 * with gameplay systems re-enabled (bible 16 fun-first loop).
 *
 * Full avatar-free / no-gameplay-network Studio sessions are a later phase —
 * Phase 1 provides a clean gate without duplicating lobby vs studio shells.
 */

/** Global editor flag — set true when Studio client mounts. */
export let isEditorMode = false;

export function setEditorMode(enabled: boolean): void {
  isEditorMode = enabled;
}

export function getIsEditorMode(): boolean {
  return isEditorMode;
}

export type StudioGameplayGate = {
  isEditorMode: boolean;
  /** True when Studio create docks / paint tools are active. */
  isCreationMode: boolean;
};

/**
 * Soft-disable combat, encounters, and loot pickup while authoring.
 * Walk Mode (`!isCreationMode`) keeps play-test systems on.
 */
export function shouldSuppressGameplaySystems(gate: StudioGameplayGate): boolean {
  return gate.isEditorMode && gate.isCreationMode;
}

/** Player HUD chrome (hotbar, orbs, chat) — hide during create tools. */
export function shouldShowGameplayHud(gate: StudioGameplayGate): boolean {
  if (!gate.isEditorMode) return true;
  return !gate.isCreationMode;
}

/** Editor-only overlays must never be serialized into runtime map exports. */
export function shouldExportEditorOverlays(): boolean {
  return false;
}
