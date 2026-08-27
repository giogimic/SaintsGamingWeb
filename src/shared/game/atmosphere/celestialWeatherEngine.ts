/**
 * Saints Gaming — Master World Time, Astronomical Celestial Events & Seasonal Weather Engine (Bible 02, 06, 12, 19, 27)
 * Manages synchronized realm master clocks, lunar phases, dynamic weather systems, and environmental gameplay modifiers.
 */

export type LunarPhase =
  | 'NEW_MOON'
  | 'WAXING_CRESCENT'
  | 'FIRST_QUARTER'
  | 'FULL_MOON'
  | 'WANING_GIBBOUS'
  | 'BLOOD_ECLIPSE'
  | 'SOLAR_SOLSTICE';

export type WeatherType =
  | 'CLEAR'
  | 'RAIN'
  | 'THUNDERSTORM'
  | 'BLIZZARD'
  | 'SANDSTORM'
  | 'ACID_FOG';

export interface RealmClockState {
  inGameHour: number;
  inGameMinute: number;
  dayCount: number;
  period: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';
  currentLunarPhase: LunarPhase;
  currentWeather: WeatherType;
}

export interface WeatherGameplayModifiers {
  moveSpeedMultiplier: number;
  projectileAccuracyPenalty: number;
  shadowMagicBonusPercent: number;
  holyPrayerBonusPercent: number;
  lightningHazardActive: boolean;
}

export class CelestialWeatherEngine {
  /**
   * Computes synchronized in-game realm clock from server timestamp.
   * Default time dilation: 1 real hour (3600s) = 1 in-game day (24 in-game hours).
   */
  public calculateClock(
    epochMs: number = Date.now(),
    dilationSecondsPerInGameDay: number = 3600
  ): RealmClockState {
    const totalInGameSeconds = (epochMs / 1000) * (86400 / dilationSecondsPerInGameDay);
    const dayCount = Math.floor(totalInGameSeconds / 86400);
    const secondsToday = totalInGameSeconds % 86400;

    const inGameHour = Math.floor(secondsToday / 3600);
    const inGameMinute = Math.floor((secondsToday % 3600) / 60);

    let period: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT' = 'DAY';
    if (inGameHour >= 5 && inGameHour < 8) period = 'DAWN';
    else if (inGameHour >= 8 && inGameHour < 18) period = 'DAY';
    else if (inGameHour >= 18 && inGameHour < 21) period = 'DUSK';
    else period = 'NIGHT';

    const currentLunarPhase = this.calculateLunarPhase(dayCount);
    const currentWeather = this.calculateWeather(dayCount, inGameHour);

    return {
      inGameHour,
      inGameMinute,
      dayCount,
      period,
      currentLunarPhase,
      currentWeather,
    };
  }

  /**
   * Computes lunar phase based on in-game day progression.
   */
  public calculateLunarPhase(dayCount: number): LunarPhase {
    const cycleDay = dayCount % 28; // 28-day lunar cycle

    if (cycleDay === 0) return 'NEW_MOON';
    if (cycleDay === 7) return 'FIRST_QUARTER';
    if (cycleDay === 14) return 'FULL_MOON';
    if (cycleDay === 21) return 'WANING_GIBBOUS';
    if (cycleDay === 27) return 'BLOOD_ECLIPSE';
    if (cycleDay === 13) return 'SOLAR_SOLSTICE';

    return cycleDay < 14 ? 'WAXING_CRESCENT' : 'WANING_GIBBOUS';
  }

  /**
   * Computes deterministic regional weather type.
   */
  public calculateWeather(dayCount: number, inGameHour: number): WeatherType {
    const seed = (dayCount * 24 + inGameHour) % 100;
    if (seed < 40) return 'CLEAR';
    if (seed < 65) return 'RAIN';
    if (seed < 80) return 'THUNDERSTORM';
    if (seed < 90) return 'BLIZZARD';
    if (seed < 95) return 'SANDSTORM';
    return 'ACID_FOG';
  }

  /**
   * Calculates gameplay combat and movement modifiers for active atmosphere.
   */
  public calculateModifiers(
    lunarPhase: LunarPhase,
    weather: WeatherType
  ): WeatherGameplayModifiers {
    let moveSpeedMultiplier = 1.0;
    let projectileAccuracyPenalty = 0;
    let shadowMagicBonusPercent = 0;
    let holyPrayerBonusPercent = 0;
    let lightningHazardActive = false;

    // Weather Effects
    switch (weather) {
      case 'RAIN':
        moveSpeedMultiplier = 0.95;
        break;
      case 'THUNDERSTORM':
        moveSpeedMultiplier = 0.9;
        projectileAccuracyPenalty = 10;
        lightningHazardActive = true;
        break;
      case 'BLIZZARD':
        moveSpeedMultiplier = 0.8;
        projectileAccuracyPenalty = 20;
        break;
      case 'SANDSTORM':
        moveSpeedMultiplier = 0.85;
        projectileAccuracyPenalty = 25;
        break;
      case 'ACID_FOG':
        moveSpeedMultiplier = 0.85;
        break;
      default:
        break;
    }

    // Celestial Lunar Modifiers
    if (lunarPhase === 'BLOOD_ECLIPSE') {
      shadowMagicBonusPercent = 25;
    } else if (lunarPhase === 'FULL_MOON') {
      shadowMagicBonusPercent = 10;
    } else if (lunarPhase === 'SOLAR_SOLSTICE') {
      holyPrayerBonusPercent = 25;
    }

    return {
      moveSpeedMultiplier,
      projectileAccuracyPenalty,
      shadowMagicBonusPercent,
      holyPrayerBonusPercent,
      lightningHazardActive,
    };
  }
}
