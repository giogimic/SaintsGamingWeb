/**
 * Saints Gaming — Dynamic Ambient Soundscape & Biome Acoustic Dispatcher (Bible 28)
 * Evaluates biome acoustic profiles, weather ambient audio layering, day/night filters, and cross-fades.
 */

export type BiomeAudioType = 'TOWN' | 'FOREST' | 'DUNGEON' | 'COASTAL' | 'MOUNTAIN' | 'VOLCANIC';
export type WeatherAudioType = 'CLEAR' | 'RAIN' | 'THUNDERSTORM' | 'SNOW' | 'FOG';
export type TimeOfDay = 'DAY' | 'NIGHT';

export interface ActiveAudioLayer {
  layerId: string;
  sourceUrl: string;
  volume: number; // 0.0 to 1.0
  loop: boolean;
}

export interface SoundscapeState {
  biome: BiomeAudioType;
  weather: WeatherAudioType;
  timeOfDay: TimeOfDay;
  activeLayers: ActiveAudioLayer[];
}

export const BIOME_AUDIO_DEFAULTS: Record<BiomeAudioType, { baseTrack: string; daySound: string; nightSound: string }> = {
  TOWN: {
    baseTrack: '/audio/ambience/town_chatter.mp3',
    daySound: '/audio/ambience/market_bustle.mp3',
    nightSound: '/audio/ambience/night_tavern.mp3',
  },
  FOREST: {
    baseTrack: '/audio/ambience/forest_wind.mp3',
    daySound: '/audio/ambience/birds_singing.mp3',
    nightSound: '/audio/ambience/crickets_chirping.mp3',
  },
  DUNGEON: {
    baseTrack: '/audio/ambience/dungeon_drips.mp3',
    daySound: '/audio/ambience/echo_wind.mp3',
    nightSound: '/audio/ambience/echo_wind.mp3',
  },
  COASTAL: {
    baseTrack: '/audio/ambience/ocean_waves.mp3',
    daySound: '/audio/ambience/seagulls.mp3',
    nightSound: '/audio/ambience/calm_tide.mp3',
  },
  MOUNTAIN: {
    baseTrack: '/audio/ambience/mountain_gale.mp3',
    daySound: '/audio/ambience/eagle_call.mp3',
    nightSound: '/audio/ambience/howling_blizzard.mp3',
  },
  VOLCANIC: {
    baseTrack: '/audio/ambience/lava_bubbles.mp3',
    daySound: '/audio/ambience/heat_rumble.mp3',
    nightSound: '/audio/ambience/heat_rumble.mp3',
  },
};

/**
 * Computes active soundscape audio layers based on environment conditions.
 */
export function evaluateSoundscape(
  biome: BiomeAudioType,
  weather: WeatherAudioType,
  timeOfDay: TimeOfDay,
  masterVolume: number = 1.0
): SoundscapeState {
  const profile = BIOME_AUDIO_DEFAULTS[biome];
  const activeLayers: ActiveAudioLayer[] = [];

  // Base biome layer
  activeLayers.push({
    layerId: `biome_base_${biome.toLowerCase()}`,
    sourceUrl: profile.baseTrack,
    volume: 0.5 * masterVolume,
    loop: true,
  });

  // Time of day specific layer
  const timeUrl = timeOfDay === 'DAY' ? profile.daySound : profile.nightSound;
  activeLayers.push({
    layerId: `biome_tod_${timeOfDay.toLowerCase()}`,
    sourceUrl: timeUrl,
    volume: 0.35 * masterVolume,
    loop: true,
  });

  // Weather overlay layers
  if (weather === 'RAIN') {
    activeLayers.push({
      layerId: 'weather_rain',
      sourceUrl: '/audio/weather/gentle_rain.mp3',
      volume: 0.6 * masterVolume,
      loop: true,
    });
  } else if (weather === 'THUNDERSTORM') {
    activeLayers.push({
      layerId: 'weather_rain_heavy',
      sourceUrl: '/audio/weather/heavy_rain.mp3',
      volume: 0.7 * masterVolume,
      loop: true,
    });
    activeLayers.push({
      layerId: 'weather_thunder',
      sourceUrl: '/audio/weather/thunder_rumble.mp3',
      volume: 0.8 * masterVolume,
      loop: true,
    });
  } else if (weather === 'SNOW') {
    activeLayers.push({
      layerId: 'weather_snow_wind',
      sourceUrl: '/audio/weather/soft_snow_wind.mp3',
      volume: 0.4 * masterVolume,
      loop: true,
    });
  }

  return {
    biome,
    weather,
    timeOfDay,
    activeLayers,
  };
}

/**
 * Calculates linearly cross-faded volume for smooth audio track transitions.
 */
export function computeCrossFadeVolume(
  startVolume: number,
  targetVolume: number,
  transitionDurationSec: number,
  elapsedSec: number
): number {
  if (transitionDurationSec <= 0) return targetVolume;
  const progress = Math.min(1.0, Math.max(0.0, elapsedSec / transitionDurationSec));
  return startVolume + (targetVolume - startVolume) * progress;
}
