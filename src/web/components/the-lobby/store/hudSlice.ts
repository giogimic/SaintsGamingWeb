import type { StateCreator } from 'zustand';
import type { GameState } from './types';
import { DEFAULT_PRESET_MODERN, BUILTIN_HUD_PRESETS, ensureCompletePreset } from '../hud/default-presets';
import { DEFAULT_HUD_THEME_ID } from '../hud/hud-themes';
import { encodeHudPresetString, decodeHudPresetString, HudLayoutPreset } from '../hud/dock-types';
import { HUD_PRESET_STORAGE_KEY, CUSTOM_PRESETS_STORAGE_KEY, HUD_CONFIG_STORAGE_KEY, MOBILE_CONTROL_STORAGE_KEY, DEFAULT_HUD_CONFIG, HUD_THEME_STORAGE_KEY, MobileControlMode } from './types';
import { INITIAL_SKILLS } from './types';

type GameSlice<T> = StateCreator<GameState, [['zustand/immer', never]], [], T>;

export const createHudSlice: GameSlice<Pick<GameState, "isUiEditMode" | "isEditingInterface" | "uiSettings" | "uiLayoutEpoch" | "activeHudPreset" | "customHudPresets" | "hudThemeId" | "hudConfig" | "mobileControlMode" | "setMobileControlMode" | "hydrateMobileControlMode" | "setActiveHudPreset" | "moveWidgetToZone" | "setWidgetSize" | "setWidgetVisibility" | "setWidgetCollapsed" | "setWidgetTabGroup" | "saveCurrentHudPresetAs" | "deleteCustomHudPreset" | "resetHudPresetToDefault" | "exportHudPresetString" | "importHudPresetString" | "hydrateHudPresets" | "setHudTheme" | "setHudScale" | "setHudOpacity" | "updateHudConfig" | "resetHudConfig" | "hydrateHudConfig" | "setIsUiEditMode" | "setIsEditingInterface" | "updateUiSetting" | "loadUiPreset" | "resetUiLayout">> = (set, get) => ({
isUiEditMode: false,

isEditingInterface: false,

uiSettings: {},

uiLayoutEpoch: 0,

activeHudPreset: DEFAULT_PRESET_MODERN,

customHudPresets: [],

hudThemeId: DEFAULT_HUD_THEME_ID,

hudConfig: DEFAULT_HUD_CONFIG,

mobileControlMode: 'floating' as MobileControlMode,

setMobileControlMode: (mode) => set((state) => {
        state.mobileControlMode = mode;
        if (typeof window !== 'undefined') {
          localStorage.setItem(MOBILE_CONTROL_STORAGE_KEY, mode);
        }
      }),

hydrateMobileControlMode: () => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(MOBILE_CONTROL_STORAGE_KEY);
        if (stored === 'floating' || stored === 'dpad') {
          set((state) => { state.mobileControlMode = stored; });
        }
      },

setActiveHudPreset: (presetOrId) => set((state) => {
        let presetObj: import('../hud/dock-types').HudLayoutPreset | null = null;
        if (typeof presetOrId === 'string') {
          const foundBuiltin = BUILTIN_HUD_PRESETS.find((p) => p.id === presetOrId);
          const foundCustom = state.customHudPresets.find((p) => p.id === presetOrId);
          const target = foundBuiltin || foundCustom;
          if (target) {
            presetObj = ensureCompletePreset(target);
          }
        } else {
          presetObj = ensureCompletePreset(presetOrId);
        }

        if (presetObj) {
          state.activeHudPreset = presetObj;
          
          // Apply any embedded engine style overrides 
          if (presetObj.engineOverrides) {
            const overrides = presetObj.engineOverrides;
            
            state.hudConfig = {
              ...state.hudConfig,
              ...overrides,
              quickMenuButtons: overrides.quickMenuButtons 
                ? { ...state.hudConfig.quickMenuButtons, ...overrides.quickMenuButtons } as any
                : state.hudConfig.quickMenuButtons,
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(state.hudConfig));
            }
          }
        }

        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

moveWidgetToZone: (widgetId, targetZone, targetOrder) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: targetZone,
            order: 0,
            sizeVariant: 'standard',
            visible: true,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].zoneId = targetZone;
          if (typeof targetOrder === 'number') {
            state.activeHudPreset.widgets[widgetId].order = targetOrder;
          } else {
            const sameZoneCount = Object.values(state.activeHudPreset.widgets).filter(
              (w) => w.zoneId === targetZone && w.widgetId !== widgetId
            ).length;
            state.activeHudPreset.widgets[widgetId].order = sameZoneCount;
          }
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

setWidgetSize: (widgetId, size) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: 'top-left',
            order: 0,
            sizeVariant: size,
            visible: true,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].sizeVariant = size;
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

