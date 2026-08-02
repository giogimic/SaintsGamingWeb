/**
 * Soul Camera / Film capture items (demo fantasy).
 * TB-only — never on RT hotbar.
 */

export const CAPTURE_ITEM_MODIFIERS: Record<string, number> = {
  // Film tiers (canonical)
  film_standard: 1,
  film_fine: 2,
  film_soul: 255,
  // Legacy aliases (one release)
  binding_crystal: 1,
  advanced_crystal: 2,
  perfect_crystal: 255,
  capture_script: 1,
};

/** Default film thrown from TB BAG button */
export const DEFAULT_CAPTURE_ITEM = "film_standard";

export function getCaptureItemModifier(itemId: string | undefined | null): number | undefined {
  if (!itemId) return undefined;
  return CAPTURE_ITEM_MODIFIERS[itemId];
}

export function isCaptureConsumable(itemId: string): boolean {
  return itemId in CAPTURE_ITEM_MODIFIERS;
}
