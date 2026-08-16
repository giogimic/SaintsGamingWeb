/**
 * Saints Gaming — Weather & Environmental Lighting Engine (Bible 25 & Bible 34 §5)
 * Modulates ambient lighting, fog density, particle effects, and elemental spawn modifiers.
 */

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm';
export type LightingPreset = 'day' | 'dusk' | 'night' | 'cave';

export interface EnvironmentalProfile {
  weather: WeatherType;
  lighting: LightingPreset;
  ambientColor: string; // Hex color for global illumination
  sunIntensity: number; // 0.0 to 1.0
  fogDensity: number; // 0.0 to 1.0
  particleEffect?: 'rain_drops' | 'snow_flakes' | 'fog_mist' | 'storm_lightning';
  elementalMultipliers: {
    fire: number;
    water: number;
    electric: number;
    ice: number;
    nature: number;
  };
}

/** Base lighting ambient color tables */
const LIGHTING_CONFIGS: Record<LightingPreset, { color: string; sun: number }> = {
  day: { color: '#ffffff', sun: 1.0 },
  dusk: { color: '#e89758', sun: 0.6 },
  night: { color: '#1a233a', sun: 0.15 },
  cave: { color: '#0d1117', sun: 0.05 },
};

/**
 * Computes a complete environmental profile given a map's base lighting preset and active weather.
 */
export function resolveEnvironmentalProfile(
  lighting: LightingPreset = 'day',
  weather: WeatherType = 'clear'
): EnvironmentalProfile {
  const baseLight = LIGHTING_CONFIGS[lighting] || LIGHTING_CONFIGS.day;

  let fogDensity = 0.0;
  let particleEffect: EnvironmentalProfile['particleEffect'] = undefined;
  const multipliers = { fire: 1.0, water: 1.0, electric: 1.0, ice: 1.0, nature: 1.0 };

  switch (weather) {
    case 'rain':
      fogDensity = 0.25;
      particleEffect = 'rain_drops';
      multipliers.water = 1.3;
      multipliers.fire = 0.7;
      break;

    case 'snow':
      fogDensity = 0.35;
      particleEffect = 'snow_flakes';
      multipliers.ice = 1.3;
      multipliers.fire = 0.8;
      break;

    case 'fog':
      fogDensity = 0.65;
      particleEffect = 'fog_mist';
      break;

    case 'storm':
      fogDensity = 0.45;
      particleEffect = 'storm_lightning';
      multipliers.electric = 1.4;
      multipliers.water = 1.2;
      multipliers.fire = 0.5;
      break;

    case 'clear':
    default:
      fogDensity = 0.0;
      break;
  }

  // Calculate composite sun intensity
  const weatherDimming = weather === 'storm' ? 0.5 : weather === 'rain' || weather === 'snow' ? 0.75 : 1.0;
  const finalSunIntensity = Math.max(0.05, baseLight.sun * weatherDimming);

  return {
    weather,
    lighting,
    ambientColor: baseLight.color,
    sunIntensity: finalSunIntensity,
    fogDensity,
    particleEffect,
    elementalMultipliers: multipliers,
  };
}
