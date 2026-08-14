import { describe, it, expect, beforeEach } from 'vitest';
import {
  encodeHudPresetString,
  decodeHudPresetString,
  HUD_CODEC_PREFIX,
  HudLayoutPreset,
} from '../dock-types';
import {
  DEFAULT_PRESET_MODERN,
  DEFAULT_PRESET_RUNESCAPE,
  DEFAULT_PRESET_WOW,
  DEFAULT_PRESET_MINIMAL,
  BUILTIN_HUD_PRESETS,
  HUD_WIDGET_IDS,
  ensureCompletePreset,
} from '../default-presets';
import { useGameStore } from '../../store';

describe('HUD Dock Presets & Codec', () => {
  it('encodes and decodes a HUD layout preset correctly', () => {
    const original = DEFAULT_PRESET_MODERN;
    const encoded = encodeHudPresetString(original);

    expect(encoded).toBeDefined();
    expect(encoded.startsWith(HUD_CODEC_PREFIX)).toBe(true);

    const decoded = decodeHudPresetString(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe(original.name);

    // Verify all widgets preserved
    for (const [id, cfg] of Object.entries(original.widgets)) {
      expect(decoded?.widgets[id]).toBeDefined();
      expect(decoded?.widgets[id].zoneId).toBe(cfg.zoneId);
      expect(decoded?.widgets[id].visible).toBe(cfg.visible);
    }
  });

  it('gracefully handles corrupted or non-HUD strings', () => {
    expect(decodeHudPresetString('')).toBeNull();
    expect(decodeHudPresetString('not-a-hud-string')).toBeNull();
    expect(decodeHudPresetString('SG-HUD:v1:corrupted-base64-content')).toBeNull();
  });

  it('ensures complete preset fills missing widget slots with defaults', () => {
    const partialPreset: Partial<HudLayoutPreset> = {
      name: 'Sparse Layout',
      widgets: {
        [HUD_WIDGET_IDS.ORBS]: {
          widgetId: HUD_WIDGET_IDS.ORBS,
          zoneId: 'bottom-center',
          order: 0,
          sizeVariant: 'compact',
          visible: true,
        },
      },
    };

    const complete = ensureCompletePreset(partialPreset);
    expect(complete.widgets[HUD_WIDGET_IDS.ORBS].zoneId).toBe('bottom-center');
    // Default widgets like minimap, chat, hotbar should be automatically filled in
    expect(complete.widgets[HUD_WIDGET_IDS.MINIMAP]).toBeDefined();
    expect(complete.widgets[HUD_WIDGET_IDS.CHAT]).toBeDefined();
    expect(complete.widgets[HUD_WIDGET_IDS.HOTBAR]).toBeDefined();
    expect(complete.widgets[HUD_WIDGET_IDS.CLASSIC_PANEL]).toBeDefined();
  });

  it('contains valid built-in presets with all standard widgets defined', () => {
    expect(BUILTIN_HUD_PRESETS.length).toBeGreaterThanOrEqual(4);

    const requiredWidgets = [
      HUD_WIDGET_IDS.ORBS,
      HUD_WIDGET_IDS.MINIMAP,
      HUD_WIDGET_IDS.HOTBAR,
      HUD_WIDGET_IDS.CHAT,
      HUD_WIDGET_IDS.TARGET_FRAME,
      HUD_WIDGET_IDS.PEER_PRESENCE,
      HUD_WIDGET_IDS.QUEST_TRACKER,
      HUD_WIDGET_IDS.CLASSIC_PANEL,
    ];

    for (const preset of BUILTIN_HUD_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      for (const widgetId of requiredWidgets) {
        expect(preset.widgets[widgetId]).toBeDefined();
        expect(preset.widgets[widgetId].zoneId).toBeDefined();
      }
    }
  });
});

describe('Zustand Store HUD Actions', () => {
  beforeEach(() => {
    useGameStore.getState().resetHudPresetToDefault();
  });

  it('moves a widget to a new dock zone', () => {
    const store = useGameStore.getState();
    expect(store.activeHudPreset.widgets[HUD_WIDGET_IDS.MINIMAP].zoneId).toBe('top-right');

    store.moveWidgetToZone(HUD_WIDGET_IDS.MINIMAP, 'top-left');

    const updated = useGameStore.getState().activeHudPreset;
    expect(updated.widgets[HUD_WIDGET_IDS.MINIMAP].zoneId).toBe('top-left');
  });

  it('sets widget size token and visibility', () => {
    const store = useGameStore.getState();
    store.setWidgetSize(HUD_WIDGET_IDS.HOTBAR, 'compact');
    store.setWidgetVisibility(HUD_WIDGET_IDS.PEER_PRESENCE, false);

    const updated = useGameStore.getState().activeHudPreset;
    expect(updated.widgets[HUD_WIDGET_IDS.HOTBAR].sizeVariant).toBe('compact');
    expect(updated.widgets[HUD_WIDGET_IDS.PEER_PRESENCE].visible).toBe(false);
  });

  it('exports and imports preset string via store', () => {
    const store = useGameStore.getState();
    store.moveWidgetToZone(HUD_WIDGET_IDS.CHAT, 'top-right');

    const code = store.exportHudPresetString();
    expect(code.startsWith(HUD_CODEC_PREFIX)).toBe(true);

    store.resetHudPresetToDefault();
    expect(useGameStore.getState().activeHudPreset.widgets[HUD_WIDGET_IDS.CHAT].zoneId).toBe(
      'bottom-left'
    );

    const imported = store.importHudPresetString(code);
    expect(imported).toBe(true);
    expect(useGameStore.getState().activeHudPreset.widgets[HUD_WIDGET_IDS.CHAT].zoneId).toBe(
      'top-right'
    );
  });
});
