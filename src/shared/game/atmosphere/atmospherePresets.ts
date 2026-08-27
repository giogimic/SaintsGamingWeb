/**
 * Saints Gaming — Atmosphere & Visual Lighting Presets (Studio Master Plan Phase 6)
 * Authoritative rendering tokens for 2.5D lighting, fog, bloom, and environmental weather overlays.
 */

export type LightingPresetKey =
  | 'DAY'
  | 'NIGHT'
  | 'DUSK'
  | 'DAWN'
  | 'DUNGEON'
  | 'BLOOD_MOON'
  | 'CYBER_NEON';

export type WeatherPresetKey =
  | 'CLEAR'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'SNOW'
  | 'BLIZZARD'
  | 'ASH_FALL'
  | 'FOG';

export interface AtmosphereLightingProfile {
  presetKey: LightingPresetKey;
  label: string;
  ambientColor: string;
  sunColor: string;
  sunIntensity: number;
  shadowIntensity: number;
  fogColor: string;
  fogDensity: number; // 0.0 to 0.05
  bloomIntensity: number; // 0.0 to 1.0
  bloomThreshold: number; // 0.0 to 1.0
}

export interface WeatherVisualProfile {
  weatherKey: WeatherPresetKey;
  label: string;
  particleCount: number;
  particleSpeed: number;
  particleColor: string;
  ambientTint: string;
  screenEffect: 'none' | 'rain_streaks' | 'snow_vignette' | 'thunder_flash' | 'fog_shroud';
}

export interface EvaluatedAtmosphere {
  lighting: AtmosphereLightingProfile;
  weather: WeatherVisualProfile;
  finalAmbientColor: string;
  finalFogDensity: number;
  finalFogColor: string;
  isNight: boolean;
}

export const ATMOSPHERE_LIGHTING_PRESETS: Record<LightingPresetKey, AtmosphereLightingProfile> = {
  DAY: {
    presetKey: 'DAY',
    label: 'Standard Daylight',
    ambientColor: '#ffffff',
    sunColor: '#fff8e7',
    sunIntensity: 1.0,
    shadowIntensity: 0.4,
    fogColor: '#cce0ff',
    fogDensity: 0.002,
    bloomIntensity: 0.2,
    bloomThreshold: 0.85,
  },
  NIGHT: {
    presetKey: 'NIGHT',
    label: 'Moonlit Night',
    ambientColor: '#2b3a55',
    sunColor: '#4a6fa5',
    sunIntensity: 0.45,
    shadowIntensity: 0.7,
    fogColor: '#0a1128',
    fogDensity: 0.008,
    bloomIntensity: 0.4,
    bloomThreshold: 0.7,
  },
  DUSK: {
    presetKey: 'DUSK',
    label: 'Golden Hour Dusk',
    ambientColor: '#ffd1a4',
    sunColor: '#ff7b54',
    sunIntensity: 0.8,
    shadowIntensity: 0.5,
    fogColor: '#8a4f7d',
    fogDensity: 0.004,
    bloomIntensity: 0.35,
    bloomThreshold: 0.75,
  },
  DAWN: {
    presetKey: 'DAWN',
    label: 'Misty Dawn',
    ambientColor: '#e0c3fc',
    sunColor: '#ffc6ff',
    sunIntensity: 0.75,
    shadowIntensity: 0.4,
    fogColor: '#dab6fc',
    fogDensity: 0.006,
    bloomIntensity: 0.3,
    bloomThreshold: 0.8,
  },
  DUNGEON: {
    presetKey: 'DUNGEON',
    label: 'Subterranean Cavern',
    ambientColor: '#1a1829',
    sunColor: '#594a42',
    sunIntensity: 0.3,
    shadowIntensity: 0.85,
    fogColor: '#0d0c13',
    fogDensity: 0.015,
    bloomIntensity: 0.5,
    bloomThreshold: 0.65,
  },
  BLOOD_MOON: {
    presetKey: 'BLOOD_MOON',
    label: 'Eclipse Blood Moon',
    ambientColor: '#591616',
    sunColor: '#ff1e1e',
    sunIntensity: 0.6,
    shadowIntensity: 0.75,
    fogColor: '#2b0707',
    fogDensity: 0.012,
    bloomIntensity: 0.65,
    bloomThreshold: 0.6,
  },
  CYBER_NEON: {
    presetKey: 'CYBER_NEON',
    label: 'Synthwave Cyber Glow',
    ambientColor: '#12002b',
    sunColor: '#00f0ff',
    sunIntensity: 0.7,
    shadowIntensity: 0.6,
    fogColor: '#1f0038',
    fogDensity: 0.007,
    bloomIntensity: 0.8,
    bloomThreshold: 0.5,
  },
};

