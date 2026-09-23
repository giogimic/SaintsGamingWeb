import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { loadClientSettings, saveClientSettings } from '../settings/clientSettings';
import { DEFAULT_CLIENT_SETTINGS } from '../settings/clientSettingsSchema';
import { updateRuntimeSettings } from '../settings/runtimeSettingsBridge';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createClientSettingsSlice: GameSlice<Pick<GameState, "clientSettings" | "updateClientSettings" | "patchClientSettings" | "hydrateClientSettings">> = (set, get) => ({
  clientSettings: DEFAULT_CLIENT_SETTINGS,

  updateClientSettings: (settings) => set((state) => {
    state.clientSettings = settings;
    saveClientSettings(settings);
    // Push updates to runtime bridge (Renderer, audio, etc.)
    updateRuntimeSettings(settings);
  }),

  patchClientSettings: (category, partial) => set((state) => {
    if (category === 'version') return;
    // @ts-ignore
    state.clientSettings[category] = {
      ...(state.clientSettings[category] as any),
      ...(partial as any)
    };
    saveClientSettings(state.clientSettings);
    updateRuntimeSettings(state.clientSettings);
  }),

  hydrateClientSettings: () => set((state) => {
    const loaded = loadClientSettings();
    state.clientSettings = loaded;
    updateRuntimeSettings(loaded);
  }),
});
