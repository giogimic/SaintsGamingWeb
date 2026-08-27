import { describe, expect, it } from 'vitest';
import { AudioAmbianceEngine } from './audioAmbianceEngine';

describe('Master World Audio Ambiance, Spatial Sound & Dynamic Bus Mixing Engine (Phase 38)', () => {
  it('calculates multi-bus effective volumes with master attenuation and mute overrides', () => {
    const engine = new AudioAmbianceEngine();

    // Default: MASTER=1.0, BGM=0.8 -> 0.8
    expect(engine.getEffectiveVolume('BGM')).toBe(0.8);

    // 1. Lowering MASTER to 0.5 scales BGM to 0.4
    engine.setBusVolume('MASTER', 0.5);
    expect(engine.getEffectiveVolume('BGM')).toBe(0.4);

    // 2. Muting SFX yields 0
    engine.setBusMute('SFX', true);
    expect(engine.getEffectiveVolume('SFX')).toBe(0);

    // 3. Muting MASTER zeroes all busses
    engine.setBusMute('MASTER', true);
    expect(engine.getEffectiveVolume('VOICE')).toBe(0);
    expect(engine.getEffectiveVolume('AMBIANCE')).toBe(0);
  });

  it('computes 2.5D spatial sound distance falloffs and stereo panning', () => {
    const engine = new AudioAmbianceEngine();

    // Source at (100, 100), max radius 20 tiles
    // 1. Listener at (100, 100) -> 0 distance -> 1.0 vol, 0.0 pan
    const centerSound = engine.calculateSpatialSound(
      { sourceX: 100, sourceY: 100, maxRadius: 20 },
      100,
      100
    );
    expect(centerSound.effectiveVolume).toBe(1);
    expect(centerSound.stereoPan).toBe(0);
    expect(centerSound.isAudible).toBe(true);

    // 2. Listener at (90, 100) -> Source is to the RIGHT (dx = +10) -> Pan > 0
    const rightSound = engine.calculateSpatialSound(
      { sourceX: 100, sourceY: 100, maxRadius: 20 },
      90,
      100
    );
    expect(rightSound.effectiveVolume).toBe(0.5);
    expect(rightSound.stereoPan).toBe(1.0); // full right

    // 3. Listener at (150, 100) -> Distance 50 > maxRadius 20 -> Not audible
    const outOfRange = engine.calculateSpatialSound(
      { sourceX: 100, sourceY: 100, maxRadius: 20 },
      150,
      100
    );
    expect(outOfRange.effectiveVolume).toBe(0);
    expect(outOfRange.isAudible).toBe(false);
  });

  it('generates equal-power crossfade curves for dynamic soundscape transitions', () => {
    const engine = new AudioAmbianceEngine();

    // 1. At progress = 0 -> Current = 1.0, Target = 0.0
    const start = engine.calculateCrossfade('forest_ambiance', 'crypt_ambiance', 0);
    expect(start.currentVolume).toBe(1.0);
    expect(start.targetVolume).toBe(0.0);

    // 2. At progress = 0.5 -> Current ~= 0.707, Target ~= 0.707 (equal power)
    const mid = engine.calculateCrossfade('forest_ambiance', 'crypt_ambiance', 0.5);
    expect(mid.currentVolume).toBeCloseTo(0.707, 2);
    expect(mid.targetVolume).toBeCloseTo(0.707, 2);

    // 3. At progress = 1.0 -> Current = 0.0, Target = 1.0
    const end = engine.calculateCrossfade('forest_ambiance', 'crypt_ambiance', 1);
    expect(end.currentVolume).toBe(0.0);
    expect(end.targetVolume).toBe(1.0);
  });
});
