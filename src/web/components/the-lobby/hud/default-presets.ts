import { HudLayoutPreset, DockedWidgetConfig } from './dock-types';

export const HUD_WIDGET_IDS = {
  ORBS: 'orbs',
  MINIMAP: 'minimap',
  HOTBAR: 'hotbar',
  CHAT: 'chat',
  TARGET_FRAME: 'target-frame',
  PEER_PRESENCE: 'peer-presence',
  QUEST_TRACKER: 'quest-tracker',
  CLASSIC_PANEL: 'classic-panel',
} as const;

export const WIDGET_METADATA: Record<string, { label: string; defaultZone: string; icon: string }> = {
  [HUD_WIDGET_IDS.ORBS]: {
    label: 'Player Vitals & Orbs',
    defaultZone: 'top-left',
    icon: 'Heart',
  },
  [HUD_WIDGET_IDS.TARGET_FRAME]: {
    label: 'Target Frame & Casts',
    defaultZone: 'top-center',
    icon: 'Target',
  },
  [HUD_WIDGET_IDS.PEER_PRESENCE]: {
    label: 'Peer Presence & Shard',
    defaultZone: 'top-center',
    icon: 'Users',
  },
  [HUD_WIDGET_IDS.MINIMAP]: {
    label: 'Minimap Radar',
    defaultZone: 'top-right',
    icon: 'MapPin',
  },
  [HUD_WIDGET_IDS.QUEST_TRACKER]: {
    label: 'Quest Objective Tracker',
    defaultZone: 'mid-right',
    icon: 'ScrollText',
  },
  [HUD_WIDGET_IDS.CHAT]: {
    label: 'Game Chat & Channels',
    defaultZone: 'bottom-left',
    icon: 'MessageSquare',
  },
  [HUD_WIDGET_IDS.HOTBAR]: {
    label: 'Main Action Hotbar',
    defaultZone: 'bottom-center',
    icon: 'LayoutGrid',
  },
  [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
    label: 'Classic Utility Panel (Bag/Skills)',
    defaultZone: 'bottom-right',
    icon: 'Briefcase',
  },
};

/**
 * 1. Default Modern MMO Layout
 * Balanced, ergonomic layout for standard 1080p/1440p screens
 */
