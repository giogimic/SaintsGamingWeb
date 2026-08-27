import { describe, expect, it } from 'vitest';
import {
  CinematicCameraEngine,
  CinematicSequence,
} from './cinematicCameraEngine';

describe('Master Cinematic Cutscene Sequences & Camera Sequencer Engine (Phase 39)', () => {
  it('computes mathematical easing functions correctly', () => {
    const engine = new CinematicCameraEngine();

    expect(engine.applyEasing(0.5, 'LINEAR')).toBe(0.5);
    expect(engine.applyEasing(0.5, 'SMOOTH_STEP')).toBe(0.5);
    expect(engine.applyEasing(0.2, 'EASE_IN_OUT')).toBeCloseTo(0.08, 2);
    expect(engine.applyEasing(0.5, 'EASE_OUT_CUBIC')).toBeCloseTo(0.875, 2);
  });

  it('interpolates camera position, FOV, and look-at targets between keyframes', () => {
    const engine = new CinematicCameraEngine();

    const kfA = {
      timestampMs: 0,
      x: 10,
      y: 20,
      z: 30,
      fov: 60,
      lookAt: { x: 0, y: 0, z: 0 },
    };

    const kfB = {
      timestampMs: 1000,
      x: 20,
      y: 40,
      z: 60,
      fov: 45,
      lookAt: { x: 10, y: 10, z: 10 },
      easing: 'LINEAR' as const,
    };

    // Midway interpolation (progress = 0.5)
    const midState = engine.interpolateKeyframes(kfA, kfB, 0.5);
    expect(midState.x).toBe(15);
    expect(midState.y).toBe(30);
    expect(midState.z).toBe(45);
    expect(midState.fov).toBe(52.5);
    expect(midState.lookAt).toEqual({ x: 5, y: 5, z: 5 });
  });

  it('executes cinematic sequence timeline playback with event dispatching and letterboxing', () => {
    const engine = new CinematicCameraEngine();

    const sequence: CinematicSequence = {
      sequenceId: 'seq_boss_intro',
      totalDurationMs: 2000,
      keyframes: [
        { timestampMs: 0, x: 0, y: 10, z: 10, fov: 60, lookAt: { x: 0, y: 0, z: 0 } },
        { timestampMs: 2000, x: 0, y: 5, z: 5, fov: 40, lookAt: { x: 0, y: 2, z: 0 } },
      ],
      events: [
        {
          id: 'evt_roar',
          timestampMs: 500,
          type: 'PLAY_SOUND',
          payload: { soundId: 'boss_roar_sfx' },
        },
        {
          id: 'evt_dialogue',
          timestampMs: 1000,
          type: 'DIALOGUE_LINE',
          payload: { speaker: 'Vampire Lord', text: 'You dare enter my sanctum?!' },
        },
      ],
    };

    // 1. Start sequence
    const state = engine.startSequence(sequence);
    expect(state.isPlaying).toBe(true);
    expect(state.isLetterboxed).toBe(true);
    expect(state.inputsSuppressed).toBe(true);

    // 2. Tick 600ms -> dispatches evt_roar
    const tick1 = engine.tick(state, sequence, 600);
    expect(tick1.newDispatchedEvents).toHaveLength(1);
    expect(tick1.newDispatchedEvents[0].id).toBe('evt_roar');

    // 3. Tick another 600ms (1200ms total) -> dispatches evt_dialogue
    const tick2 = engine.tick(state, sequence, 600);
    expect(tick2.newDispatchedEvents).toHaveLength(1);
    expect(tick2.newDispatchedEvents[0].id).toBe('evt_dialogue');

    // 4. Tick another 1000ms (2200ms total > 2000ms) -> completes sequence
    const tick3 = engine.tick(state, sequence, 1000);
    expect(tick3.state.isPlaying).toBe(false);
    expect(tick3.state.isLetterboxed).toBe(false);
    expect(tick3.state.inputsSuppressed).toBe(false);
    expect(tick3.newDispatchedEvents).toHaveLength(0);
  });
});
