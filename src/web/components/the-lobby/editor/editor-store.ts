import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_WORLD_PROFILE_ID } from '@/shared/game/worldProfiles';
import { DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import {
  STUDIO_DOCK_META,
  STUDIO_MODE_DEFAULTS,
  STUDIO_MODE_META,
  type StudioMode,
} from '@/shared/game/studioModes';
import {
  extractPanelLayouts,
  loadPanelLayoutsFromStorage,
  mergePanelLayouts,
  savePanelLayoutsToStorage,
} from '@/shared/game/studioPanelLayout';

export type PanelId = 'build' | 'properties' | 'assets' | 'npc' | 'quest' | 'dialogue' | 'creature' | 'loot' | 'dev' | 'characters' | 'classes';

export type { StudioMode };
export { STUDIO_MODE_DEFAULTS, STUDIO_MODE_META, STUDIO_DOCK_META };

export interface FloatingPanelState {
  id: PanelId;
  title: string;
  isOpen: boolean;
  isCollapsed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface EditorState {
  isCreationMode: boolean;
  /** Active Studio world profile (WorldMap.gameId / QuestTemplate.gameId). */
  activeGameId: string;
  studioMode: StudioMode;
  panels: Record<PanelId, FloatingPanelState>;
  activePanel: PanelId | null;
  highestZIndex: number;
  /** True after localStorage layout hydrate (client-only). */
  panelLayoutsHydrated: boolean;
  /** Unsaved paint / map edits since last Save Map. */
  mapDirty: boolean;

  // Editor Tools State
  activeBrushTileId: number;
  activeLayerIdx: number;
  clickedTile: { r: number; c: number } | null;
  /** Last painted cell — shown in the paint HUD. */
  lastPaintedTile: { r: number; c: number } | null;

  // Actions
  setActiveGameId: (id: string) => void;
  toggleCreationMode: () => void;
  /** Walk Mode — play-test only; create tools off. */
  enterWalkMode: () => void;
  /** Development Mode — default Studio entry with World + Inspector open. */
  enterDevelopmentMode: () => void;
  setStudioMode: (mode: StudioMode) => void;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  togglePanel: (id: PanelId) => void;
  toggleCollapse: (id: PanelId) => void;
  updatePanelPosition: (id: PanelId, x: number, y: number) => void;
  updatePanelSize: (id: PanelId, width: number, height: number) => void;
  bringToFront: (id: PanelId) => void;
  /** Load persisted dock geometry (x/y/w/h/collapse). Does not restore isOpen. */
  hydratePanelLayouts: () => void;

  setActiveBrushTileId: (id: number) => void;
  setActiveLayerIdx: (idx: number) => void;
  setClickedTile: (tile: { r: number; c: number } | null) => void;
  setLastPaintedTile: (tile: { r: number; c: number } | null) => void;
  markMapDirty: () => void;
  clearMapDirty: () => void;
}

const DEFAULT_PANELS: Record<PanelId, FloatingPanelState> = {
  build: {
    id: 'build',
    title: 'World Builder',
    isOpen: false,
    isCollapsed: false,
    x: 20,
    y: 20,
    width: 340,
    height: 620,
    zIndex: 10,
  },
  properties: {
    id: 'properties',
    title: 'Inspector',
    isOpen: false,
    isCollapsed: false,
    x: 900,
    y: 20,
    width: 360,
    height: 700,
    zIndex: 10,
  },
  assets: {
    id: 'assets',
    title: 'Asset Manager',
    isOpen: false,
    isCollapsed: false,
    x: 360,
    y: 20,
    width: 800,
    height: 500,
    zIndex: 10,
  },
  npc: {
    id: 'npc',
    title: 'NPC Editor',
    isOpen: false,
    isCollapsed: false,
    x: 100,
    y: 100,
    width: 400,
    height: 500,
    zIndex: 10,
  },
  quest: {
    id: 'quest',
    title: 'Quest Editor',
    isOpen: false,
    isCollapsed: false,
    x: 150,
    y: 150,
    width: 720,
    height: 560,
    zIndex: 10,
  },
  dialogue: {
    id: 'dialogue',
    title: 'Dialogue Editor',
    isOpen: false,
    isCollapsed: false,
    x: 180,
    y: 80,
    width: 860,
    height: 620,
    zIndex: 10,
  },
  creature: {
    id: 'creature',
    title: 'Creature Catalog',
    isOpen: false,
    isCollapsed: false,
    x: 480,
    y: 60,
    width: 780,
    height: 680,
    zIndex: 10,
  },
  loot: {
    id: 'loot',
    title: 'Loot Manager',
    isOpen: false,
    isCollapsed: false,
    x: 420,
    y: 80,
    width: 760,
    height: 640,
    zIndex: 10,
  },
  dev: {
    id: 'dev',
    title: 'Dev Tools',
    isOpen: false,
    isCollapsed: false,
    x: 20,
    y: 640,
    width: 600,
    height: 300,
    zIndex: 10,
  },
  characters: {
    id: 'characters',
    title: 'Starter Heroes',
    isOpen: false,
    isCollapsed: false,
    x: 560,
    y: 80,
    width: 720,
    height: 640,
    zIndex: 10,
  },
  classes: {
    id: 'classes',
    title: 'Classes & Skills',
    isOpen: false,
    isCollapsed: false,
    x: 200,
    y: 40,
    width: 820,
    height: 700,
    zIndex: 10,
  },
};

function closeAllPanels(state: { panels: Record<PanelId, FloatingPanelState>; activePanel: PanelId | null }) {
  (Object.keys(state.panels) as PanelId[]).forEach((k) => {
    state.panels[k].isOpen = false;
  });
  state.activePanel = null;
}

function openModePanels(
  state: {
    panels: Record<PanelId, FloatingPanelState>;
    activePanel: PanelId | null;
    highestZIndex: number;
  },
  mode: StudioMode
) {
  closeAllPanels(state);
  const defaults = STUDIO_MODE_DEFAULTS[mode] || [];
  for (const id of defaults) {
    state.panels[id].isOpen = true;
    state.highestZIndex += 1;
    state.panels[id].zIndex = state.highestZIndex;
    state.activePanel = id;
  }
}

function persistLayouts(get: () => EditorState) {
  savePanelLayoutsToStorage(get().panels);
}

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      isCreationMode: true,
      activeGameId: DEFAULT_WORLD_PROFILE_ID,
      studioMode: 'develop',
      panels: DEFAULT_PANELS,
      activePanel: null,
      highestZIndex: 10,
      panelLayoutsHydrated: false,
      mapDirty: false,
      activeBrushTileId: DEFAULT_STUDIO_GROUND_GID,
      activeLayerIdx: 0,
      clickedTile: null,
      lastPaintedTile: null,

      setActiveGameId: (id) =>
        set((state) => {
          state.activeGameId = id;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('saints.activeGameId', id);
          }
        }),

      toggleCreationMode: () =>
        set((state) => {
          state.isCreationMode = !state.isCreationMode;
          if (state.isCreationMode) {
            state.studioMode = 'develop';
            openModePanels(state, 'develop');
          } else {
            state.studioMode = 'test';
            closeAllPanels(state);
          }
        }),

      enterWalkMode: () =>
        set((state) => {
          state.isCreationMode = false;
          state.studioMode = 'test';
          closeAllPanels(state);
        }),

      enterDevelopmentMode: () =>
        set((state) => {
          state.isCreationMode = true;
          state.studioMode = 'develop';
          openModePanels(state, 'develop');
        }),

      setStudioMode: (mode) =>
        set((state) => {
          state.studioMode = mode;
          if (mode === 'test') {
            state.isCreationMode = false;
            closeAllPanels(state);
            return;
          }
          state.isCreationMode = true;
          openModePanels(state, mode);
        }),

      openPanel: (id) =>
        set((state) => {
          state.panels[id].isOpen = true;
          state.highestZIndex += 1;
          state.panels[id].zIndex = state.highestZIndex;
          state.activePanel = id;
        }),

      closePanel: (id) =>
        set((state) => {
          state.panels[id].isOpen = false;
          if (state.activePanel === id) state.activePanel = null;
        }),

      togglePanel: (id) =>
        set((state) => {
          const isOpen = state.panels[id].isOpen;
          if (isOpen) {
            state.panels[id].isOpen = false;
            if (state.activePanel === id) state.activePanel = null;
          } else {
            state.panels[id].isOpen = true;
            state.highestZIndex += 1;
            state.panels[id].zIndex = state.highestZIndex;
            state.activePanel = id;
          }
        }),

      toggleCollapse: (id) => {
        set((state) => {
          state.panels[id].isCollapsed = !state.panels[id].isCollapsed;
        });
        persistLayouts(get);
      },

      updatePanelPosition: (id, x, y) => {
        set((state) => {
          state.panels[id].x = x;
          state.panels[id].y = y;
        });
        persistLayouts(get);
      },

      updatePanelSize: (id, width, height) => {
        set((state) => {
          state.panels[id].width = width;
          state.panels[id].height = height;
        });
        persistLayouts(get);
      },

      bringToFront: (id) =>
        set((state) => {
          if (state.panels[id].zIndex !== state.highestZIndex) {
            state.highestZIndex += 1;
            state.panels[id].zIndex = state.highestZIndex;
            state.activePanel = id;
          }
        }),

      hydratePanelLayouts: () =>
        set((state) => {
          if (typeof window === 'undefined') return;
          const saved = loadPanelLayoutsFromStorage();
          const merged = mergePanelLayouts(
            state.panels,
            saved ?? extractPanelLayouts(state.panels),
            window.innerWidth,
            window.innerHeight
          );
          (Object.keys(merged) as PanelId[]).forEach((id) => {
            state.panels[id].x = merged[id].x;
            state.panels[id].y = merged[id].y;
            state.panels[id].width = merged[id].width;
            state.panels[id].height = merged[id].height;
            state.panels[id].isCollapsed = merged[id].isCollapsed;
          });
          state.panelLayoutsHydrated = true;
        }),

      setActiveBrushTileId: (id) =>
        set((state) => {
          state.activeBrushTileId = id;
        }),
      setActiveLayerIdx: (idx) =>
        set((state) => {
          state.activeLayerIdx = idx;
        }),
      setClickedTile: (tile) =>
        set((state) => {
          state.clickedTile = tile;
        }),
      setLastPaintedTile: (tile) =>
        set((state) => {
          state.lastPaintedTile = tile;
        }),
      markMapDirty: () =>
        set((state) => {
          state.mapDirty = true;
        }),
      clearMapDirty: () =>
        set((state) => {
          state.mapDirty = false;
        }),
    }))
  )
);
