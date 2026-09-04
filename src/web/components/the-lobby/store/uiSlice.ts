import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG } from './types';
import { INITIAL_SKILLS } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createUiSlice: GameSlice<Pick<GameState, "gameMode" | "isMapTransitioning" | "toasts" | "toastHistory" | "clearToastHistory" | "activeDialog" | "openWindows" | "toggleWindow" | "closeWindow" | "closeAllWindows" | "getTopmostWindow" | "setGameMode" | "activeAtlasNodeId" | "setActiveAtlasNodeId" | "setIsMapTransitioning" | "setActiveDialog" | "showToast" | "removeToast">> = (set, get) => ({
gameMode: 'TITLE_SCREEN',

isMapTransitioning: false,

toasts: [],

toastHistory: [],

clearToastHistory: () => set((state) => { state.toastHistory = []; }),

activeDialog: null,

openWindows: [] as string[],

toggleWindow: (windowId) => set((state) => {
        const idx = state.openWindows.indexOf(windowId);
        if (idx >= 0) {
          state.openWindows.splice(idx, 1);
        } else {
          state.openWindows.push(windowId);
        }
      }),

closeWindow: (windowId) => set((state) => {
        const idx = state.openWindows.indexOf(windowId);
        if (idx >= 0) {
          state.openWindows.splice(idx, 1);
        }
      }),

closeAllWindows: () => set((state) => {
        state.openWindows = [];
      }),

getTopmostWindow: () => {
        const wins = get().openWindows;
        return wins.length > 0 ? wins[wins.length - 1] : null;
      },

setGameMode: (mode) => set((state) => { state.gameMode = mode; }),

activeAtlasNodeId: null,

setActiveAtlasNodeId: (id) => set({ activeAtlasNodeId: id }),

setIsMapTransitioning: (isMapTransitioning) => set({ isMapTransitioning }),

setActiveDialog: (dialog) => set((state) => { state.activeDialog = dialog; }),

showToast: (message) => {
        const id = Date.now() + Math.random();
        set((state) => {
          const newToasts = [...state.toasts, { id, message }].slice(-3); // Keep max 3
          state.toasts = newToasts;
          if (!state.toastHistory) state.toastHistory = [];
          state.toastHistory = [{ id, message, timestamp: Date.now() }, ...state.toastHistory].slice(0, 50);
        });
        setTimeout(() => {
          set((state) => {
            state.toasts = state.toasts.filter(t => t.id !== id);
          });
        }, 3000);
      },

removeToast: (id) => set((state) => {
        state.toasts = state.toasts.filter(t => t.id !== id);
      })
});
