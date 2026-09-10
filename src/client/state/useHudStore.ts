/**
 * HUD Store — Layout presets, themes, dock config, UI edit mode.
 *
 * Manages all HUD customization: widget dock positions, theme selection,
 * scale/opacity, vitals format, and the floating window manager.
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  HudLayoutPreset,
  DockZoneId,
  WidgetSize,
} from '@/web/components/the-lobby/hud/dock-types';
import {
  encodeHudPresetString,
  decodeHudPresetString,
} from '@/web/components/the-lobby/hud/dock-types';
import {
  DEFAULT_PRESET_MODERN,
  BUILTIN_HUD_PRESETS,
  ensureCompletePreset,
} from '@/web/components/the-lobby/hud/default-presets';
import {
  DEFAULT_HUD_THEME_ID,
} from '@/web/components/the-lobby/hud/hud-themes';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const HUD_PRESET_STORAGE_KEY = 'saints-hud-layout-v2';
const CUSTOM_PRESETS_STORAGE_KEY = 'saints-hud-custom-presets';
const HUD_THEME_STORAGE_KEY = 'saints-hud-theme-id';
const HUD_CONFIG_STORAGE_KEY = 'saints-hud-config-v1';
const MOBILE_CONTROL_STORAGE_KEY = 'saints-mobile-control-mode';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MobileControlMode = 'floating' | 'dpad';

export interface HudEngineConfig {
  themeId: string;
  scale: number;
  opacity: number;
  borderRadius: 'rounded' | 'compact' | 'capsule';
  borderGlow: boolean;
  vitalsFormat: 'dual-bar' | 'compact' | 'compact-stacked' | 'orbs' | 'heart-containers' | 'classic-gauge' | 'icon-bars';
  vitalsLayout: 'grouped' | 'separate';
  heartContainerCount?: number;
  minimapShape: 'rounded' | 'circle' | 'square';
  showMinimapRadar: boolean;
  showCoords: boolean;
  hotbarLayout: '1x5' | '2x5' | '1x10';
  showHotbarKeybinds: boolean;
  damageNumbersStyle: 'floating' | 'bounce' | 'pop';
  quickMenuButtons: {
    inventory: boolean;
    skills: boolean;
    equipment: boolean;
    quests: boolean;
    gtc: boolean;
    party: boolean;
    dex: boolean;
    achievements: boolean;
    studio: boolean;
  };
  performanceSpiritGates: boolean;
}

const DEFAULT_HUD_CONFIG: HudEngineConfig = {
  themeId: DEFAULT_HUD_THEME_ID,
  scale: 1,
  opacity: 0.95,
  borderRadius: 'rounded',
  borderGlow: true,
  vitalsFormat: 'dual-bar',
  vitalsLayout: 'grouped',
  minimapShape: 'rounded',
  showMinimapRadar: true,
  showCoords: true,
  hotbarLayout: '1x5',
  showHotbarKeybinds: true,
  damageNumbersStyle: 'floating',
  quickMenuButtons: {
    inventory: true,
    skills: true,
    equipment: true,
    quests: true,
    gtc: true,
    party: true,
    dex: true,
    achievements: true,
    studio: true,
  },
  performanceSpiritGates: true,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export interface HudState {
  // Edit mode
  isEditingInterface: boolean;
  isUiEditMode: boolean;
  setIsEditingInterface: (editing: boolean) => void;
  setIsUiEditMode: (editing: boolean) => void;

  // UI settings (per-widget position/scale)
  uiSettings: Record<string, { x: number; y: number; scale: number }>;
  uiLayoutEpoch: number;
  updateUiSetting: (id: string, setting: Partial<{ x: number; y: number; scale: number }>) => void;
  loadUiPreset: (presetData: Record<string, { x: number; y: number; scale: number }>) => void;
  resetUiLayout: () => void;

  // Dock presets
  activeHudPreset: HudLayoutPreset;
  customHudPresets: HudLayoutPreset[];
  setActiveHudPreset: (presetOrId: HudLayoutPreset | string) => void;
  moveWidgetToZone: (widgetId: string, targetZone: DockZoneId, targetOrder?: number) => void;
  setWidgetSize: (widgetId: string, size: WidgetSize) => void;
  setWidgetVisibility: (widgetId: string, visible: boolean) => void;
  setWidgetCollapsed: (widgetId: string, collapsed: boolean) => void;
  setWidgetTabGroup: (widgetId: string, tabGroup?: string) => void;
  saveCurrentHudPresetAs: (name: string) => HudLayoutPreset;
  deleteCustomHudPreset: (id: string) => void;
  resetHudPresetToDefault: () => void;
  exportHudPresetString: () => string;
  importHudPresetString: (encoded: string) => boolean;
  hydrateHudPresets: () => void;

  // Engine config (theme, scale, opacity, vitals format, etc.)
  hudThemeId: string;
  hudConfig: HudEngineConfig;
  setHudTheme: (themeId: string) => void;
  setHudScale: (scale: number) => void;
  setHudOpacity: (opacity: number) => void;
  updateHudConfig: (partial: Partial<HudEngineConfig>) => void;
  resetHudConfig: () => void;
  hydrateHudConfig: () => void;

  // Mobile controls
  mobileControlMode: MobileControlMode;
  setMobileControlMode: (mode: MobileControlMode) => void;
  hydrateMobileControlMode: () => void;

  // Floating windows
  openWindows: string[];
  toggleWindow: (windowId: string) => void;
  closeWindow: (windowId: string) => void;
  closeAllWindows: () => void;
  getTopmostWindow: () => string | null;
}

export const useHudStore = create<HudState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Edit mode
      isEditingInterface: false,
      isUiEditMode: false,
      setIsEditingInterface: (editing) => set((s) => {
        s.isEditingInterface = editing;
        s.isUiEditMode = editing;
      }),
      setIsUiEditMode: (editing) => set((s) => {
        s.isUiEditMode = editing;
        s.isEditingInterface = editing;
      }),

      // UI settings
      uiSettings: {},
      uiLayoutEpoch: 0,
      updateUiSetting: (id, setting) => set((s) => {
        if (!s.uiSettings[id]) s.uiSettings[id] = { x: 0, y: 0, scale: 1 };
        Object.assign(s.uiSettings[id], setting);
      }),
      loadUiPreset: (presetData) => set((s) => {
        s.uiSettings = presetData;
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          for (const [key, val] of Object.entries(presetData)) {
            localStorage.setItem(`saints-ui-${key}`, JSON.stringify(val));
          }
        }
      }),
      resetUiLayout: () => set((s) => {
        s.uiSettings = {};
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }),

      // Dock presets
      activeHudPreset: DEFAULT_PRESET_MODERN,
      customHudPresets: [],

      setActiveHudPreset: (presetOrId) => set((s) => {
        let presetObj: HudLayoutPreset | null = null;
        if (typeof presetOrId === 'string') {
          const found = BUILTIN_HUD_PRESETS.find((p) => p.id === presetOrId)
            || s.customHudPresets.find((p) => p.id === presetOrId);
          if (found) presetObj = ensureCompletePreset(found);
        } else {
          presetObj = ensureCompletePreset(presetOrId);
        }
        if (presetObj) {
          s.activeHudPreset = presetObj;
          if ((presetObj as any).engineOverrides) {
            const ov = (presetObj as any).engineOverrides;
            s.hudConfig = {
              ...s.hudConfig,
              ...ov,
              quickMenuButtons: ov.quickMenuButtons
                ? { ...s.hudConfig.quickMenuButtons, ...ov.quickMenuButtons }
                : s.hudConfig.quickMenuButtons,
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(s.hudConfig));
            }
          }
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
        }
      }),

      moveWidgetToZone: (widgetId, targetZone, targetOrder) => set((s) => {
        if (!s.activeHudPreset.widgets[widgetId]) {
          s.activeHudPreset.widgets[widgetId] = { widgetId, zoneId: targetZone, order: 0, sizeVariant: 'standard', visible: true, collapsed: false };
        } else {
          s.activeHudPreset.widgets[widgetId].zoneId = targetZone;
          if (typeof targetOrder === 'number') {
            s.activeHudPreset.widgets[widgetId].order = targetOrder;
          } else {
            const count = Object.values(s.activeHudPreset.widgets).filter((w) => w.zoneId === targetZone && w.widgetId !== widgetId).length;
            s.activeHudPreset.widgets[widgetId].order = count;
          }
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
      }),

      setWidgetSize: (widgetId, size) => set((s) => {
        if (!s.activeHudPreset.widgets[widgetId]) {
          s.activeHudPreset.widgets[widgetId] = { widgetId, zoneId: 'top-left', order: 0, sizeVariant: size, visible: true, collapsed: false };
        } else {
          s.activeHudPreset.widgets[widgetId].sizeVariant = size;
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
      }),

      setWidgetVisibility: (widgetId, visible) => set((s) => {
        if (!s.activeHudPreset.widgets[widgetId]) {
          s.activeHudPreset.widgets[widgetId] = { widgetId, zoneId: 'top-left', order: 0, sizeVariant: 'standard', visible, collapsed: false };
        } else {
          s.activeHudPreset.widgets[widgetId].visible = visible;
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
      }),

      setWidgetCollapsed: (widgetId, collapsed) => set((s) => {
        if (s.activeHudPreset.widgets[widgetId]) {
          s.activeHudPreset.widgets[widgetId].collapsed = collapsed;
          s.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
        }
      }),

      setWidgetTabGroup: (widgetId, tabGroup) => set((s) => {
        if (s.activeHudPreset.widgets[widgetId]) {
          s.activeHudPreset.widgets[widgetId].tabGroup = tabGroup;
          s.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
        }
      }),

      saveCurrentHudPresetAs: (name) => {
        let created: HudLayoutPreset = DEFAULT_PRESET_MODERN;
        set((s) => {
          const newPreset: HudLayoutPreset = {
            id: `custom-${Date.now()}`,
            name: name.trim() || `Custom Layout ${s.customHudPresets.length + 1}`,
            version: 1,
            widgets: JSON.parse(JSON.stringify(s.activeHudPreset.widgets)),
          };
          s.customHudPresets.push(newPreset);
          s.activeHudPreset = newPreset;
          s.uiLayoutEpoch += 1;
          created = newPreset;
          if (typeof window !== 'undefined') {
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(s.customHudPresets));
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(newPreset));
          }
        });
        return created;
      },

      deleteCustomHudPreset: (id) => set((s) => {
        s.customHudPresets = s.customHudPresets.filter((p) => p.id !== id);
        if (s.activeHudPreset.id === id) {
          s.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(s.customHudPresets));
          localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(s.activeHudPreset));
        }
      }),

      resetHudPresetToDefault: () => set((s) => {
        s.activeHudPreset = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN));
        s.uiSettings = {};
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(HUD_PRESET_STORAGE_KEY);
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith('saints-ui-')) keys.push(k);
          }
          keys.forEach((k) => localStorage.removeItem(k));
        }
      }),

      exportHudPresetString: () => encodeHudPresetString(get().activeHudPreset),

      importHudPresetString: (encoded) => {
        const decoded = decodeHudPresetString(encoded);
        if (!decoded) return false;
        const complete = ensureCompletePreset(decoded);
        set((s) => {
          s.activeHudPreset = complete;
          s.customHudPresets.push(complete);
          s.uiLayoutEpoch += 1;
          if (typeof window !== 'undefined') {
            localStorage.setItem(HUD_PRESET_STORAGE_KEY, JSON.stringify(complete));
            localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(s.customHudPresets));
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
            if (Array.isArray(parsed)) loadedCustom = parsed.map(ensureCompletePreset);
          }
          const rawActive = localStorage.getItem(HUD_PRESET_STORAGE_KEY);
          let loadedActive: HudLayoutPreset = DEFAULT_PRESET_MODERN;
          if (rawActive) loadedActive = ensureCompletePreset(JSON.parse(rawActive));
          set((s) => {
            s.customHudPresets = loadedCustom;
            s.activeHudPreset = loadedActive;
          });
        } catch (err) {
          console.error('[HUD Store] Failed to hydrate presets:', err);
        }
        get().hydrateHudConfig();
      },

      // Engine config
      hudThemeId: DEFAULT_HUD_THEME_ID,
      hudConfig: DEFAULT_HUD_CONFIG,

      setHudTheme: (themeId) => set((s) => {
        s.hudThemeId = themeId;
        s.hudConfig.themeId = themeId;
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') {
          localStorage.setItem(HUD_THEME_STORAGE_KEY, themeId);
          localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(s.hudConfig));
        }
      }),

      setHudScale: (scale) => set((s) => {
        s.hudConfig.scale = Math.max(0.75, Math.min(1.25, scale));
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(s.hudConfig));
      }),

      setHudOpacity: (opacity) => set((s) => {
        s.hudConfig.opacity = Math.max(0.4, Math.min(1.0, opacity));
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(s.hudConfig));
      }),

      updateHudConfig: (partial) => set((s) => {
        s.hudConfig = {
          ...s.hudConfig,
          ...partial,
          quickMenuButtons: { ...s.hudConfig.quickMenuButtons, ...(partial.quickMenuButtons || {}) },
        };
        if (partial.themeId) {
          s.hudThemeId = partial.themeId;
          if (typeof window !== 'undefined') localStorage.setItem(HUD_THEME_STORAGE_KEY, partial.themeId);
        }
        s.uiLayoutEpoch += 1;
        if (typeof window !== 'undefined') localStorage.setItem(HUD_CONFIG_STORAGE_KEY, JSON.stringify(s.hudConfig));
      }),

      resetHudConfig: () => set((s) => {
        s.hudThemeId = DEFAULT_HUD_THEME_ID;
        s.hudConfig = JSON.parse(JSON.stringify(DEFAULT_HUD_CONFIG));
        s.uiLayoutEpoch += 1;
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
            config = { ...DEFAULT_HUD_CONFIG, ...parsed, quickMenuButtons: { ...DEFAULT_HUD_CONFIG.quickMenuButtons, ...(parsed.quickMenuButtons || {}) } };
          }
          if (storedTheme) { theme = storedTheme; config.themeId = storedTheme; }
          else if (config.themeId) { theme = config.themeId; }
          set((s) => { s.hudThemeId = theme; s.hudConfig = config; });
        } catch (err) {
          console.error('[HUD Store] Failed to hydrate config:', err);
        }
      },

      // Mobile controls
      mobileControlMode: 'floating' as MobileControlMode,
      setMobileControlMode: (mode) => set((s) => {
        s.mobileControlMode = mode;
        if (typeof window !== 'undefined') localStorage.setItem(MOBILE_CONTROL_STORAGE_KEY, mode);
      }),
      hydrateMobileControlMode: () => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(MOBILE_CONTROL_STORAGE_KEY);
        if (stored === 'floating' || stored === 'dpad') {
          set((s) => { s.mobileControlMode = stored; });
        }
      },

      // Floating windows
      openWindows: [],
      toggleWindow: (windowId) => set((s) => {
        const idx = s.openWindows.indexOf(windowId);
        if (idx >= 0) s.openWindows.splice(idx, 1);
        else s.openWindows.push(windowId);
      }),
      closeWindow: (windowId) => set((s) => {
        const idx = s.openWindows.indexOf(windowId);
        if (idx >= 0) s.openWindows.splice(idx, 1);
      }),
      closeAllWindows: () => set((s) => { s.openWindows = []; }),
      getTopmostWindow: () => {
        const wins = get().openWindows;
        return wins.length > 0 ? wins[wins.length - 1] : null;
      },
    }))
  )
);
