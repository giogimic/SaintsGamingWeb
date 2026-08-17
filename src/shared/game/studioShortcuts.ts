/**
 * Studio Keyboard Shortcuts Engine (Phase 5B)
 * Pure definitions and resolver functions for single-key tool modes and actions.
 */

export type StudioToolMode = 'paint' | 'erase' | 'eyedropper' | 'select' | 'prefab' | 'gate' | 'pan' | 'paste';

export const TOOL_SHORTCUT_MAP: Record<string, StudioToolMode> = {
  b: 'paint',
  e: 'erase',
  i: 'eyedropper',
  m: 'select',
  g: 'prefab',
};

/** Resolves tool mode from single key press (case-insensitive). Returns null if not a mapped tool key. */
export function resolveToolModeFromKey(key: string): StudioToolMode | null {
  const normalized = key.toLowerCase();
  return TOOL_SHORTCUT_MAP[normalized] || null;
}

/** Check if active event target is an interactive text input where shortcuts must be bypassed. */
export function isInteractiveInputElement(target: any): boolean {
  if (!target) return false;
  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    Boolean(target.isContentEditable)
  );
}
