import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type PanelId = 'build' | 'properties' | 'assets' | 'npc' | 'quest' | 'creature' | 'dev' | 'characters';

/** ALIGNMENT Slice D contextual modes — panel presets over existing docks. */
export type StudioMode = 'build' | 'npc' | 'quest' | 'creature' | 'test';

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

/** Default panels opened when entering each studio mode (Test closes all). */
export const STUDIO_MODE_DEFAULTS: Record<StudioMode, PanelId[]> = {
  build: ['build', 'properties'],
  npc: ['npc', 'properties', 'assets'],
  quest: ['npc', 'quest'],
  creature: ['creature'],
  test: [],
};

interface EditorState {
  isCreationMode: boolean;
  studioMode: StudioMode;
  panels: Record<PanelId, FloatingPanelState>;
  activePanel: PanelId | null;
  highestZIndex: number;
  
  // Editor Tools State
  activeBrushTileId: number;
  activeLayerIdx: number;
  clickedTile: { r: number; c: number } | null;
  
  // Actions
  toggleCreationMode: () => void;
  /** Doc 16 Walk Mode — exit create tools; default Studio entry. */
  enterWalkMode: () => void;
  setStudioMode: (mode: StudioMode) => void;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  togglePanel: (id: PanelId) => void;
  toggleCollapse: (id: PanelId) => void;
  updatePanelPosition: (id: PanelId, x: number, y: number) => void;
  updatePanelSize: (id: PanelId, width: number, height: number) => void;
  bringToFront: (id: PanelId) => void;
  
  setActiveBrushTileId: (id: number) => void;
  setActiveLayerIdx: (idx: number) => void;
  setClickedTile: (tile: { r: number; c: number } | null) => void;
}

const DEFAULT_PANELS: Record<PanelId, FloatingPanelState> = {
  build: { id: 'build', title: 'World Builder', isOpen: false, isCollapsed: false, x: 20, y: 20, width: 320, height: 600, zIndex: 10 },
  properties: { id: 'properties', title: 'Properties', isOpen: false, isCollapsed: false, x: 1550, y: 20, width: 340, height: 700, zIndex: 10 },
  assets: { id: 'assets', title: 'Asset Manager', isOpen: false, isCollapsed: false, x: 360, y: 20, width: 800, height: 500, zIndex: 10 },
  npc: { id: 'npc', title: 'NPC Editor', isOpen: false, isCollapsed: false, x: 100, y: 100, width: 400, height: 500, zIndex: 10 },
  quest: { id: 'quest', title: 'Quest Editor', isOpen: false, isCollapsed: false, x: 150, y: 150, width: 500, height: 400, zIndex: 10 },
  creature: { id: 'creature', title: 'Creature Catalog', isOpen: false, isCollapsed: false, x: 480, y: 60, width: 780, height: 680, zIndex: 10 },
  dev: { id: 'dev', title: 'Dev Tools', isOpen: false, isCollapsed: false, x: 20, y: 640, width: 600, height: 300, zIndex: 10 },
  characters: { id: 'characters', title: 'Starter Heroes', isOpen: false, isCollapsed: false, x: 560, y: 80, width: 720, height: 640, zIndex: 10 },
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

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      isCreationMode: false,
      studioMode: 'test',
      panels: DEFAULT_PANELS,
      activePanel: null,
      highestZIndex: 10,
      activeBrushTileId: 1,
      activeLayerIdx: 0,
      clickedTile: null,

      toggleCreationMode: () => set((state) => {
        state.isCreationMode = !state.isCreationMode;
        if (state.isCreationMode) {
          state.studioMode = 'build';
          openModePanels(state, 'build');
        } else {
          state.studioMode = 'test';
          closeAllPanels(state);
        }
      }),

      enterWalkMode: () => set((state) => {
        state.isCreationMode = false;
        state.studioMode = 'test';
        closeAllPanels(state);
      }),

      setStudioMode: (mode) => set((state) => {
        state.studioMode = mode;
        if (mode === 'test') {
          state.isCreationMode = false;
          closeAllPanels(state);
          return;
        }
        state.isCreationMode = true;
        openModePanels(state, mode);
      }),

      openPanel: (id) => set((state) => {
        state.panels[id].isOpen = true;
        state.highestZIndex += 1;
        state.panels[id].zIndex = state.highestZIndex;
        state.activePanel = id;
      }),

      closePanel: (id) => set((state) => {
        state.panels[id].isOpen = false;
        if (state.activePanel === id) state.activePanel = null;
      }),

      togglePanel: (id) => set((state) => {
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

      toggleCollapse: (id) => set((state) => {
        state.panels[id].isCollapsed = !state.panels[id].isCollapsed;
      }),

      updatePanelPosition: (id, x, y) => set((state) => {
        state.panels[id].x = x;
        state.panels[id].y = y;
      }),

      updatePanelSize: (id, width, height) => set((state) => {
        state.panels[id].width = width;
        state.panels[id].height = height;
      }),

      bringToFront: (id) => set((state) => {
        if (state.panels[id].zIndex !== state.highestZIndex) {
          state.highestZIndex += 1;
          state.panels[id].zIndex = state.highestZIndex;
          state.activePanel = id;
        }
      }),

      setActiveBrushTileId: (id) => set((state) => { state.activeBrushTileId = id; }),
      setActiveLayerIdx: (idx) => set((state) => { state.activeLayerIdx = idx; }),
      setClickedTile: (tile) => set((state) => { state.clickedTile = tile; })
    }))
  )
);
