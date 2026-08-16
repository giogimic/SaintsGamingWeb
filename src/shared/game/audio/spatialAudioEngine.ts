/**
 * Saints Gaming — Positional Combat & SFX Sound Event Matrix (Bible 33)
 * Calculates 3D distance volume attenuation and stereo panning based on listener camera orientation.
 */

export type SoundEventType =
  | 'MELEE_HIT'
  | 'MELEE_BLOCK'
  | 'CRITICAL_HIT'
  | 'MAGIC_CAST'
  | 'MAGIC_IMPACT'
  | 'PRAYER_ACTIVATE'
  | 'LEVEL_UP'
  | 'ITEM_DROP'
  | 'TELEPORT';

export interface SoundEvent {
  id: string;
  type: SoundEventType;
  sourceX: number;
  sourceY: number;
  sourceZ?: number;
  baseVolume?: number; // 0.0 to 1.0 (defaults to 1.0)
  maxHearingDistance?: number; // In tiles (defaults to 25)
}

export interface SpatialAudioListener {
  x: number;
  y: number;
  z?: number;
  cameraAngleRad: number; // Camera yaw angle in radians (0 = facing North)
}

export const SOUND_EFFECT_MAP: Record<SoundEventType, string> = {
  MELEE_HIT: '/audio/sfx/combat/melee_hit.mp3',
  MELEE_BLOCK: '/audio/sfx/combat/melee_block.mp3',
  CRITICAL_HIT: '/audio/sfx/combat/critical_strike.mp3',
  MAGIC_CAST: '/audio/sfx/magic/spell_cast.mp3',
  MAGIC_IMPACT: '/audio/sfx/magic/spell_impact.mp3',
  PRAYER_ACTIVATE: '/audio/sfx/prayer/prayer_on.mp3',
  LEVEL_UP: '/audio/sfx/ui/level_fanfare.mp3',
  ITEM_DROP: '/audio/sfx/items/drop_sound.mp3',
  TELEPORT: '/audio/sfx/magic/teleport_whoosh.mp3',
};

/**
 * Calculates volume falloff attenuation based on Euclidean distance.
 */
export function calculateDistanceAttenuation(
  distance: number,
  maxDistance: number = 25,
  falloffExponent: number = 1.5
): number {
  if (distance <= 0) return 1.0;
  if (distance >= maxDistance) return 0.0;
  const normalized = 1.0 - distance / maxDistance;
  return Math.pow(normalized, falloffExponent);
}

/**
 * Computes stereo panning (-1.0 left to +1.0 right) relative to listener and camera yaw.
 */
export function calculateStereoPan(
  listener: SpatialAudioListener,
  soundX: number,
  soundY: number
): number {
  const dx = soundX - listener.x;
  const dy = soundY - listener.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.001) {
    return 0.0; // Directly on listener
  }

  // With +X = East, +Y = North, and camera yaw clockwise:
  // Forward vector = (sin(yaw), cos(yaw))
  // Right vector = (cos(yaw), -sin(yaw))
  const rightX = Math.cos(listener.cameraAngleRad);
  const rightY = -Math.sin(listener.cameraAngleRad);

  // Normalized direction to sound
  const dirX = dx / distance;
  const dirY = dy / distance;

  // Dot product with right vector gives horizontal panning [-1, +1]
  const pan = dirX * rightX + dirY * rightY;
  return Math.max(-1.0, Math.min(1.0, pan));
}

/**
 * Evaluates a spatial sound event for playback.
 */
export function evaluateSpatialSound(
  event: SoundEvent,
  listener: SpatialAudioListener,
  masterSfxVolume: number = 1.0
): {
  audible: boolean;
  volume: number;
  pan: number; // -1.0 to +1.0
  soundUrl: string;
} {
  const dx = event.sourceX - listener.x;
  const dy = event.sourceY - listener.y;
  const dz = (event.sourceZ ?? 0) - (listener.z ?? 0);
  const distance = Math.hypot(dx, dy, dz);

  const maxDist = event.maxHearingDistance ?? 25;
  const attenuation = calculateDistanceAttenuation(distance, maxDist);

  const baseVol = event.baseVolume ?? 1.0;
  const finalVolume = attenuation * baseVol * masterSfxVolume;

  if (finalVolume <= 0.001) {
    return {
      audible: false,
      volume: 0,
      pan: 0,
      soundUrl: SOUND_EFFECT_MAP[event.type],
    };
  }

  const pan = calculateStereoPan(listener, event.sourceX, event.sourceY);

  return {
    audible: true,
    volume: finalVolume,
    pan: Math.max(-1.0, Math.min(1.0, pan)),
    soundUrl: SOUND_EFFECT_MAP[event.type],
  };
}
