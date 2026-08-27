/**
 * Saints Gaming — Master World Audio Ambiance, Spatial Sound Triggers & Dynamic Audio Bus Mixing Engine (Bible 06, 12, 28)
 * Manages audio bus routing hierarchy, 2.5D spatial sound attenuation, stereo panning, and dynamic soundscape crossfading.
 */

export type AudioBusType =
  | 'MASTER'
  | 'BGM'
  | 'SFX'
  | 'VOICE'
  | 'AMBIANCE'
  | 'UI';

export interface BusSettings {
  volume: number; // 0.0 to 1.0
  muted: boolean;
}

export interface SpatialSoundRequest {
  sourceX: number;
  sourceY: number;
  maxRadius: number;
  falloff?: 'LINEAR' | 'LOGARITHMIC';
  baseVolume?: number;
}

export interface SpatialSoundCalculation {
  effectiveVolume: number;
  stereoPan: number; // -1.0 (left) to 1.0 (right)
  isAudible: boolean;
}

export class AudioAmbianceEngine {
  private busses: Record<AudioBusType, BusSettings> = {
    MASTER: { volume: 1.0, muted: false },
    BGM: { volume: 0.8, muted: false },
    SFX: { volume: 0.9, muted: false },
    VOICE: { volume: 1.0, muted: false },
    AMBIANCE: { volume: 0.7, muted: false },
    UI: { volume: 0.8, muted: false },
  };

  /**
   * Sets volume level for a specific audio bus.
   */
  public setBusVolume(bus: AudioBusType, volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.busses[bus].volume = clamped;
  }

  /**
   * Sets mute state for a specific audio bus.
   */
  public setBusMute(bus: AudioBusType, muted: boolean) {
    this.busses[bus].muted = muted;
  }

  /**
   * Calculates effective output gain taking into account bus volume and master bus.
   */
  public getEffectiveVolume(bus: AudioBusType): number {
    const master = this.busses.MASTER;
    if (master.muted || master.volume === 0) return 0;

    if (bus === 'MASTER') return master.volume;

    const targetBus = this.busses[bus];
    if (targetBus.muted) return 0;

    return Number((master.volume * targetBus.volume).toFixed(3));
  }

  /**
   * Computes 2.5D spatial attenuation and stereo panning relative to player coordinates.
   */
  public calculateSpatialSound(
    source: SpatialSoundRequest,
    listenerX: number,
    listenerY: number
  ): SpatialSoundCalculation {
    const dx = source.sourceX - listenerX;
    const dy = source.sourceY - listenerY;
    const distance = Math.hypot(dx, dy);

    if (distance > source.maxRadius || source.maxRadius <= 0) {
      return { effectiveVolume: 0, stereoPan: 0, isAudible: false };
    }

    const baseVol = source.baseVolume ?? 1.0;
    const ratio = distance / source.maxRadius;

    // Attenuation model
    let distanceAttenuation: number;
    if (source.falloff === 'LOGARITHMIC') {
      distanceAttenuation = Math.max(0, 1 - Math.log10(1 + 9 * ratio));
    } else {
      distanceAttenuation = Math.max(0, 1 - ratio);
    }

    const effectiveVolume = Number((baseVol * distanceAttenuation).toFixed(3));

    // Stereo panning based on horizontal displacement (max effect at maxRadius / 2)
    const panRange = source.maxRadius / 2;
    const rawPan = dx / Math.max(1, panRange);
    const stereoPan = Number(Math.max(-1, Math.min(1, rawPan)).toFixed(2));

    return {
      effectiveVolume,
      stereoPan,
      isAudible: effectiveVolume > 0,
    };
  }

  /**
   * Calculates soundscape crossfading volumes across transition progress (0.0 to 1.0).
   */
  public calculateCrossfade(
    _currentSoundscape: string,
    _targetSoundscape: string,
    progress: number
  ): { currentVolume: number; targetVolume: number } {
    const t = Math.max(0, Math.min(1, progress));
    // Equal-power crossfade curve
    const currentVolume = Number(Math.cos(t * 0.5 * Math.PI).toFixed(3));
    const targetVolume = Number(Math.sin(t * 0.5 * Math.PI).toFixed(3));

    return {
      currentVolume,
      targetVolume,
    };
  }
}
