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
import {
  emptyEditorOpStack,
  pushEditorOp,
  redoEditorOp,
  undoEditorOp,
  type EditorOp,
  type EditorOpStack,
  type PaintedCell,
} from '@/shared/game/editorOps';
import type { PaintableMap } from '@/shared/game/tilePaint';
import { studioRuntimeFromCreation, type StudioRuntime } from '@/shared/game/studioSession';
import { STUDIO_PIE_CHANGED_EVENT } from '@/shared/game/studioEvents';
import type { StudioPieChangedDetail } from '@/shared/game/studioEvents';
import {
  clearDefinitionOpsForKey,
  emptyDefinitionOpStack,
  pushDefinitionOp,
  redoDefinitionOp,
  undoDefinitionOp,
  type DefinitionOp,
  type DefinitionOpStack,
} from '@/shared/game/definitionOps';
import {
  DEFAULT_PIE_OPTIONS,
  type PieOptions,
} from '@/shared/game/pieOptions';

export type PanelId = 'build' | 'properties' | 'assets' | 'npc' | 'quest' | 'dialogue' | 'creature' | 'loot' | 'dev' | 'characters' | 'classes';

export type { StudioMode };
export { STUDIO_MODE_DEFAULTS, STUDIO_MODE_META, STUDIO_DOCK_META };

function emitPieChanged(pie: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<StudioPieChangedDetail>(STUDIO_PIE_CHANGED_EVENT, {
      detail: { pie },
    })
  );
}

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

/** Snapshot restored when leaving Playtest → Editor. */
type PlaytestRestoreSnapshot = {
  studioMode: StudioMode;
  openPanelIds: PanelId[];
  activeBrushTileId: number;
  activeLogicTileId: number;
  activeLayerIdx: number;
  mapDirty: boolean;
};

interface EditorState {
  /** Legacy: true = editor runtime (tools on). Prefer getStudioRuntime(). */
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
  /** Map-scope undo/redo (bible 30). */
  opStack: EditorOpStack;
  /** Definition-form undo/redo (bible 30 — separate from map ops). */
  definitionOpStack: DefinitionOpStack;
  /** PIE Playtest options (bible 32 §4). */
  pieOptions: PieOptions;
  playtestSnapshot: PlaytestRestoreSnapshot | null;

  activeBrushTileId: number;
  activeLogicTileId: number;
  activeLayerIdx: number;
  clickedTile: { r: number; c: number } | null;
  lastPaintedTile: { r: number; c: number } | null;
  /** Soft editor overlay: show tile XY in paint HUD. */
  showEditorCoords: boolean;

  setActiveGameId: (id: string) => void;
  getStudioRuntime: () => StudioRuntime;
  toggleCreationMode: () => void;
  enterWalkMode: () => void;
  enterPlaytest: () => void;
  enterDevelopmentMode: () => void;
  exitPlaytest: () => void;
  setStudioMode: (mode: StudioMode) => void;
  openPanel: (id: PanelId) => void;
  closePanel: (id: PanelId) => void;
  togglePanel: (id: PanelId) => void;
  toggleCollapse: (id: PanelId) => void;
  updatePanelPosition: (id: PanelId, x: number, y: number) => void;
  updatePanelSize: (id: PanelId, width: number, height: number) => void;
  bringToFront: (id: PanelId) => void;
  hydratePanelLayouts: () => void;

  setActiveBrushTileId: (id: number) => void;
  setActiveLogicTileId: (id: number) => void;
  setActiveLayerIdx: (idx: number) => void;
  setClickedTile: (tile: { r: number; c: number } | null) => void;
  setLastPaintedTile: (tile: { r: number; c: number } | null) => void;
  setShowEditorCoords: (on: boolean) => void;
  markMapDirty: () => void;
  clearMapDirty: () => void;
  pushPaintOp: (cells: PaintedCell[]) => void;
  undoLastOp: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  redoLastOp: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  clearOpStack: () => void;