setWidgetVisibility: (widgetId, visible) => set((state) => {
        if (!state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId] = {
            widgetId,
            zoneId: 'top-left',
            order: 0,
            sizeVariant: 'standard',
            visible,
            collapsed: false,
          };
        } else {
          state.activeHudPreset.widgets[widgetId].visible = visible;
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

setWidgetCollapsed: (widgetId, collapsed) => set((state) => {
        if (state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId].collapsed = collapsed;
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
          }
        }
      }),

setWidgetTabGroup: (widgetId, tabGroup) => set((state) => {
        if (state.activeHudPreset.widgets[widgetId]) {
          state.activeHudPreset.widgets[widgetId].tabGroup = tabGroup;
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
          }
        }
      }),

saveCurrentHudPresetAs: (name) => {
        let createdPreset: HudLayoutPreset = DEFAULT_PRESET_MODERN;
        set((state) => {
          const newPreset: HudLayoutPreset = {
            id: `custom-${Date.now()}`,
            name: name.trim() || `Custom Layout ${state.customHudPresets.length + 1}`,
            version: 1,
            widgets: JSON.parse(JSON.stringify(state.activeHudPreset.widgets)),
          };
          state.customHudPresets.push(newPreset);
          state.activeHudPreset = newPreset;
          state.uiLayoutEpoch += 1;
          createdPreset = newPreset;
          if (typeof window !== 'undefined') {
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(newPreset));
          }
        });
        return createdPreset;
      },

deleteCustomHudPreset: (id) => set((state) => {
        state.customHudPresets = state.customHudPresets.filter((p) => p.id !== id);
        if (state.activeHudPreset.id === id) {
          state.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(state.activeHudPreset));
        }
      }),

resetHudPresetToDefault: () => set((state) => {
        state.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        state.uiSettings = {};
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(HUD_PRESET_STORAGE_KEY);
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }),

exportHudPresetString: () => {
        return encodeHudPresetString(get().activeHudPreset);
      },

importHudPresetString: (encoded) => {
        const decoded = decodeHudPresetString(encoded);
        if (!decoded) return false;
        const complete = ensureCompletePreset(decoded);
        set((state) => {
          state.activeHudPreset = complete;
          state.customHudPresets.push(complete);
          state.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(complete));
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(state.customHudPresets));
          }
        });
        return true;
      },

hydrateHudPresets: () => {
        if (typeof window === 'undefined') return;
        try {
          const rawCustom = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
          let loadedCustom: HudLayoutPreset[] = [];
          if (rawCustom) {
            const parsed = JSON.parse(rawCustom);
            if (Array.isArray(parsed)) {
              loadedCustom = parsed.map((p) => ensureCompletePreset(p));
            }
          }

          const rawActive = localStorage.getItem(HUD_PRESET_STORAGE_KEY);
          let loadedActive: HudLayoutPreset = DEFAULT_PRESET_MODERN;
          if (rawActive) {
            const parsed = JSON.parse(rawActive);
            loadedActive = ensureCompletePreset(parsed);
          }

          set((state) => {
            state.customHudPresets = loadedCustom;
            state.activeHudPreset = loadedActive;
          });
        } catch (err) {
          console.error('[HUD Store] Failed to hydrate presets from localStorage:', err);
        }

        // Also hydrate HUD Theme & Customizer Config
        get().hydrateHudConfig();
      },

