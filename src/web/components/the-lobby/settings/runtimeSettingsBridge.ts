import { ClientSettings } from './clientSettingsSchema';
import { soundSynth } from '@/engine/sound-synth';
import { audioAmbiance } from '@/shared/game/audio/audioAmbianceEngine';
// The bridge pushes settings down to the active runtime engines.

export function updateRuntimeSettings(settings: ClientSettings) {
  // Update Audio Synth
  if (soundSynth) {
    if (typeof soundSynth.setMasterVolume === 'function') {
      soundSynth.setMasterVolume(settings.audio.masterVolume === 0 ? 0 : settings.audio.masterVolume);
    }
  }
  
  // Update Audio Ambiance Engine
  if (audioAmbiance) {
    audioAmbiance.setBusVolume('MASTER', settings.audio.masterVolume);
    audioAmbiance.setBusMute('MASTER', settings.audio.masterVolume === 0);
    audioAmbiance.setBusVolume('BGM', settings.audio.musicVolume);
    audioAmbiance.setBusVolume('SFX', settings.audio.sfxVolume);
    audioAmbiance.setBusVolume('AMBIANCE', settings.audio.ambienceVolume);
    audioAmbiance.setBusVolume('UI', settings.audio.uiVolume);
  }

  // We will dispatch a custom event to notify BabylonEngine and Renderer.
  // This avoids circular dependencies with the store and the engine.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('client_settings_updated', { detail: settings })
    );
  }
}
