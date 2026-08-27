/**
 * Saints Gaming — Master Cinematic Cutscene Sequences, Scripted Camera Paths & Dialogue Theater Engine (Bible 02, 06, 28, 30)
 * Manages scripted camera spline interpolation, multi-track timeline event dispatching, letterboxing, and input suppression.
 */

export type EasingType = 'LINEAR' | 'EASE_IN_OUT' | 'EASE_OUT_CUBIC' | 'SMOOTH_STEP';

export interface CameraLookAt {
  x: number;
  y: number;
  z: number;
}

export interface CameraKeyframe {
  timestampMs: number;
  x: number;
  y: number;
  z: number;
  fov: number;
  lookAt: CameraLookAt;
  easing?: EasingType;
}

export type CinematicTrackEventType =
  | 'CAMERA_MOVE'
  | 'PLAY_SOUND'
  | 'FADE_SCREEN'
  | 'DIALOGUE_LINE'
  | 'ACTOR_ANIMATION';

export interface CinematicTrackEvent {
  id: string;
  timestampMs: number;
  type: CinematicTrackEventType;
  payload: Record<string, unknown>;
}

export interface CinematicSequence {
  sequenceId: string;
  totalDurationMs: number;
  keyframes: CameraKeyframe[];
  events: CinematicTrackEvent[];
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
  fov: number;
  lookAt: CameraLookAt;
}

export interface CinematicPlaybackState {
  sequenceId: string;
  currentTimestampMs: number;
  isPlaying: boolean;
  isLetterboxed: boolean;
  inputsSuppressed: boolean;
  cameraState: CameraState;
  dispatchedEventIds: Set<string>;
}

export class CinematicCameraEngine {
  /**
   * Applies mathematical easing functions to interpolation progress (0.0 to 1.0).
   */
  public applyEasing(t: number, easing: EasingType = 'LINEAR'): number {
    const clamped = Math.max(0, Math.min(1, t));
    switch (easing) {
      case 'EASE_IN_OUT':
        return clamped < 0.5
          ? 2 * clamped * clamped
          : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
      case 'EASE_OUT_CUBIC':
        return 1 - Math.pow(1 - clamped, 3);
      case 'SMOOTH_STEP':
        return clamped * clamped * (3 - 2 * clamped);
      case 'LINEAR':
      default:
        return clamped;
    }
  }

  /**
   * Interpolates between two camera keyframes with easing curves.
   */
  public interpolateKeyframes(
    kfA: CameraKeyframe,
    kfB: CameraKeyframe,
    rawProgress: number
  ): CameraState {
    const ease = kfB.easing || 'LINEAR';
    const t = this.applyEasing(rawProgress, ease);

    const lerp = (a: number, b: number) => Number((a + (b - a) * t).toFixed(3));

    return {
      x: lerp(kfA.x, kfB.x),
      y: lerp(kfA.y, kfB.y),
      z: lerp(kfA.z, kfB.z),
      fov: lerp(kfA.fov, kfB.fov),
      lookAt: {
        x: lerp(kfA.lookAt.x, kfB.lookAt.x),
        y: lerp(kfA.lookAt.y, kfB.lookAt.y),
        z: lerp(kfA.lookAt.z, kfB.lookAt.z),
      },
    };
  }

  /**
   * Begins cutscene playback, enabling letterboxing and suppressing player inputs.
   */
  public startSequence(sequence: CinematicSequence): CinematicPlaybackState {
    const initialCamera: CameraState = sequence.keyframes[0]
      ? {
          x: sequence.keyframes[0].x,
          y: sequence.keyframes[0].y,
          z: sequence.keyframes[0].z,
          fov: sequence.keyframes[0].fov,
          lookAt: { ...sequence.keyframes[0].lookAt },
        }
      : { x: 0, y: 0, z: 0, fov: 60, lookAt: { x: 0, y: 0, z: 0 } };

    return {
      sequenceId: sequence.sequenceId,
      currentTimestampMs: 0,
      isPlaying: true,
      isLetterboxed: true,
      inputsSuppressed: true,
      cameraState: initialCamera,
      dispatchedEventIds: new Set<string>(),
    };
  }

  /**
   * Advances the playback timeline, updates interpolated camera coordinates, and dispatches events.
   */
  public tick(
    state: CinematicPlaybackState,
    sequence: CinematicSequence,
    deltaMs: number
  ): { state: CinematicPlaybackState; newDispatchedEvents: CinematicTrackEvent[] } {
    if (!state.isPlaying) {
      return { state, newDispatchedEvents: [] };
    }

    state.currentTimestampMs += deltaMs;

    // Check completion
    if (state.currentTimestampMs >= sequence.totalDurationMs) {
      state.currentTimestampMs = sequence.totalDurationMs;
      state.isPlaying = false;
      state.isLetterboxed = false;
      state.inputsSuppressed = false;
    }

    // 1. Calculate camera interpolation between enclosing keyframes
    const keyframes = sequence.keyframes;
    if (keyframes.length > 0) {
      let kfA = keyframes[0];
      let kfB = keyframes[keyframes.length - 1];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (
          state.currentTimestampMs >= keyframes[i].timestampMs &&
          state.currentTimestampMs <= keyframes[i + 1].timestampMs
        ) {
          kfA = keyframes[i];
          kfB = keyframes[i + 1];
          break;
        }
      }

      const duration = Math.max(1, kfB.timestampMs - kfA.timestampMs);
      const progress = Math.max(0, Math.min(1, (state.currentTimestampMs - kfA.timestampMs) / duration));
      state.cameraState = this.interpolateKeyframes(kfA, kfB, progress);
    }

    // 2. Dispatch any timeline events that have occurred up to current timestamp
    const newDispatchedEvents: CinematicTrackEvent[] = [];
    for (const evt of sequence.events) {
      if (evt.timestampMs <= state.currentTimestampMs && !state.dispatchedEventIds.has(evt.id)) {
        state.dispatchedEventIds.add(evt.id);
        newDispatchedEvents.push(evt);
      }
    }

    return {
      state,
      newDispatchedEvents,
    };
  }
}