setHudTheme: (themeId) => set((state) => {
        state.hudThemeId = themeId;
        state.hudConfig.themeId = themeId;
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_THEME_STORAGE_KEY, themeId);
          localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(state.hudConfig));
        }
      }),

setHudScale: (scale) => set((state) => {
        state.hudConfig.scale = Math.max(0.75, Math.min(1.25, scale));
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(state.hudConfig));
        }
      }),

setHudOpacity: (opacity) => set((state) => {
        state.hudConfig.opacity = Math.max(0.4, Math.min(1.0, opacity));
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(state.hudConfig));
        }
      }),

updateHudConfig: (partial) => set((state) => {
        state.hudConfig = {
          ...state.hudConfig,
          ...partial,
          quickMenuButtons: {
            ...state.hudConfig.quickMenuButtons,
            ...(partial.quickMenuButtons || {}),
          },
        };
        if (partial.themeId) {
          state.hudThemeId = partial.themeId;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_THEME_STORAGE_KEY, partial.themeId);
          }
        }
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(state.hudConfig));
        }
      }),

resetHudConfig: () => set((state) => {
        state.hudThemeId = DEFAULT_HUD_THEME_ID;
        state.hudConfig = JSON.parse(JSON.stringify(DEFAULT_HUD_CONFIG));
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(HUD_THEME_STORAGE_KEY);
          localStorage.removeItem(HUD_CONFIG_STORAGE_KEY);
        }
      }),

hydrateHudConfig: () => {
        if (typeof window === 'undefined') return;
        try {
          const storedTheme = localStorage.getItem(HUD_THEME_STORAGE_KEY);
          const storedConfig = localStorage.getItem(HUD_CONFIG_STORAGE_KEY);
          let theme = DEFAULT_HUD_THEME_ID;
          let config = JSON.parse(JSON.stringify(DEFAULT_HUD_CONFIG));
          if (storedConfig) {
            const parsed = JSON.parse(storedConfig);
            config = {
              ...DEFAULT_HUD_CONFIG,
              ...parsed,
              quickMenuButtons: {
                ...DEFAULT_HUD_CONFIG.quickMenuButtons,
                ...(parsed.quickMenuButtons || {}),
              },
            };
          }
          if (storedTheme) {
            theme = storedTheme;
            config.themeId = storedTheme;
          } else if (config.themeId) {
            theme = config.themeId;
          }
          set((state) => {
            state.hudThemeId = theme;
            state.hudConfig = config;
          });
        } catch (err) {
          console.error('[HUD Store] Failed to hydrate hudConfig from localStorage:', err);
        }
      },

setIsUiEditMode: (isEditMode) => set((state) => {
        state.isUiEditMode = isEditMode;
        state.isEditingInterface = isEditMode;
      }),

setIsEditingInterface: (isEditing) => set((state) => {
        state.isEditingInterface = isEditing;
        state.isUiEditMode = isEditing;
      }),

updateUiSetting: (id, setting) => set((state) => {
        if (!state.uiSettings[id]) {
          state.uiSettings[id] = { x: 0, y: 0, scale: 1 };
        }
        state.uiSettings[id] = { ...state.uiSettings[id], ...setting };
      }),

loadUiPreset: (presetData) => set((state) => {
        state.uiSettings = presetData;
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          Object.keys(presetData).forEach(key => {
            localStorage.setItem(`saints-ui-${key}`, JSON.stringify(presetData[key]));
          });
        }
      }),

resetUiLayout: () => set((state) => {
        state.uiSettings = {};
        state.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      })
});
