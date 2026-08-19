import { describe, it, expect } from 'vitest';
import {
  isSpritesheetAsset,
  calculateSheetGrid,
  getThumbnailFrameRect,
} from './assetSheets';

describe('Spritesheet & Grid Classification (Phase 4A)', () => {
  it('correctly identifies battle sheets, NPC sheets, and tileset sheets', () => {
    expect(isSpritesheetAsset('/game-assets/monster/battle/agnite-sheet.png')).toBe(true);
    expect(isSpritesheetAsset('/game-assets/npc/civilian_01.png')).toBe(true);
    expect(isSpritesheetAsset('/game-assets/tilesets/summer_grass.png')).toBe(true);
    expect(isSpritesheetAsset({ source: 'hero-sheet.png', tags: [] })).toBe(true);
    expect(isSpritesheetAsset({ source: 'single_icon.png', type: 'SHEET' })).toBe(true);
    expect(isSpritesheetAsset({ source: 'portrait.png', tags: ['sheet'] })).toBe(true);
  });

  it('correctly excludes single-frame front/back sprites and icons', () => {
    expect(isSpritesheetAsset('/game-assets/items/sword.png')).toBe(false);
    expect(isSpritesheetAsset('/game-assets/tuxemon/agnite-front.png')).toBe(false);
    expect(isSpritesheetAsset('/game-assets/tuxemon/agnite-face.png')).toBe(false);
  });

  it('calculates frame count for standard 4x4 or 8x8 sheets', () => {
    const lpcNpc = calculateSheetGrid(832, 1344, 64, 64);
    expect(lpcNpc.cols).toBe(13);
    expect(lpcNpc.rows).toBe(21);
    expect(lpcNpc.totalFrames).toBe(273);

    const battleSheet = calculateSheetGrid(256, 256, 64, 64);
    expect(battleSheet.cols).toBe(4);
    expect(battleSheet.rows).toBe(4);
    expect(battleSheet.totalFrames).toBe(16);
  });

  it('picks the south-facing walk frame as the thumbnail for a full LPC sheet', () => {
    const rect = getThumbnailFrameRect(832, 1344, 64, 64);
    expect(rect).toEqual({ x: 0, y: 8 * 64, width: 64, height: 64 });
  });

  it('falls back to the top-left cell when the sheet has fewer rows than the walk offset', () => {
    const rect = getThumbnailFrameRect(256, 256, 64, 64);
    expect(rect).toEqual({ x: 0, y: 0, width: 64, height: 64 });
  });

  it('returns the full image rect for single-frame (non-sheet) assets', () => {
    const rect = getThumbnailFrameRect(32, 32, 64, 64);
    expect(rect).toEqual({ x: 0, y: 0, width: 32, height: 32 });
  });
});
