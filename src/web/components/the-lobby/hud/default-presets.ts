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
    label: 'Player Vitals & Identity',
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
    label: 'Command Center & Radar',
    defaultZone: 'top-right',
    icon: 'MapPin',
  },
  [HUD_WIDGET_IDS.QUEST_TRACKER]: {
    label: 'Quest Objective Toast',
    defaultZone: 'mid-right',
    icon: 'ScrollText',
  },
  [HUD_WIDGET_IDS.CHAT]: {
    label: 'Game Comms & Chat',
    defaultZone: 'bottom-left',
    icon: 'MessageSquare',
  },
  [HUD_WIDGET_IDS.HOTBAR]: {
    label: 'Main Action Hotbar',
    defaultZone: 'bottom-center',
    icon: 'LayoutGrid',
  },
  [HUD_WIDGET_IDS.CLASSIC_PANEL]: {
    label: 'Utility Dock (Bag/Skills)',
    defaultZone: 'bottom-right',
    icon: 'Briefcase',
  },
};

/**
 * 1. Command Center Layout (Default)
 * Balanced, ergonomic layout for standard screens
 */
export const DEFAULT_PRESET_COMMAND: HudLayoutPreset = {
  id: 'preset-command',
  name: 'Command Center (Default)',
  version: 1,
  description: 'Balanced layout with vitals top-left, target top-center, radar top-right, and bottom hotbar.',
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
 * 2. Sidebar Focus Layout
 * Right-side utility concentration with radar, quest tracker, and utility dock
 */
export const DEFAULT_PRESET_SIDEBAR: HudLayoutPreset = {
  id: 'preset-sidebar',
  name: 'Sidebar Focus',
  version: 1,
  description: 'Radar, quest tracker, and utility bag tabs grouped along the right screen edge.',
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
 * 3. Action Combat Layout
 * Centralized focus with target & player frames flanking center, prominent hotbar
 */
export const DEFAULT_PRESET_ACTION: HudLayoutPreset = {
  id: 'preset-action',
  name: 'Action Combat',
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
 * 4. Minimalist Layout
 * Clean, unobstructed 3D view with compact widgets tucked into corners
 */
export const DEFAULT_PRESET_MINIMAL: HudLayoutPreset = {
  id: 'preset-minimal',
  name: 'Minimalist',
  version: 1,
  description: 'Unobstructed viewport with compact widgets tucked cleanly in screen corners.',
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

/**
 * 5. Pocket Companion / Creature Battler Layout
 * Tailored for pet collections, companion battles, and heart vital tracking
 */
export const DEFAULT_PRESET_CREATURE: HudLayoutPreset = {
  id: 'preset-creature',
  name: 'Pocket Trainer (Creature Battler)',
  version: 1,
  description: 'Companion & creature battle setup with heart vitality gauges, prominent target cards, and quick creature dock.',
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
      sizeVariant: 'compact',
      visible: false,
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

// Presets for HUD docking modes
export const DEFAULT_PRESET_MODERN = DEFAULT_PRESET_COMMAND;
export const DEFAULT_PRESET_RETRO = DEFAULT_PRESET_SIDEBAR;
export const DEFAULT_PRESET_COMPACT = DEFAULT_PRESET_ACTION;

export const BUILTIN_HUD_PRESETS: HudLayoutPreset[] = [
  DEFAULT_PRESET_COMMAND,
  DEFAULT_PRESET_SIDEBAR,
  DEFAULT_PRESET_ACTION,
  DEFAULT_PRESET_MINIMAL,
  DEFAULT_PRESET_CREATURE,
];

/**
 * Validates and merges an incoming preset with default widgets to guarantee no widgets are missing
 */
export function ensureCompletePreset(preset: Partial<HudLayoutPreset> | null | undefined): HudLayoutPreset {
  const base = JSON.parse(JSON.stringify(DEFAULT_PRESET_COMMAND)) as HudLayoutPreset;
  if (!preset) return base;

  // Resolve legacy IDs
  let id = preset.id || `preset-${Date.now()}`;
  let name = preset.name || 'Custom Layout';
  if (id === 'preset-modern') {
    id = 'preset-command';
    name = DEFAULT_PRESET_COMMAND.name;
  } else if (id === 'preset-retro') {
    id = 'preset-sidebar';
    name = DEFAULT_PRESET_SIDEBAR.name;
  } else if (id === 'preset-compact') {
    id = 'preset-action';
    name = DEFAULT_PRESET_ACTION.name;
  }

  const result: HudLayoutPreset = {
    id,
    name,
    version: preset.version || 1,
    description: preset.description,
    isDefault: id === 'preset-command' || id === 'preset-modern',
    widgets: { ...base.widgets },
  };

  if (preset.widgets) {
    for (const [wId, cfg] of Object.entries(preset.widgets)) {
      if (cfg && cfg.zoneId) {
        result.widgets[wId] = {
          ...base.widgets[wId],
          ...cfg,
          widgetId: wId,
        };
      }
    }
  }

  return result;
}
