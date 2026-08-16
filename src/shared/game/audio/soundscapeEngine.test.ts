import { describe, it, expect } from 'vitest';
import {
  evaluateSoundscape,
  computeCrossFadeVolume,
} from './soundscapeEngine';

describe('Dynamic Ambient Soundscape & Biome Acoustic Dispatcher (Bible 28)', () => {
  it('evaluates forest daytime soundscape with clear weather', () => {
    const soundscape = evaluateSoundscape('FOREST', 'CLEAR', 'DAY', 1.0);

    expect(soundscape.biome).toBe('FOREST');
    expect(soundscape.activeLayers.length).toBe(2); // Base wind + day birds
    expect(soundscape.activeLayers[0].sourceUrl).toContain('forest_wind.mp3');
    expect(soundscape.activeLayers[1].sourceUrl).toContain('birds_singing.mp3');
  });

  it('layers heavy rain and thunder during a thunderstorm at night', () => {
    const soundscape = evaluateSoundscape('COASTAL', 'THUNDERSTORM', 'NIGHT', 0.8);

    expect(soundscape.activeLayers.length).toBe(4); // Base waves + night calm tide + heavy rain + thunder
    const layerIds = soundscape.activeLayers.map((l) => l.layerId);
    expect(layerIds).toContain('biome_base_coastal');
    expect(layerIds).toContain('biome_tod_night');
    expect(layerIds).toContain('weather_rain_heavy');
    expect(layerIds).toContain('weather_thunder');
  });

  it('interpolates cross-fade volumes accurately across elapsed transition time', () => {
    // Fading from 0.0 to 1.0 over 10 seconds
    expect(computeCrossFadeVolume(0.0, 1.0, 10, 0)).toBe(0.0);
    expect(computeCrossFadeVolume(0.0, 1.0, 10, 5)).toBe(0.5);
    expect(computeCrossFadeVolume(0.0, 1.0, 10, 10)).toBe(1.0);
    expect(computeCrossFadeVolume(0.0, 1.0, 10, 15)).toBe(1.0); // Clamped at 1.0
  });
});