export const WEATHER_VISUAL_PROFILES: Record<WeatherPresetKey, WeatherVisualProfile> = {
  CLEAR: {
    weatherKey: 'CLEAR',
    label: 'Clear Skies',
    particleCount: 0,
    particleSpeed: 0,
    particleColor: '#ffffff',
    ambientTint: '#ffffff',
    screenEffect: 'none',
  },
  RAIN: {
    weatherKey: 'RAIN',
    label: 'Light Rainfall',
    particleCount: 150,
    particleSpeed: 12,
    particleColor: '#a5d8ff',
    ambientTint: '#d0e1fd',
    screenEffect: 'rain_streaks',
  },
  THUNDERSTORM: {
    weatherKey: 'THUNDERSTORM',
    label: 'Heavy Thunderstorm',
    particleCount: 350,
    particleSpeed: 20,
    particleColor: '#74c0fc',
    ambientTint: '#8da4c4',
    screenEffect: 'thunder_flash',
  },
  SNOW: {
    weatherKey: 'SNOW',
    label: 'Gentle Snowfall',
    particleCount: 200,
    particleSpeed: 3,
    particleColor: '#ffffff',
    ambientTint: '#edf2f7',
    screenEffect: 'snow_vignette',
  },
  BLIZZARD: {
    weatherKey: 'BLIZZARD',
    label: 'Howling Blizzard',
    particleCount: 500,
    particleSpeed: 16,
    particleColor: '#e2e8f0',
    ambientTint: '#cbd5e1',
    screenEffect: 'snow_vignette',
  },
  ASH_FALL: {
    weatherKey: 'ASH_FALL',
    label: 'Volcanic Ashfall',
    particleCount: 180,
    particleSpeed: 4,
    particleColor: '#475569',
    ambientTint: '#fca5a5',
    screenEffect: 'fog_shroud',
  },
  FOG: {
    weatherKey: 'FOG',
    label: 'Dense Mist & Fog',
    particleCount: 80,
    particleSpeed: 1,
    particleColor: '#cbd5e1',
    ambientTint: '#94a3b8',
    screenEffect: 'fog_shroud',
  },
};

/**
 * Combines lighting preset, weather type, and time of day into resolved render parameters.
 */
export function evaluateAtmosphere(
  lightingKey?: LightingPresetKey | string,
  weatherKey?: WeatherPresetKey | string,
  timeOfDay?: 'DAY' | 'NIGHT'
): EvaluatedAtmosphere {
  const normLighting = (lightingKey || 'DAY').toUpperCase() as LightingPresetKey;
  const normWeather = (weatherKey || 'CLEAR').toUpperCase() as WeatherPresetKey;

  const lighting = ATMOSPHERE_LIGHTING_PRESETS[normLighting] || ATMOSPHERE_LIGHTING_PRESETS.DAY;
  const weather = WEATHER_VISUAL_PROFILES[normWeather] || WEATHER_VISUAL_PROFILES.CLEAR;

  const isNight = timeOfDay === 'NIGHT' || normLighting === 'NIGHT';

  // Weather increases fog density
  let finalFogDensity = lighting.fogDensity;
  if (normWeather === 'FOG') {
    finalFogDensity = Math.max(finalFogDensity, 0.02);
  } else if (normWeather === 'THUNDERSTORM' || normWeather === 'BLIZZARD') {
    finalFogDensity = Math.max(finalFogDensity, 0.012);
  } else if (normWeather === 'RAIN') {
    finalFogDensity = Math.max(finalFogDensity, 0.005);
  }

  return {
    lighting,
    weather,
    finalAmbientColor: lighting.ambientColor,
    finalFogDensity,
    finalFogColor: lighting.fogColor,
    isNight,
  };
}
