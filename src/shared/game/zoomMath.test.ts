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
    expect(zoomPercentToOrtho(400)).toBe(STUDIO_MIN_ORTHO);
  });

  it('clamps zoom within game mode limits', () => {
    const gameZoomOut = zoomPercentToOrtho(25, BASE_ORTHO_SIZE, STUDIO_MIN_ORTHO, GAME_MAX_ORTHO);
    expect(gameZoomOut).toBe(16);
  });

  it('includes standard preset levels including 15%', () => {
    expect(ZOOM_PRESETS).toEqual([15, 25, 50, 100, 200, 400]);
  });

  it('calculates fit-map ortho correctly for standard and large map sizes', () => {
    const ortho24 = calculateFitMapOrtho(24, 24, 1, 1.6);
    expect(ortho24).toBeGreaterThanOrEqual(14);
    expect(ortho24).toBeLessThanOrEqual(STUDIO_MAX_ORTHO);

    const ortho64 = calculateFitMapOrtho(64, 64, 1, 1.6);
    expect(ortho64).toBeGreaterThanOrEqual(34);
    expect(ortho64).toBeLessThanOrEqual(STUDIO_MAX_ORTHO);

    const ortho128 = calculateFitMapOrtho(128, 128, 1, 1.6);
    expect(ortho128).toBeGreaterThanOrEqual(66);
    expect(ortho128).toBeLessThanOrEqual(STUDIO_MAX_ORTHO);
  });
});
