import { describe, it, expect } from 'vitest';
import {
  calculateDistanceAttenuation,
  calculateStereoPan,
  evaluateSpatialSound,
  SpatialAudioListener,
  SoundEvent,
} from './spatialAudioEngine';

describe('Positional Combat & SFX Sound Event Matrix (Bible 33)', () => {
  const listener: SpatialAudioListener = {
    x: 10,
    y: 10,
    cameraAngleRad: 0, // Facing North (+Y)
  };

  it('calculates distance attenuation accurately with falloff', () => {
    // Zero distance -> 1.0
    expect(calculateDistanceAttenuation(0, 25)).toBe(1.0);
    // Half distance -> (1 - 0.5)^1.5 = 0.3535
    expect(calculateDistanceAttenuation(12.5, 25)).toBeCloseTo(0.3535, 2);
    // Beyond max distance -> 0.0
    expect(calculateDistanceAttenuation(30, 25)).toBe(0.0);
  });

  it('calculates stereo panning based on listener camera orientation', () => {
    // Sound directly to the right (+X) when facing North (yaw = 0):
    // right vector = (1, 0), dir = (1, 0) -> pan = +1.0
    const panRight = calculateStereoPan(listener, 20, 10);
    expect(panRight).toBeCloseTo(1.0, 2);

    // Sound directly to the left (-X) when facing North (yaw = 0):
    // right vector = (1, 0), dir = (-1, 0) -> pan = -1.0
    const panLeft = calculateStereoPan(listener, 0, 10);
    expect(panLeft).toBeCloseTo(-1.0, 2);

    // Sound directly in front (+Y) -> pan = 0.0
    const panFront = calculateStereoPan(listener, 10, 20);
    expect(panFront).toBeCloseTo(0.0, 2);
  });

  it('evaluates spatial sound playback with attenuation, panning, and clip lookup', () => {
    const event: SoundEvent = {
      id: 'sfx_1',
      type: 'MELEE_HIT',
      sourceX: 10,
      sourceY: 10,
      baseVolume: 0.8,
    };

    const result = evaluateSpatialSound(event, listener, 1.0);
    expect(result.audible).toBe(true);
    expect(result.volume).toBe(0.8);
    expect(result.soundUrl).toBe('/audio/sfx/combat/melee_hit.mp3');
  });

  it('marks sounds beyond maximum hearing distance as inaudible', () => {
    const farEvent: SoundEvent = {
      id: 'sfx_far',
      type: 'TELEPORT',
      sourceX: 100,
      sourceY: 100,
      maxHearingDistance: 20,
    };

    const result = evaluateSpatialSound(farEvent, listener);
    expect(result.audible).toBe(false);
    expect(result.volume).toBe(0);
  });
});
