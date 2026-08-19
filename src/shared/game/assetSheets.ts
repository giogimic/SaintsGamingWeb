/**
 * Spritesheet & Grid Asset Helpers (Phase 4A)
 */

export interface SheetAssetInfo {
  isSheet: boolean;
  estimatedFrames: number;
  format: 'grid' | 'strip' | 'single';
}

/** Check if an asset or path represents a multi-frame spritesheet. */
export function isSpritesheetAsset(
  assetOrPath: { source?: string; type?: string; tags?: string[] } | string
): boolean {
  if (typeof assetOrPath === 'string') {
    const p = assetOrPath.toLowerCase();
    return (
      p.includes('-sheet') ||
      p.includes('/battle/') ||
      p.includes('/npc/') ||
      p.includes('/player/') ||
      p.includes('/tilesets/') ||
      p.endsWith('_sheet.png')
    );
  }

  if (assetOrPath.type?.toUpperCase() === 'SHEET' || assetOrPath.type?.toUpperCase() === 'SPRITESHEET') {
    return true;
  }

  if (assetOrPath.tags?.some((t) => t.toLowerCase() === 'sheet' || t.toLowerCase() === 'spritesheet' || t === 'battle_sheet')) {
    return true;
  }

  if (assetOrPath.source) {
    return isSpritesheetAsset(assetOrPath.source);
  }

  return false;
}

/** Calculate frame count given sheet dimensions and cell frame dimensions. */
export function calculateSheetGrid(
  sheetWidth: number,
  sheetHeight: number,
  cellWidth: number = 64,
  cellHeight: number = 64
): { cols: number; rows: number; totalFrames: number } {
  if (sheetWidth <= 0 || sheetHeight <= 0 || cellWidth <= 0 || cellHeight <= 0) {
    return { cols: 1, rows: 1, totalFrames: 1 };
  }
  const cols = Math.floor(sheetWidth / cellWidth);
  const rows = Math.floor(sheetHeight / cellHeight);
  return {
    cols: Math.max(1, cols),
    rows: Math.max(1, rows),
    totalFrames: Math.max(1, cols * rows),
  };
}

/**
 * Universal LPC standard animation row offsets (0-indexed), matching the same
 * layout used by the external LPC review viewer (gem-web-int/script.js
 * LPC_ANIMATIONS). South-facing is column 0 within the walk row.
 */
export const LPC_STANDARD_ANIMATION_ROWS: Record<string, number> = {
  spellcast: 0,
  thrust: 4,
  walk: 8,
  slash: 12,
  shoot: 16,
  hurt: 20,
};

export interface ThumbnailFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Determines the pixel rect of a representative single frame to use as a
 * gallery thumbnail for a spritesheet, instead of squashing the whole sheet.
 * Prefers the south-facing "walk" frame on a standard LPC grid; falls back to
 * the top-left cell, and to the full image if it isn't a multi-frame sheet.
 */
export function getThumbnailFrameRect(
  sheetWidth: number,
  sheetHeight: number,
  cellWidth: number = 64,
  cellHeight: number = 64
): ThumbnailFrameRect {
  const { cols, rows } = calculateSheetGrid(sheetWidth, sheetHeight, cellWidth, cellHeight);
  if (cols <= 1 && rows <= 1) {
    return { x: 0, y: 0, width: sheetWidth || cellWidth, height: sheetHeight || cellHeight };
  }

  const walkRow = LPC_STANDARD_ANIMATION_ROWS.walk;
  const row = walkRow < rows ? walkRow : 0;
  return { x: 0, y: row * cellHeight, width: cellWidth, height: cellHeight };
}