  setPieOption: <K extends keyof PieOptions>(key: K, value: PieOptions[K]) => void;
  recordDefinitionChange: (resourceKey: string, before: unknown, after: unknown) => void;
  undoDefinitionChange: () => DefinitionOp | null;
  redoDefinitionChange: () => DefinitionOp | null;
  clearDefinitionStackFor: (resourceKey: string) => void;
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

function capturePlaytestSnapshot(state: {
  studioMode: StudioMode;
  panels: Record<PanelId, FloatingPanelState>;
  activeBrushTileId: number;
  activeLogicTileId: number;
  activeLayerIdx: number;
  mapDirty: boolean;
}): PlaytestRestoreSnapshot {
  const openPanelIds = (Object.keys(state.panels) as PanelId[]).filter(
    (id) => state.panels[id].isOpen
  );
  return {
    studioMode: state.studioMode === 'test' ? 'develop' : state.studioMode,
    openPanelIds,
    activeBrushTileId: state.activeBrushTileId,
    activeLogicTileId: state.activeLogicTileId,
    activeLayerIdx: state.activeLayerIdx,
    mapDirty: state.mapDirty,
  };
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
      opStack: emptyEditorOpStack(),
      definitionOpStack: emptyDefinitionOpStack(),
      pieOptions: { ...DEFAULT_PIE_OPTIONS },
      playtestSnapshot: null,
      activeBrushTileId: DEFAULT_STUDIO_GROUND_GID,
      activeLogicTileId: 1,
      activeLayerIdx: 0,
      clickedTile: null,
      lastPaintedTile: null,
      showEditorCoords: true,

      getStudioRuntime: () => studioRuntimeFromCreation(get().isCreationMode),

      setActiveGameId: (id) =>
        set((state) => {
          state.activeGameId = id;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('saints.activeGameId', id);
          }
        }),

      toggleCreationMode: () => {
        if (get().isCreationMode) {
          get().enterPlaytest();
        } else {
          get().exitPlaytest();
        }
      },

      enterWalkMode: () => get().enterPlaytest(),

      enterPlaytest: () =>
        set((state) => {
          if (!state.isCreationMode) return;
          state.playtestSnapshot = capturePlaytestSnapshot(state);
          state.isCreationMode = false;
          state.studioMode = 'test';
          closeAllPanels(state);
          queueMicrotask(() => emitPieChanged(true));
        }),

      enterDevelopmentMode: () =>
        set((state) => {
          state.isCreationMode = true;
          state.studioMode = 'develop';
          state.playtestSnapshot = null;
          openModePanels(state, 'develop');
        }),

      exitPlaytest: () =>
        set((state) => {
          const snap = state.playtestSnapshot;
          state.isCreationMode = true;
          if (snap) {
            state.studioMode = snap.studioMode;
            state.activeBrushTileId = snap.activeBrushTileId;
            state.activeLogicTileId = snap.activeLogicTileId;
            state.activeLayerIdx = snap.activeLayerIdx;
            state.mapDirty = snap.mapDirty;
            closeAllPanels(state);
            for (const id of snap.openPanelIds) {
              if (state.panels[id]) {
                state.panels[id].isOpen = true;
                state.highestZIndex += 1;
                state.panels[id].zIndex = state.highestZIndex;
                state.activePanel = id;
              }
            }
            if (snap.openPanelIds.length === 0) {
              openModePanels(state, snap.studioMode === 'test' ? 'develop' : snap.studioMode);
            }
            state.playtestSnapshot = null;
          } else {
            state.studioMode = 'develop';
            openModePanels(state, 'develop');
          }
          queueMicrotask(() => emitPieChanged(false));
        }),

