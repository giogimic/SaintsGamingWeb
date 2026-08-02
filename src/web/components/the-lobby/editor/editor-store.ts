import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { DEFAULT_WORLD_PROFILE_ID } from '@/shared/game/worldProfiles';

export type PanelId = 'build' | 'properties' | 'assets' | 'npc' | 'quest' | 'creature' | 'dev' | 'characters' | 'classes';

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
  panels: Record<PanelId, FloatingPanelState>;
  activePanel: PanelId | null;
  highestZIndex: number;
  
  // Editor Tools State
  activeBrushTileId: number;
  activeLayerIdx: number;
  clickedTile: { r: number; c: number } | null;
  
  // Actions
  setActiveGameId: (id: string) => void;
  toggleCreationMode: () => void;
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
  quest: { id: 'quest', title: 'Quest Editor', isOpen: false, isCollapsed: false, x: 150, y: 150, width: 720, height: 560, zIndex: 10 },
  creature: { id: 'creature', title: 'Creature Catalog', isOpen: false, isCollapsed: false, x: 480, y: 60, width: 780, height: 680, zIndex: 10 },
  dev: { id: 'dev', title: 'Dev Tools', isOpen: false, isCollapsed: false, x: 20, y: 640, width: 600, height: 300, zIndex: 10 },
  characters: { id: 'characters', title: 'Starter Heroes', isOpen: false, isCollapsed: false, x: 560, y: 80, width: 720, height: 640, zIndex: 10 },
  classes: { id: 'classes', title: 'Classes & Skills', isOpen: false, isCollapsed: false, x: 200, y: 40, width: 820, height: 700, zIndex: 10 },
};

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      isCreationMode: false,
      activeGameId: DEFAULT_WORLD_PROFILE_ID,
      panels: DEFAULT_PANELS,
      activePanel: null,
      highestZIndex: 10,
      activeBrushTileId: 1,
      activeLayerIdx: 0,
      clickedTile: null,

      setActiveGameId: (id) => set((state) => {
        state.activeGameId = id;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('saints.activeGameId', id);
        }
      }),

      toggleCreationMode: () => set((state) => {
        state.isCreationMode = !state.isCreationMode;
        // If turning on, open default panels
        if (state.isCreationMode) {
          state.panels.build.isOpen = true;
          state.panels.properties.isOpen = true;
        } else {
          // If turning off, close all
          Object.keys(state.panels).forEach((k) => {
            state.panels[k as PanelId].isOpen = false;
          });
        }
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
