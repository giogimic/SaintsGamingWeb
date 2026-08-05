/**
 * Camera / ground render helpers for the 2.5D Babylon lobby.
 * Pure so clamp + overlay height stay unit-tested without WebGL.
 */

/** Soft edge margin so border tiles stay in frame (was hiding north paint/avatars). */
export function cameraFocusMargin(tileSize: number): number {
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  return Math.max(s * 0.05, 0.05);
}

/**
 * Clamp camera focus to the map extent with a soft margin.
 * Margin of ~5% of a tile lets row 0 / last row stay paintable and visible.
 */
export function clampCameraFocus(
  targetX: number,
  targetZ: number,
  mapWidth: number,
  mapHeight: number,
  tileSize: number
): { x: number; z: number } {
  const s = Number.isFinite(tileSize) && tileSize > 0 ? tileSize : 1;
  const halfWidth = (mapWidth * s) / 2;
  const halfHeight = (mapHeight * s) / 2;
  const margin = cameraFocusMargin(s);

  let x = targetX;
  let z = targetZ;

  if (halfWidth > margin) {
    x = Math.max(-halfWidth + margin, Math.min(halfWidth - margin, x));
  } else {
    x = 0;
  }
  if (halfHeight > margin) {
    z = Math.max(-halfHeight + margin, Math.min(halfHeight - margin, z));
  } else {
    z = 0;
  }
  return { x, z };
}

/**
 * World Y for a live Studio paint overlay above batched layer `layerIdx`.
 * Batched layer `i` sits at `i * 0.02`. Stay inside that slot so painting
 * layer 0 is not drawn over layer 1+ art. Depth correctness vs the batched
 * ground mesh comes from tileset ALPHATEST (not from raising Y above all layers).
 */
export function paintOverlayHeight(layerIdx: number): number {
  const idx = Number.isFinite(layerIdx) ? Math.max(0, layerIdx) : 0;
  return idx * 0.02 + 0.011;
}

/** Avatar center height above the XZ ground plane (tileSize ≈ 1). */
export const ENTITY_GROUND_CLEARANCE = 1.05;