      setStudioMode: (mode) =>
        set((state) => {
          const wasEditor = state.isCreationMode;
          state.studioMode = mode;
          if (mode === 'test') {
            if (state.isCreationMode) {
              state.playtestSnapshot = capturePlaytestSnapshot(state);
            }
            state.isCreationMode = false;
            closeAllPanels(state);
            if (wasEditor) queueMicrotask(() => emitPieChanged(true));
            return;
          }
          state.isCreationMode = true;
          state.playtestSnapshot = null;
          openModePanels(state, mode);
          if (!wasEditor) queueMicrotask(() => emitPieChanged(false));
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
      setActiveLogicTileId: (id) =>
        set((state) => {
          state.activeLogicTileId = id;
        }),
      setActiveLayerIdx: (idx) =>
        set((state) => {
          const prev = state.activeLayerIdx;
          state.activeLayerIdx = idx;
          // Switching Logic ↔ visual: reset brushes so a logic id is not painted
          // as a visual GID (stair fragment) and vice versa.
          if (prev === -1 && idx >= 0) {
            // Entering a visual layer from Logic — prefer solid grass.
            if (state.activeBrushTileId <= 12) {
              state.activeBrushTileId = DEFAULT_STUDIO_GROUND_GID;
            }
          } else if (prev >= 0 && idx === -1) {
            // Entering Logic from visual — keep registered wall default if brush was a huge GID.
            if (state.activeLogicTileId > 50) {
              state.activeLogicTileId = 1;
            }
          }
        }),
      setClickedTile: (tile) =>
        set((state) => {
          state.clickedTile = tile;
        }),
      setLastPaintedTile: (tile) =>
        set((state) => {
          state.lastPaintedTile = tile;
        }),
      setShowEditorCoords: (on) =>
        set((state) => {
          state.showEditorCoords = on;
        }),
      markMapDirty: () =>
        set((state) => {
          state.mapDirty = true;
        }),
      clearMapDirty: () =>
        set((state) => {
          state.mapDirty = false;
        }),

      pushPaintOp: (cells) =>
        set((state) => {
          const meaningful = cells.filter((c) => c.before !== c.after);
          if (meaningful.length === 0) return;
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_cells',
            cells: meaningful,
          });
        }),

      undoLastOp: (map) => {
        const stack = get().opStack;
        const result = undoEditorOp(map, stack);
        if (result.error) return { ok: false, op: null, error: result.error };
        if (!result.op) return { ok: false, op: null };
        set((state) => {
          state.opStack = result.stack;
          state.mapDirty = true;
        });
        return { ok: true, op: result.op };
      },

      redoLastOp: (map) => {
        const stack = get().opStack;
        const result = redoEditorOp(map, stack);
        if (result.error) return { ok: false, op: null, error: result.error };
        if (!result.op) return { ok: false, op: null };
        set((state) => {
          state.opStack = result.stack;
          state.mapDirty = true;
        });
        return { ok: true, op: result.op };
      },

      clearOpStack: () =>
        set((state) => {
          state.opStack = emptyEditorOpStack();
        }),

      setPieOption: (key, value) =>
        set((state) => {
          state.pieOptions[key] = value;
        }),

      recordDefinitionChange: (resourceKey, before, after) =>
        set((state) => {
          state.definitionOpStack = pushDefinitionOp(
            state.definitionOpStack,
            resourceKey,
            before,
            after
          );
        }),

      undoDefinitionChange: () => {
        const { stack, op } = undoDefinitionOp(get().definitionOpStack);
        if (!op) return null;
        set((state) => {
          state.definitionOpStack = stack;
        });
        return op;
      },

      redoDefinitionChange: () => {
        const { stack, op } = redoDefinitionOp(get().definitionOpStack);
        if (!op) return null;
        set((state) => {
          state.definitionOpStack = stack;
        });
        return op;
      },

      clearDefinitionStackFor: (resourceKey) =>
        set((state) => {
          state.definitionOpStack = clearDefinitionOpsForKey(
            state.definitionOpStack,
            resourceKey
          );
        }),
    }))
  )
);