export const DEFAULT_PRESET_MODERN: HudLayoutPreset = {
  id: 'preset-modern',
  name: 'Modern MMO (Default)',
  version: 1,
  description: 'Balanced layout with vitals top-left, target top-center, minimap top-right, and bottom controls.',
  isDefault: true,
  widgets: {
    [HUD_WIDGET_IDS.ORBS]: {
      widgetId: HUD_WIDGET_IDS.ORBS,
      zoneId: 'top-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.PEER_PRESENCE]: {
      widgetId: HUD_WIDGET_IDS.PEER_PRESENCE,
      zoneId: 'top-center',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.TARGET_FRAME]: {
      widgetId: HUD_WIDGET_IDS.TARGET_FRAME,
      zoneId: 'top-center',
      order: 1,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.MINIMAP]: {
      widgetId: HUD_WIDGET_IDS.MINIMAP,
      zoneId: 'top-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.QUEST_TRACKER]: {
      widgetId: HUD_WIDGET_IDS.QUEST_TRACKER,
      zoneId: 'mid-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.CHAT]: {
      widgetId: HUD_WIDGET_IDS.CHAT,
      zoneId: 'bottom-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.HOTBAR]: {
      widgetId: HUD_WIDGET_IDS.HOTBAR,
      zoneId: 'bottom-center',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
      widgetId: HUD_WIDGET_IDS.CLASSIC_PANEL,
      zoneId: 'bottom-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
  },
};

/**
 * 2. Classic RuneScape Layout
 * Right-side utility concentration with minimap, quest tracker, and inventory all docked on the right
 */
export const DEFAULT_PRESET_RUNESCAPE: HudLayoutPreset = {
  id: 'preset-runescape',
  name: 'Classic RuneScape',
  version: 1,
  description: 'Minimap, quest log, and bag tabs grouped together on the right edge, RuneScape style.',
  widgets: {
    [HUD_WIDGET_IDS.ORBS]: {
      widgetId: HUD_WIDGET_IDS.ORBS,
      zoneId: 'top-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.PEER_PRESENCE]: {
      widgetId: HUD_WIDGET_IDS.PEER_PRESENCE,
      zoneId: 'top-left',
      order: 1,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.TARGET_FRAME]: {
      widgetId: HUD_WIDGET_IDS.TARGET_FRAME,
      zoneId: 'top-center',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.MINIMAP]: {
      widgetId: HUD_WIDGET_IDS.MINIMAP,
      zoneId: 'top-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.QUEST_TRACKER]: {
      widgetId: HUD_WIDGET_IDS.QUEST_TRACKER,
      zoneId: 'mid-right',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.CHAT]: {
      widgetId: HUD_WIDGET_IDS.CHAT,
      zoneId: 'bottom-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.HOTBAR]: {
      widgetId: HUD_WIDGET_IDS.HOTBAR,
      zoneId: 'bottom-center',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
      widgetId: HUD_WIDGET_IDS.CLASSIC_PANEL,
      zoneId: 'bottom-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
  },
};

/**
 * 3. WoW Action / Combat Focused Layout
 * Centralized focus with target & player frames flanking center, larger hotbar
 */
export const DEFAULT_PRESET_WOW: HudLayoutPreset = {
  id: 'preset-wow',
  name: 'WoW Action Combat',
  version: 1,
  description: 'Centralized combat focus with target frame near center and expanded action hotbar.',
  widgets: {
    [HUD_WIDGET_IDS.ORBS]: {
      widgetId: HUD_WIDGET_IDS.ORBS,
      zoneId: 'top-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.TARGET_FRAME]: {
      widgetId: HUD_WIDGET_IDS.TARGET_FRAME,
      zoneId: 'top-center',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.PEER_PRESENCE]: {
      widgetId: HUD_WIDGET_IDS.PEER_PRESENCE,
      zoneId: 'top-center',
      order: 1,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.MINIMAP]: {
      widgetId: HUD_WIDGET_IDS.MINIMAP,
      zoneId: 'top-right',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.QUEST_TRACKER]: {
      widgetId: HUD_WIDGET_IDS.QUEST_TRACKER,
      zoneId: 'mid-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.CHAT]: {
      widgetId: HUD_WIDGET_IDS.CHAT,
      zoneId: 'bottom-left',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.HOTBAR]: {
      widgetId: HUD_WIDGET_IDS.HOTBAR,
      zoneId: 'bottom-center',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
    [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
      widgetId: HUD_WIDGET_IDS.CLASSIC_PANEL,
      zoneId: 'bottom-right',
      order: 0,
      sizeVariant: 'standard',
      visible: true,
    },
  },
};

/**
 * 4. Minimalist Streamer Layout
 * Clean, unobstructed 3D view with compact widgets tucked into corners
 */
export const DEFAULT_PRESET_MINIMAL: HudLayoutPreset = {
  id: 'preset-minimal',
  name: 'Minimalist Streamer',
  version: 1,
  description: 'Unobstructed viewport with compact widgets tucked cleanly in corners.',
  widgets: {
    [HUD_WIDGET_IDS.ORBS]: {
      widgetId: HUD_WIDGET_IDS.ORBS,
      zoneId: 'top-left',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.PEER_PRESENCE]: {
      widgetId: HUD_WIDGET_IDS.PEER_PRESENCE,
      zoneId: 'top-center',
      order: 0,
      sizeVariant: 'compact',
      visible: false,
    },
    [HUD_WIDGET_IDS.TARGET_FRAME]: {
      widgetId: HUD_WIDGET_IDS.TARGET_FRAME,
      zoneId: 'top-center',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.MINIMAP]: {
      widgetId: HUD_WIDGET_IDS.MINIMAP,
      zoneId: 'top-right',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.QUEST_TRACKER]: {
      widgetId: HUD_WIDGET_IDS.QUEST_TRACKER,
      zoneId: 'mid-right',
      order: 0,
      sizeVariant: 'compact',
      visible: false,
    },
    [HUD_WIDGET_IDS.CHAT]: {
      widgetId: HUD_WIDGET_IDS.CHAT,
      zoneId: 'bottom-left',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.HOTBAR]: {
      widgetId: HUD_WIDGET_IDS.HOTBAR,
      zoneId: 'bottom-center',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
    [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
      widgetId: HUD_WIDGET_IDS.CLASSIC_PANEL,
      zoneId: 'bottom-right',
      order: 0,
      sizeVariant: 'compact',
      visible: true,
    },
  },
};

export const BUILTIN_HUD_PRESETS: HudLayoutPreset[] = [
  DEFAULT_PRESET_MODERN,
  DEFAULT_PRESET_RUNESCAPE,
  DEFAULT_PRESET_WOW,
  DEFAULT_PRESET_MINIMAL,
];

/**
 * Validates and merges an incoming preset with default widgets to guarantee no widgets are missing
 */
export function ensureCompletePreset(preset: Partial<HudLayoutPreset> | null | undefined): HudLayoutPreset {
  const base = JSON.parse(JSON.stringify(DEFAULT_PRESET_MODERN)) as HudLayoutPreset;
  if (!preset) return base;

  const result: HudLayoutPreset = {
    id: preset.id || `preset-${Date.now()}`,
    name: preset.name || 'Custom Layout',
    version: preset.version || 1,
    description: preset.description,
    isDefault: false,
    widgets: { ...base.widgets },
  };

  if (preset.widgets) {
    for (const [id, cfg] of Object.entries(preset.widgets)) {
      if (cfg && cfg.zoneId) {
        result.widgets[id] = {
          ...base.widgets[id],
          ...cfg,
          widgetId: id,
        };
      }
    }
  }

  return result;
}
