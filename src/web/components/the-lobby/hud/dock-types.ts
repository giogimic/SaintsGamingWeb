/**
 * Modular HUD Dock Zone System — Types & Codec
 * RuneScape 3 / WoW Edit Mode architecture for Saints Gaming MMO
 */

export type DockZoneId =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'mid-left'
  | 'mid-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'floating';

export type WidgetSize = 'compact' | 'standard' | 'expanded';

export interface DockZoneMeta {
  id: DockZoneId;
  label: string;
  description: string;
  cssAnchor: string;
  defaultOrientation: 'horizontal' | 'vertical' | 'tabbed';
  maxWidgets?: number;
}

export const DOCK_ZONE_DEFINITIONS: Record<DockZoneId, DockZoneMeta> = {
  'top-left': {
    id: 'top-left',
    label: 'Top Left',
    description: 'Player status, vitals, and identity plate',
    cssAnchor: 'top-4 left-4',
    defaultOrientation: 'vertical',
  },
  'top-center': {
    id: 'top-center',
    label: 'Top Center',
    description: 'Target frame, boss bars, and peer presence',
    cssAnchor: 'top-4 left-1/2 -translate-x-1/2',
    defaultOrientation: 'vertical',
  },
  'top-right': {
    id: 'top-right',
    label: 'Top Right',
    description: 'Command center, minimap radar, and coordinates',
    cssAnchor: 'top-4 right-4',
    defaultOrientation: 'vertical',
  },
  'mid-left': {
    id: 'mid-left',
    label: 'Mid Left',
    description: 'Party frame, companions, and raid rosters',
    cssAnchor: 'top-[240px] left-4',
    defaultOrientation: 'vertical',
  },
  'mid-right': {
    id: 'mid-right',
    label: 'Mid Right',
    description: 'Active quest tracker toast and task log',
    cssAnchor: 'top-[245px] right-4',
    defaultOrientation: 'vertical',
  },
  'bottom-left': {
    id: 'bottom-left',
    label: 'Bottom Left',
    description: 'Game chat, comms link, and channel tabs',
    cssAnchor: 'bottom-4 left-4',
    defaultOrientation: 'vertical',
  },
  'bottom-center': {
    id: 'bottom-center',
    label: 'Bottom Center',
    description: 'Main horizontal ability hotbar (1-5)',
    cssAnchor: 'bottom-4 left-1/2 -translate-x-1/2',
    defaultOrientation: 'horizontal',
  },
  'bottom-right': {
    id: 'bottom-right',
    label: 'Bottom Right',
    description: 'Utility icon dock (Inventory, Skills, Equipment, Quests, GTC)',
    cssAnchor: 'bottom-4 right-4',
    defaultOrientation: 'tabbed',
  },

  'floating': {
    id: 'floating',
    label: 'Center Floating',
    description: 'Modals, trade dialogue, and NPC interactions',
    cssAnchor: 'inset-0 flex items-center justify-center pointer-events-none',
    defaultOrientation: 'vertical',
  },
};

export interface DockedWidgetConfig {
  widgetId: string;
  zoneId: DockZoneId;
  order: number;
  tabGroup?: string;
  sizeVariant?: WidgetSize;
  visible: boolean;
  collapsed?: boolean;
}

export interface HudLayoutPreset {
  id: string;
  name: string;
  version: number;
  description?: string;
  isDefault?: boolean;
  widgets: Record<string, DockedWidgetConfig>;
}

export const HUD_CODEC_PREFIX = 'SG-HUD:v1:';

/**
 * Encodes a HUD layout preset into a compact shareable string (e.g. SG-HUD:v1:eyJuYW1l... )
 */
export function encodeHudPresetString(preset: HudLayoutPreset): string {
  try {
    const minified = {
      n: preset.name,
      v: preset.version || 1,
      w: Object.values(preset.widgets).map((w) => ({
        id: w.widgetId,
        z: w.zoneId,
        o: w.order,
        g: w.tabGroup,
        s: w.sizeVariant,
        v: w.visible ? 1 : 0,
        c: w.collapsed ? 1 : 0,
      })),
    };
    const json = JSON.stringify(minified);
    const b64 = typeof window !== 'undefined' ? window.btoa(json) : Buffer.from(json).toString('base64');
    return `${HUD_CODEC_PREFIX}${b64}`;
  } catch (err) {
    console.error('[HUD Codec] Failed to encode preset:', err);
    return '';
  }
}

/**
 * Decodes a shareable HUD preset string back into a valid HudLayoutPreset structure.
 */
export function decodeHudPresetString(encoded: string): HudLayoutPreset | null {
  try {
    if (!encoded || !encoded.startsWith(HUD_CODEC_PREFIX)) {
      return null;
    }
    const b64 = encoded.slice(HUD_CODEC_PREFIX.length);
    const json = typeof window !== 'undefined' ? window.atob(b64) : Buffer.from(b64, 'base64').toString('utf-8');
    const parsed = JSON.parse(json);

    if (!parsed || !Array.isArray(parsed.w)) {
      return null;
    }

    const widgets: Record<string, DockedWidgetConfig> = {};
    for (const item of parsed.w) {
      if (!item.id || !item.z) continue;
      widgets[item.id] = {
        widgetId: String(item.id),
        zoneId: item.z as DockZoneId,
        order: typeof item.o === 'number' ? item.o : 0,
        tabGroup: item.g ? String(item.g) : undefined,
        sizeVariant: item.s as WidgetSize | undefined,
        visible: item.v !== 0,
        collapsed: item.c === 1,
      };
    }

    return {
      id: `imported-${Date.now()}`,
      name: parsed.n || 'Imported Layout',
      version: parsed.v || 1,
      widgets,
    };
  } catch (err) {
    console.error('[HUD Codec] Failed to decode preset string:', err);
    return null;
  }
}
