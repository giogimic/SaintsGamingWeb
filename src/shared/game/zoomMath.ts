/**
 * Zoom Math & Calculations for Babylon Studio & Game Camera (Phase 2B)
 */

export const BASE_ORTHO_SIZE = 10;
export const STUDIO_MIN_ORTHO = 3;
export const STUDIO_MAX_ORTHO = 40;
export const GAME_MAX_ORTHO = 16;

export const ZOOM_PRESETS = [25, 50, 100, 200, 400] as const;

/** Convert camera orthographic size to a display percentage (100% = baseline ortho 10). */
export function orthoToZoomPercent(orthoSize: number, baseOrtho: number = BASE_ORTHO_SIZE): number {
  if (orthoSize <= 0) return 100;
  return Math.round((baseOrtho / orthoSize) * 100);
}

/** Convert a display percentage to camera orthographic size, clamped between min and max bounds. */
export function zoomPercentToOrtho(
  percent: number,
  baseOrtho: number = BASE_ORTHO_SIZE,
  minOrtho: number = STUDIO_MIN_ORTHO,
  maxOrtho: number = STUDIO_MAX_ORTHO
): number {
  const safePercent = Math.max(10, percent);
  const ortho = baseOrtho / (safePercent / 100);
  return Math.max(minOrtho, Math.min(maxOrtho, ortho));
}

/** Calculate the optimal orthographic size to fit an entire map in the camera viewport. */
export function calculateFitMapOrtho(
  mapWidthTiles: number,
  mapHeightTiles: number,
  tileSize: number = 1,
  aspectRatio: number = 1.6,
  minOrtho: number = STUDIO_MIN_ORTHO,
  maxOrtho: number = STUDIO_MAX_ORTHO
): number {
  const halfW = (mapWidthTiles * tileSize) / 2;
  const halfH = (mapHeightTiles * tileSize) / 2;
  const safeAspect = Math.max(0.1, aspectRatio);
  const targetOrtho = Math.max(halfH + 2, (halfW + 2) / safeAspect);
  return Math.max(minOrtho, Math.min(maxOrtho, targetOrtho));
}
