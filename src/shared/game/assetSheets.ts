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
