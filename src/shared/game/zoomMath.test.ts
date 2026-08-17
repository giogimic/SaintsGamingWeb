import { describe, it, expect } from 'vitest';
import {
  BASE_ORTHO_SIZE,
  STUDIO_MIN_ORTHO,
  STUDIO_MAX_ORTHO,
  GAME_MAX_ORTHO,
  ZOOM_PRESETS,
  orthoToZoomPercent,
  zoomPercentToOrtho,
  calculateFitMapOrtho,
} from './zoomMath';

describe('Zoom Math & Presets (Phase 2B)', () => {
  it('correctly maps ortho sizes to display percentages', () => {
    expect(orthoToZoomPercent(10)).toBe(100);
    expect(orthoToZoomPercent(20)).toBe(50);
    expect(orthoToZoomPercent(40)).toBe(25);
    expect(orthoToZoomPercent(5)).toBe(200);
    expect(orthoToZoomPercent(2.5)).toBe(400);
  });

  it('correctly maps zoom percentages to ortho sizes within studio limits', () => {
    expect(zoomPercentToOrtho(100)).toBe(10);
    expect(zoomPercentToOrtho(50)).toBe(20);
    expect(zoomPercentToOrtho(25)).toBe(40);
    expect(zoomPercentToOrtho(200)).toBe(5);
    expect(zoomPercentToOrtho(400)).toBe(STUDIO_MIN_ORTHO); // clamped to 3 (since 10/4 = 2.5 < 3)
  });

  it('clamps zoom within game mode limits', () => {
    const gameZoomOut = zoomPercentToOrtho(25, BASE_ORTHO_SIZE, STUDIO_MIN_ORTHO, GAME_MAX_ORTHO);
    expect(gameZoomOut).toBe(16);
  });

  it('includes standard preset levels', () => {
    expect(ZOOM_PRESETS).toEqual([25, 50, 100, 200, 400]);
  });

  it('calculates fit-map ortho correctly for standard map sizes', () => {
    const ortho = calculateFitMapOrtho(24, 24, 1, 1.6);
    expect(ortho).toBeGreaterThanOrEqual(14);
    expect(ortho).toBeLessThanOrEqual(STUDIO_MAX_ORTHO);
  });
});
