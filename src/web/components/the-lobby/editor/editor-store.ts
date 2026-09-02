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
  type StudioDockId,
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
  deduplicatePaintedCells,
  type EditorOp,
  type EditorOpStack,
  type PaintedCell,
  type PaintedVoxel,
} from '@/shared/game/editorOps';
import { VoxelWorld } from '@/shared/game/voxel/VoxelWorldDoc';
import { packVoxel, VOXEL_WORD_AIR } from '@/shared/game/voxel/VoxelWord';
import {
  eraseTilesInRegion,
  eraseSparseCells,
  paintTilesInRegion,
  paintSparseCells,
  getCellsBoundingBox,
  type PaintableMap,
} from '@/shared/game/tilePaint';
import {
  extractSubgridFromMap,
  extractSparseCellsFromMap,
  stampClipboardOntoMap,
  duplicateSelectionOnMap,
  moveSelectionOnMap,
  type TileClipboardData,
  type PasteMode,
} from '@/shared/game/subgridStamp';
import {
  type ContinuousGeometry,
  rasterizeGeometryToCells,
  getGeometryBoundingBox,
} from '@/shared/game/geometry/continuousGeometry';
import {
  type StampTransform,
  DEFAULT_STAMP_TRANSFORM,
  rotateCW,
  rotateCCW,
  transformClipboard,
  transformSelectionInPlace,
} from '@/shared/game/stampTransform';

import { studioRuntimeFromCreation, type StudioRuntime } from '@/shared/game/studioSession';
import { STUDIO_PIE_CHANGED_EVENT, STUDIO_MAP_CELLS_CHANGED_EVENT, STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';
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

export type SoftLock = {
  resource: string;
  userId: string;
  displayName: string;
  at: string;
  expiresAt: string;
};

export type PanelId = StudioDockId;

export interface CustomTerrainSwatch {
  id: string;
  name: string;
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  category?: string;
}

export interface CustomPropItem {
  id: string;
  name: string;
  category: 'Tree' | 'Rock' | 'Building' | 'Foliage' | 'Decor' | 'Structure';
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  defaultScale?: number;
  collision?: 'SOLID' | 'NONE' | 'WATER';
  elevationOffset?: number;
}

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

function dispatchOpEvents(op: EditorOp, direction: 'undo' | 'redo') {
  if (typeof window === 'undefined') return;

  const handleOp = (subOp: EditorOp) => {
    switch (subOp.kind) {
      case 'paint_cells': {
        window.dispatchEvent(
          new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
            detail: {
              cells: subOp.cells.map((c) => ({
                r: c.r,
                c: c.c,
                layerIdx: c.layerIdx,
                value: direction === 'undo' ? c.before : c.after,
              })),
            },
          })
        );
        break;
      }
      case 'paint_voxels': {
        window.dispatchEvent(
          new CustomEvent('studio_voxels_changed', {
            detail: {
              voxels: subOp.voxels.map((v) => ({
                wx: v.wx,
                wy: v.wy,
                wz: v.wz,
                word: direction === 'undo' ? v.before : v.after,
              })),
            },
          })
        );
        break;
      }
      case 'create_layer':
      case 'delete_layer':
      case 'reorder_layer':
      case 'rename_layer': {
        window.dispatchEvent(new CustomEvent('studio_layers_changed', { detail: { op: subOp, direction } }));
        break;
      }
      case 'create_entity':
      case 'delete_entity':
      case 'move_entity':
      case 'modify_entity': {
        window.dispatchEvent(new CustomEvent('studio_entities_changed', { detail: { op: subOp, direction } }));
        break;
      }
      case 'create_gate':
      case 'delete_gate':
      case 'modify_gate': {
        window.dispatchEvent(new CustomEvent('studio_gates_changed', { detail: { op: subOp, direction } }));
        if (subOp.kind !== 'modify_gate' && subOp.tileChange) {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: [{
                  r: subOp.tileChange.r,
                  c: subOp.tileChange.c,
                  layerIdx: subOp.tileChange.layerIdx,
                  value: direction === 'undo' ? subOp.tileChange.before : subOp.tileChange.after,
                }],
              },
            })
          );
        }
        break;
      }
      case 'modify_freeform_layers': {
        window.dispatchEvent(
          new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: {} })
        );
        break;
      }
      case 'modify_map_props': {
        window.dispatchEvent(new CustomEvent('studio_map_props_changed', { detail: { op: subOp, direction } }));
        break;
      }
      case 'compound': {
        const ops = direction === 'undo' ? [...subOp.ops].reverse() : subOp.ops;
        for (const o of ops) handleOp(o);
        break;
      }
    }
  };

  handleOp(op);
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
  activeBrushPattern: BrushPattern | null;
  activeLogicTileId: number;
  activeLayerIdx: number;
  activeLayerType: 'grid' | 'paint-splat' | 'free-form' | 'polygon';
  mapDirty: boolean;
  brushRadius: number;
  brushShape: 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon';
  stampScale?: number;
};

export interface BrushPattern {
  w: number;
  h: number;
  gids: number[][];
  mask?: boolean[][];
}

export interface TileDefinition {
  id: string;
  name: string;
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  gid: number;
  tags: string[];
  collision: 'NONE' | 'SOLID' | 'WATER' | 'LEDGE' | 'CLIFF';
  gameplayFlags: string[];
  material: string;
  thumbnailUrl?: string;
}

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
  /** Synonym for mapDirty, tracks unsaved studio level/definition changes. */
  hasUnsavedChanges: boolean;
  /** True while async map save POST request is in flight. */
  isSavingMap: boolean;
  /** Map-scope undo/redo (bible 30). */
  opStack: EditorOpStack;
  /** Definition-form undo/redo (bible 30 — separate from map ops). */
  definitionOpStack: DefinitionOpStack;
  /** PIE Playtest options (bible 32 §4). */
  pieOptions: PieOptions;
  /** Cross-module data invalidation version. Increment to trigger refetches. */
  dataVersion: number;
  playtestSnapshot: PlaytestRestoreSnapshot | null;
  /** Soft locks held by collaborators (CC1). Key is resource string. */
  activeLocks: Record<string, SoftLock>;

  /** Active Atlas Node selected in World Atlas / Atlas Studio */
  selectedAtlasNodeId: string | null;
  setSelectedAtlasNodeId: (id: string | null) => void;

  /** Active paint transaction (for grouping brush strokes). */
  paintTransaction: PaintedCell[] | null;

  activeBrushTileId: number;
  activeBrushPattern: BrushPattern | null;
  activeStampAsset: { assetId?: string; url: string; width?: number; height?: number; uOffset?: number; vOffset?: number; uScale?: number; vScale?: number } | null;
  setActiveStampAsset: (asset: { assetId?: string; url: string; width?: number; height?: number; uOffset?: number; vOffset?: number; uScale?: number; vScale?: number } | null) => void;
  activeLogicTileId: number;
  activeLayerIdx: number;
  activeLayerType: 'grid' | 'paint-splat' | 'free-form' | 'polygon';
  brushRadius: number;
  brushShape: 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon';
  brushRotation: number;
  setBrushRotation: (rot: number) => void;
  selectionMode: 'box' | 'circle' | 'ellipse' | 'lasso' | 'polygon' | 'magic-wand';
  setSelectionMode: (mode: 'box' | 'circle' | 'ellipse' | 'lasso' | 'polygon' | 'magic-wand') => void;
  brushMode: 'paint' | 'erase' | 'eyedropper' | 'fill' | 'pan' | 'select' | 'prefab' | 'gate' | 'paste';
  activePrefabId: string | null;
  prefabs: any[];
  tileClipboard: TileClipboardData | null;
  tileDefinitions: TileDefinition[];
  selectedTileDefId: string | null;
  setTileDefinitions: (defs: TileDefinition[] | ((prev: TileDefinition[]) => TileDefinition[])) => void;
  addTileDefinitions: (defs: TileDefinition[]) => void;
  removeTileDefinition: (id: string) => void;
  setSelectedTileDefId: (id: string | null) => void;
  paintMode: 'stamp' | 'paste';
  setPaintMode: (mode: 'stamp' | 'paste') => void;
  prefabStampMode: '1tile' | 'footprint';
  setPrefabStampMode: (mode: '1tile' | 'footprint') => void;
  stampScale: number;
  setStampScale: (scale: number) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  
  // Splat Terrain Paint mode controls
  splatOpacity: number;
  setSplatOpacity: (opacity: number) => void;
  splatScatter: number;
  setSplatScatter: (scatter: number) => void;
  splatRotationRandomize: boolean;
  setSplatRotationRandomize: (enabled: boolean) => void;
  isAutoEdgeEnabled: boolean;
  setIsAutoEdgeEnabled: (enabled: boolean) => void;
  isStudioEscapeMenuOpen: boolean;
  setIsStudioEscapeMenuOpen: (open: boolean) => void;
  
  // Custom Sliced Textures & Prop Library
  customTerrainSwatches: CustomTerrainSwatch[];
  addCustomTerrainSwatch: (swatch: CustomTerrainSwatch) => void;
  removeCustomTerrainSwatch: (id: string) => void;
  customPropLibrary: CustomPropItem[];
  addCustomPropItem: (prop: CustomPropItem) => void;
  removeCustomPropItem: (id: string) => void;
  activeCustomPropId: string | null;
  setActiveCustomPropId: (id: string | null) => void;

  // 3D Voxel Core & Unified Editing Language (Option A)
  voxelBlockSizePx: number;
  setVoxelBlockSizePx: (size: number) => void;
  activeVoxelMaterialId: number;
  setActiveVoxelMaterialId: (id: number) => void;
  activeVoxelShape: number;
  setActiveVoxelShape: (shape: number) => void;
  activeVoxelOrientation: number;
  setActiveVoxelOrientation: (orient: number) => void;
  voxelToolMode: 'block-pen' | 'box-fill' | 'extrude' | 'slope-ramp' | 'smart-terrain' | 'eraser' | 'eyedropper';
  setVoxelToolMode: (mode: 'block-pen' | 'box-fill' | 'extrude' | 'slope-ramp' | 'smart-terrain' | 'eraser' | 'eyedropper') => void;
  
  // Gate Pairing and Placement Wizard State
  pendingGateConnection: {
    originMapId: string;
    originPosition: { x: number; y: number };
    originSize: { w: number; h: number };
    originGateId: string;
    category: string;
    name?: string;
    targetMapId: string;
    bidirectional: boolean;
  } | null;
  setPendingGateConnection: (
    conn: {
      originMapId: string;
      originPosition: { x: number; y: number };
      originSize: { w: number; h: number };
      originGateId: string;
      category: string;
      name?: string;
      targetMapId: string;
      bidirectional: boolean;
    } | null
  ) => void;
  gateConnectModal: {
    isOpen: boolean;
    originR: number;
    originC: number;
    initialCategory?: string;
  } | null;
  openGateConnectModal: (originR: number, originC: number, initialCategory?: string) => void;
  closeGateConnectModal: () => void;

  pasteMode: PasteMode;
  isPasting: boolean;
  activeSelectionGeometry: ContinuousGeometry | null;
  setSelectionGeometry: (geom: ContinuousGeometry | null) => void;
  selectionStart: { r: number; c: number } | null;
  selectionEnd: { r: number; c: number } | null;
  selectedCells: Record<string, boolean>;
  addSelectedCell: (r: number, c: number) => void;
  removeSelectedCell: (r: number, c: number) => void;
  toggleSelectedCell: (r: number, c: number) => void;
  setSelectionBox: (minR: number, maxR: number, minC: number, maxC: number) => void;
  setSelectionCircle: (centerR: number, centerC: number, radius: number) => void;
  setSelectionEllipse: (centerR: number, centerC: number, radiusX: number, radiusZ: number, rotation?: number) => void;
  setSelectionRegularPolygon: (centerR: number, centerC: number, radius: number, sides: number, rotation?: number) => void;
  setSelectionPolygon: (points: Array<{ r: number; c: number }>) => void;
  setSelectionFreehand: (strokes: Array<{ x: number; z: number }>, strokeWidth?: number) => void;
  addSelectedBox: (minR: number, maxR: number, minC: number, maxC: number) => void;
  removeSelectedBox: (minR: number, maxR: number, minC: number, maxC: number) => void;
  clearSelectedCells: () => void;
  setSelectedCells: (cells: Record<string, boolean>) => void;
  getSelectedBounds: () => { minR: number; maxR: number; minC: number; maxC: number; width: number; height: number; count: number } | null;
  getSelectedCount: () => number;
  clickedTile: { r: number; c: number } | null;
  hoveredTile: { r: number; c: number } | null;
  hoveredVoxel: { wx: number; wy: number; wz: number } | null;
  lastPaintedTile: { r: number; c: number } | null;
  /** Soft editor overlay: show tile XY in paint HUD. */
  showEditorCoords: boolean;
  /** Editor-only viewport markers for gate tiles. */
  showWarpOverlays: boolean;
  /** Editor-only viewport markers for NPC spawn tiles + gate spawn pins. */
  showSpawnOverlays: boolean;

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
  resetLayout: () => void;
  togglePanel: (id: PanelId) => void;
  toggleCollapse: (id: PanelId) => void;
  updatePanelPosition: (id: PanelId, x: number, y: number) => void;
  startPaintTransaction: () => void;
  commitPaintTransaction: () => void;
  updatePanelSize: (id: PanelId, width: number, height: number) => void;
  bringToFront: (id: PanelId) => void;
  hydratePanelLayouts: () => void;
  /** Force refetch data across modules. */
  incrementDataVersion: () => void;

  setActiveBrushTileId: (id: number, keepPattern?: boolean) => void;
  setActiveBrushPattern: (pattern: BrushPattern | null) => void;
  setActiveLogicTileId: (id: number) => void;
  setActiveLayerIdx: (idx: number) => void;
  setActiveLayerType: (type: 'grid' | 'paint-splat' | 'free-form' | 'polygon') => void;
  setClickedTile: (tile: { r: number; c: number } | null) => void;
  setHoveredTile: (tile: { r: number; c: number } | null) => void;
  setHoveredVoxel: (voxel: { wx: number; wy: number; wz: number } | null) => void;
  setLastPaintedTile: (tile: { r: number; c: number } | null) => void;
  setShowEditorCoords: (on: boolean) => void;
  setShowWarpOverlays: (on: boolean) => void;
  setShowSpawnOverlays: (on: boolean) => void;
  setBrushRadius: (radius: number) => void;
  setBrushShape: (shape: 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon') => void;
  setBrushMode: (mode: 'paint' | 'erase' | 'eyedropper' | 'fill' | 'pan' | 'select' | 'prefab' | 'gate' | 'paste') => void;
  setActivePrefabId: (id: string | null) => void;
  setPrefabs: (prefabs: any[]) => void;
  setPasteMode: (mode: PasteMode) => void;
  setIsPasting: (pasting: boolean) => void;
  setSelectionStart: (tile: { r: number; c: number } | null) => void;
  setSelectionEnd: (tile: { r: number; c: number } | null) => void;
  markMapDirty: () => void;
  clearMapDirty: () => void;
  setHasUnsavedChanges: (val: boolean) => void;
  setIsSavingMap: (val: boolean) => void;
  pushPaintOp: (cells: PaintedCell[]) => void;
  pushVoxelOp: (voxels: PaintedVoxel[]) => void;
  pushFreeformOp: (before: any[], after: any[]) => void;
  undoLastOp: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  redoLastOp: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  triggerUndo: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  triggerRedo: (map: PaintableMap) => { ok: boolean; op: EditorOp | null; error?: string };
  deleteSelectionTiles: (
    map: any,
    engine?: any,
    targetLayerIdx?: number
  ) => { count: number; layerIdx: number; error?: string };
  paintSelection: (
    map: any,
    engine?: any,
    targetLayerIdx?: number,
    customTileId?: number
  ) => { count: number; layerIdx: number; error?: string };
  fillSelection: (
    map: any,
    engine?: any,
    targetLayerIdx?: number,
    customTileId?: number
  ) => { count: number; layerIdx: number; error?: string };
  eraseSelection: (
    map: any,
    engine?: any,
    targetLayerIdx?: number
  ) => { count: number; layerIdx: number; error?: string };
  rotateSelection: (
    map: any,
    engine?: any,
    angle?: 90 | 180 | 270,
    targetLayerIdx?: number
  ) => { ok: boolean; count?: number; error?: string };
  flipSelection: (
    map: any,
    engine?: any,
    axis?: 'h' | 'v',
    targetLayerIdx?: number
  ) => { ok: boolean; count?: number; error?: string };
  duplicateSelection: (
    map: any,
    engine?: any,
    offsetR?: number,
    offsetC?: number,
    targetLayerIdx?: number
  ) => { ok: boolean; count?: number; error?: string };
  moveSelection: (
    map: any,
    engine?: any,
    offsetR?: number,
    offsetC?: number,
    targetLayerIdx?: number
  ) => { ok: boolean; count?: number; error?: string };
  copySelection: (
    map: any,
    layerIdx?: number
  ) => { ok: boolean; width?: number; height?: number; error?: string };
  cutSelection: (
    map: any,
    engine?: any,
    layerIdx?: number
  ) => { ok: boolean; width?: number; height?: number; count?: number; error?: string };
  pasteClipboard: (
    map: any,
    engine?: any,
    targetR?: number,
    targetC?: number,
    mode?: PasteMode
  ) => { ok: boolean; count?: number; error?: string };
  cancelPaste: () => void;
  clearOpStack: () => void;


  /** Stamp & Brush Transform Actions (Phase 5A) */
  stampTransform: StampTransform;
  flipStampH: () => void;
  flipStampV: () => void;
  rotateStampCW: () => void;
  rotateStampCCW: () => void;
  resetStampTransform: () => void;

  setPieOption: <K extends keyof PieOptions>(key: K, value: PieOptions[K]) => void;
  recordDefinitionChange: (resourceKey: string, before: unknown, after: unknown) => void;
  undoDefinitionChange: () => DefinitionOp | null;
  redoDefinitionChange: () => DefinitionOp | null;
  clearDefinitionStackFor: (resourceKey: string) => void;

  setSoftLock: (lock: SoftLock) => void;
  removeSoftLock: (resource: string) => void;
  clearExpiredLocks: () => void;

  /** Multi-Map Workspace Tabs (Phase 2B) */
  openMapTabs: string[];
  activeMapTab: string | null;
  isStudioFreeCam: boolean;
  canvasViewport: { x: number; y: number; w: number; h: number };
  setCanvasViewport: (vp: { x: number; y: number; w: number; h: number }) => void;
  openMapInTab: (mapId: string) => void;
  closeMapTab: (mapId: string) => void;
  setActiveMapTab: (mapId: string) => void;
  setStudioFreeCam: (enabled: boolean) => void;
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
  items: {
    id: 'items',
    title: 'Item Creator',
    isOpen: false,
    isCollapsed: false,
    x: 350,
    y: 60,
    width: 800,
    height: 600,
    zIndex: 10,
  },
  professions: {
    id: 'professions',
    title: 'Profession Studio',
    isOpen: false,
    isCollapsed: false,
    x: 380,
    y: 70,
    width: 800,
    height: 600,
    zIndex: 10,
  },
  recipes: {
    id: 'recipes',
    title: 'Recipe Studio',
    isOpen: false,
    isCollapsed: false,
    x: 410,
    y: 80,
    width: 800,
    height: 600,
    zIndex: 10,
  },
  dungeons: {
    id: 'dungeons',
    title: 'Dungeon Studio',
    isOpen: false,
    isCollapsed: false,
    x: 420,
    y: 90,
    width: 800,
    height: 600,
    zIndex: 10,
  },
  spawner: {
    id: 'spawner',
    title: 'Monster Spawner',
    isOpen: false,
    isCollapsed: false,
    x: 500,
    y: 100,
    width: 440,
    height: 560,
    zIndex: 10,
  },
  prefab: {
    id: 'prefab',
    title: 'Prefab Builder',
    isOpen: false,
    isCollapsed: false,
    x: 60,
    y: 60,
    width: 400,
    height: 600,
    zIndex: 10,
  },
  atlas: {
    id: 'atlas',
    title: 'World Atlas',
    isOpen: false,
    isCollapsed: false,
    x: 350,
    y: 50,
    width: 800,
    height: 700,
    zIndex: 10,
  },
  problems: {
    id: 'problems',
    title: 'Problems',
    isOpen: false,
    isCollapsed: false,
    x: 350,
    y: 500,
    width: 600,
    height: 250,
    zIndex: 10,
  },
  gameplay: {
    id: 'gameplay',
    title: 'Gameplay Hub',
    isOpen: false,
    isCollapsed: false,
    x: 250,
    y: 40,
    width: 860,
    height: 640,
    zIndex: 10,
  },
  streaming: {
    id: 'streaming',
    title: 'Streaming Inspector',
    isOpen: false,
    isCollapsed: false,
    x: 100,
    y: 100,
    width: 400,
    height: 350,
    zIndex: 10,
  },
  settings: {
    id: 'settings',
    title: 'Server Settings',
    isOpen: false,
    isCollapsed: false,
    x: 200,
    y: 60,
    width: 720,
    height: 600,
    zIndex: 10,
  },
  dungeon: {
    id: 'dungeon',
    title: 'Dungeon Studio',
    isOpen: false,
    isCollapsed: false,
    x: 220,
    y: 80,
    width: 760,
    height: 600,
    zIndex: 10,
  },
  shop: {
    id: 'shop',
    title: 'Economy & Shops',
    isOpen: false,
    isCollapsed: false,
    x: 240,
    y: 100,
    width: 800,
    height: 600,
    zIndex: 10,
  },
  mounts: {
    id: 'mounts',
    title: 'Mounts',
    isOpen: false,
    isCollapsed: false,
    x: 260,
    y: 60,
    width: 780,
    height: 620,
    zIndex: 10,
  },
  worldevent: {
    id: 'worldevent',
    title: 'World Events',
    isOpen: false,
    isCollapsed: false,
    x: 260,
    y: 120,
    width: 700,
    height: 560,
    zIndex: 10,
  },
  simulation: {
    id: 'simulation',
    title: 'Simulation Presets',
    isOpen: false,
    isCollapsed: false,
    x: 280,
    y: 140,
    width: 700,
    height: 500,
    zIndex: 10,
  },
  tileset: {
    id: 'tileset',
    title: 'Tile Selector',
    isOpen: false,
    isCollapsed: false,
    x: 20,
    y: 350,
    width: 360,
    height: 480,
    zIndex: 10,
  },
  logic: {
    id: 'logic',
    title: 'Logic Painter',
    isOpen: false,
    isCollapsed: false,
    x: 20,
    y: 350,
    width: 360,
    height: 480,
    zIndex: 10,
  },
  publishing: {
    id: 'publishing',
    title: 'Publish & Releases',
    isOpen: false,
    isCollapsed: false,
    x: 300,
    y: 80,
    width: 780,
    height: 620,
    zIndex: 10,
  },
  maps: {
    id: 'maps',
    title: 'Map Browser',
    isOpen: false,
    isCollapsed: false,
    x: 300,
    y: 100,
    width: 700,
    height: 600,
    zIndex: 10,
  },
  animations: {
    id: 'animations',
    title: 'Animation Studio',
    isOpen: false,
    isCollapsed: false,
    x: 250,
    y: 80,
    width: 820,
    height: 620,
    zIndex: 10,
  },
  interface: {
    id: 'interface',
    title: 'Interface Designer',
    isOpen: false,
    isCollapsed: false,
    x: 280,
    y: 80,
    width: 680,
    height: 580,
    zIndex: 10,
  },
  tileset_canvas: {
    id: 'tileset_canvas',
    title: 'Tileset Canvas',
    isOpen: false,
    isCollapsed: false,
    x: 400,
    y: 80,
    width: 520,
    height: 480,
    zIndex: 10,
  },
  camera: {
    id: 'camera',
    title: 'Camera & View Settings',
    isOpen: false,
    isCollapsed: false,
    x: 350,
    y: 90,
    width: 480,
    height: 560,
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
  const defaults = STUDIO_MODE_DEFAULTS[mode] || [];
  for (const id of defaults) {
    if (!state.panels[id]) continue;
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
  activeBrushPattern: BrushPattern | null;
  activeLogicTileId: number;
  activeLayerIdx: number;
  activeLayerType: 'grid' | 'paint-splat' | 'free-form' | 'polygon';
  mapDirty: boolean;
  brushRadius: number;
  brushShape: 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon';
  stampScale: number;
}): PlaytestRestoreSnapshot {
  const openPanelIds = (Object.keys(state.panels) as PanelId[]).filter(
    (id) => state.panels[id].isOpen
  );
  return {
    studioMode: state.studioMode === 'test' ? 'develop' : state.studioMode,
    openPanelIds,
    activeBrushTileId: state.activeBrushTileId,
    activeBrushPattern: state.activeBrushPattern,
    activeLogicTileId: state.activeLogicTileId,
    activeLayerIdx: state.activeLayerIdx,
    activeLayerType: state.activeLayerType,
    mapDirty: state.mapDirty,
    brushRadius: state.brushRadius,
    brushShape: state.brushShape,
    stampScale: state.stampScale,
  };
}

function persistLayouts(get: () => EditorState) {
  savePanelLayoutsToStorage(get().panels);
}

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Studio-first foundation
      isCreationMode: true,
      activeGameId: 'default',
      studioMode: 'develop',
      panels: DEFAULT_PANELS,
      activePanel: null,
      highestZIndex: 10,
      panelLayoutsHydrated: false,
      mapDirty: false,
      hasUnsavedChanges: false,
      isSavingMap: false,
      opStack: emptyEditorOpStack(),
      definitionOpStack: emptyDefinitionOpStack(),
      openPieMenu: false,
      pieMenuPos: null,
      pieOptions: { ...DEFAULT_PIE_OPTIONS },
      dataVersion: 0,
      paintTransaction: null,
      playtestSnapshot: null,
      activeLocks: {},
      selectedAtlasNodeId: null,
      setSelectedAtlasNodeId: (id) =>
        set((state) => {
          state.selectedAtlasNodeId = id;
        }),
      activeBrushTileId: DEFAULT_STUDIO_GROUND_GID,
      activeBrushPattern: null,
      activeStampAsset: null,
      setActiveStampAsset: (asset) =>
        set((state) => {
          state.activeStampAsset = asset;
        }),
      activeLogicTileId: 1,
      activeLayerIdx: 0,
      activeLayerType: 'grid',
      brushRadius: 1,
      brushShape: 'circle',
      brushRotation: 0,
      setBrushRotation: (rot) =>
        set((state) => {
          state.brushRotation = ((rot % 360) + 360) % 360;
        }),
      selectionMode: 'box',
      setSelectionMode: (mode) =>
        set((state) => {
          state.selectionMode = mode;
        }),
      brushMode: 'paint',
      paintMode: 'stamp',
      setPaintMode: (mode: 'stamp' | 'paste') =>
        set((state) => {
          state.paintMode = mode;
        }),
      prefabStampMode: 'footprint',
      setPrefabStampMode: (mode: '1tile' | 'footprint') =>
        set((state) => {
          state.prefabStampMode = mode;
        }),
      stampScale: 1,
      setStampScale: (scale: number) =>
        set((state) => {
          state.stampScale = Math.max(0.05, Math.min(8.0, Number(scale) || 1));
          const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
          if (engine?.setStampScale) {
            engine.setStampScale(state.stampScale);
          }
        }),
      snapToGrid: false,
      setSnapToGrid: (snap: boolean) =>
        set((state) => {
          state.snapToGrid = snap;
        }),
      splatOpacity: 1.0,
      setSplatOpacity: (opacity: number) =>
        set((state) => {
          state.splatOpacity = Math.max(0.05, Math.min(1.0, opacity));
        }),
      splatScatter: 0.5,
      setSplatScatter: (scatter: number) =>
        set((state) => {
          state.splatScatter = Math.max(0.0, Math.min(1.0, scatter));
        }),
      splatRotationRandomize: false,
      setSplatRotationRandomize: (enabled: boolean) =>
        set((state) => {
          state.splatRotationRandomize = enabled;
        }),
      isAutoEdgeEnabled: false,
      setIsAutoEdgeEnabled: (enabled: boolean) =>
        set((state) => {
          state.isAutoEdgeEnabled = enabled;
        }),
      isStudioEscapeMenuOpen: false,
      setIsStudioEscapeMenuOpen: (open: boolean) =>
        set((state) => {
          state.isStudioEscapeMenuOpen = open;
        }),

      // 3D Voxel Core & Unified Editing Language (Option A)
      voxelBlockSizePx: 64,
      setVoxelBlockSizePx: (size: number) =>
        set((state) => {
          state.voxelBlockSizePx = Math.max(6, Math.min(1024, Number(size) || 64));
        }),
      activeVoxelMaterialId: 2,
      setActiveVoxelMaterialId: (id: number) =>
        set((state) => {
          state.activeVoxelMaterialId = id;
        }),
      activeVoxelShape: 1,
      setActiveVoxelShape: (shape: number) =>
        set((state) => {
          state.activeVoxelShape = shape;
        }),
      activeVoxelOrientation: 0,
      setActiveVoxelOrientation: (orient: number) =>
        set((state) => {
          state.activeVoxelOrientation = orient;
        }),
      voxelToolMode: 'block-pen',
      setVoxelToolMode: (mode) =>
        set((state) => {
          state.voxelToolMode = mode;
        }),
      customTerrainSwatches: [],
      addCustomTerrainSwatch: (swatch) =>
        set((state) => {
          state.customTerrainSwatches = [
            ...state.customTerrainSwatches.filter((s) => s.id !== swatch.id),
            swatch,
          ];
        }),
      removeCustomTerrainSwatch: (id) =>
        set((state) => {
          state.customTerrainSwatches = state.customTerrainSwatches.filter((s) => s.id !== id);
        }),
      customPropLibrary: [],
      addCustomPropItem: (prop) =>
        set((state) => {
          state.customPropLibrary = [
            ...state.customPropLibrary.filter((p) => p.id !== prop.id),
            prop,
          ];
        }),
      removeCustomPropItem: (id) =>
        set((state) => {
          state.customPropLibrary = state.customPropLibrary.filter((p) => p.id !== id);
        }),
      activeCustomPropId: null,
      setActiveCustomPropId: (id) =>
        set((state) => {
          state.activeCustomPropId = id;
        }),
      activePrefabId: null,
      prefabs: [],
      tileClipboard: null,
      tileDefinitions: [],
      selectedTileDefId: null,
      setTileDefinitions: (defs) =>
        set((state) => {
          state.tileDefinitions = typeof defs === 'function' ? defs(state.tileDefinitions) : defs;
        }),
      addTileDefinitions: (newDefs) =>
        set((state) => {
          const existingIds = new Set(state.tileDefinitions.map((d) => d.id));
          const filtered = newDefs.filter((d) => !existingIds.has(d.id));
          state.tileDefinitions = [...state.tileDefinitions, ...filtered];
        }),
      removeTileDefinition: (id) =>
        set((state) => {
          state.tileDefinitions = state.tileDefinitions.filter((d) => d.id !== id);
          if (state.selectedTileDefId === id) {
            state.selectedTileDefId = state.tileDefinitions[0]?.id || null;
          }
        }),
      setSelectedTileDefId: (id) =>
        set((state) => {
          state.selectedTileDefId = id;
        }),
      pendingGateConnection: null,
      setPendingGateConnection: (conn) =>
        set((state) => {
          state.pendingGateConnection = conn;
        }),
      gateConnectModal: null,
      openGateConnectModal: (originR, originC, initialCategory = 'MAP') =>
        set((state) => {
          state.gateConnectModal = {
            isOpen: true,
            originR,
            originC,
            initialCategory,
          };
        }),
      closeGateConnectModal: () =>
        set((state) => {
          state.gateConnectModal = null;
        }),
      stampTransform: { ...DEFAULT_STAMP_TRANSFORM },
      pasteMode: 'overlay',
      isPasting: false,
      activeSelectionGeometry: null,
      setSelectionGeometry: (geom) =>
        set((state) => {
          state.activeSelectionGeometry = geom;
          if (!geom) {
            state.selectedCells = {};
            state.selectionStart = null;
            state.selectionEnd = null;
            return;
          }
          const bbox = getGeometryBoundingBox(geom);
          state.selectionStart = { r: Math.floor(bbox.minZ), c: Math.floor(bbox.minX) };
          state.selectionEnd = { r: Math.ceil(bbox.maxZ), c: Math.ceil(bbox.maxX) };
          const map = (state as any).activeMapData || { width: 128, height: 128 };
          const gridBounds = {
            width: map.grid?.[0]?.length || map.width || 128,
            height: map.grid?.length || map.height || 128,
          };
          const cells = rasterizeGeometryToCells(geom, gridBounds, 1);
          const next: Record<string, boolean> = {};
          for (const cell of cells) {
            next[`${cell.r},${cell.c}`] = true;
          }
          state.selectedCells = next;
        }),
      selectionStart: null,
      selectionEnd: null,
      selectedCells: {},
      clickedTile: null,
      hoveredTile: null,
      hoveredVoxel: null,
      lastPaintedTile: null,
      showEditorCoords: true,
      showWarpOverlays: true,
      showSpawnOverlays: true,

      openMapTabs: ['DEMO_SANDBOX'],
      activeMapTab: 'DEMO_SANDBOX',
      isStudioFreeCam: false,
      canvasViewport: { 
        x: typeof window !== 'undefined' ? Math.max(360, Math.floor((window.innerWidth - 880) / 2)) : 360, 
        y: 48, 
        w: 880, 
        h: 620 
      },
      setCanvasViewport: (vp: { x: number; y: number; w: number; h: number }) =>
        set((state) => {
          state.canvasViewport = vp;
        }),
      openMapInTab: (mapId: string) =>
        set((state) => {
          if (!state.openMapTabs.includes(mapId)) {
            state.openMapTabs.push(mapId);
          }
          state.activeMapTab = mapId;
        }),
      closeMapTab: (mapId: string) =>
        set((state) => {
          state.openMapTabs = state.openMapTabs.filter((id) => id !== mapId);
          if (state.activeMapTab === mapId) {
            state.activeMapTab = state.openMapTabs[state.openMapTabs.length - 1] || null;
          }
        }),
      setActiveMapTab: (mapId: string) =>
        set((state) => {
          if (!state.openMapTabs.includes(mapId)) {
            state.openMapTabs.push(mapId);
          }
          state.activeMapTab = mapId;
        }),
      setStudioFreeCam: (enabled: boolean) =>
        set((state) => {
          state.isStudioFreeCam = enabled;
        }),

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
            state.activeBrushPattern = snap.activeBrushPattern;
            state.activeLogicTileId = snap.activeLogicTileId;
            state.activeLayerIdx = snap.activeLayerIdx;
            state.mapDirty = snap.mapDirty;
            state.brushRadius = snap.brushRadius;
            state.brushShape = snap.brushShape || 'circle';
            state.stampScale = snap.stampScale || 1;
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
          if (state.studioMode === mode) return;
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
          if (mode === 'develop') {
            if (state.activeLayerIdx === -1) {
              state.activeLayerIdx = 0;
              if (state.activeBrushTileId <= 12) {
                state.activeBrushTileId = DEFAULT_STUDIO_GROUND_GID;
              }
            }
          } else if (mode === 'logic') {
            state.activeLayerIdx = -1;
            if (state.activeLogicTileId > 50 || state.activeLogicTileId <= 0) {
              state.activeLogicTileId = 1;
            }
          }
          openModePanels(state, mode);
          if (!wasEditor) queueMicrotask(() => emitPieChanged(false));
        }),

      openPanel: (id) => {
        set((state) => {
          if (state.panels[id]) {
            state.panels[id].isOpen = true;
            state.highestZIndex += 1;
            state.panels[id].zIndex = state.highestZIndex;
            state.activePanel = id;
          }
        });
      },

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

      startPaintTransaction: () =>
        set((state) => {
          state.paintTransaction = [];
        }),

      commitPaintTransaction: () =>
        set((state) => {
          if (state.paintTransaction && state.paintTransaction.length > 0) {
            const deduplicated = deduplicatePaintedCells(state.paintTransaction);
            if (deduplicated.length > 0) {
              state.opStack = pushEditorOp(state.opStack, {
                kind: 'paint_cells',
                cells: deduplicated,
              });
              state.mapDirty = true;
              state.hasUnsavedChanges = true;
            }
          }
          state.paintTransaction = null;
        }),

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
      
      incrementDataVersion: () =>
        set((state) => {
          state.dataVersion += 1;
        }),

      setActiveBrushTileId: (id, keepPattern) =>
        set((state) => {
          state.activeBrushTileId = id;
          if (!keepPattern) {
            state.activeBrushPattern = null;
            state.prefabStampMode = '1tile';
          }
        }),
      setActiveBrushPattern: (pattern) =>
        set((state) => {
          state.activeBrushPattern = pattern;
          if (pattern && pattern.gids?.[0]?.[0] !== undefined) {
            state.activeBrushTileId = pattern.gids[0][0];
            state.prefabStampMode = (pattern.w > 1 || pattern.h > 1) ? 'footprint' : '1tile';
          } else if (!pattern) {
            state.prefabStampMode = '1tile';
          }
        }),
      setActiveLogicTileId: (id) =>
        set((state) => {
          state.activeLogicTileId = id;
        }),
      setActiveLayerIdx: (idx) =>
        set((state) => {
          const prev = state.activeLayerIdx;
          state.activeLayerIdx = idx;

          if (idx === -1) {
            // Switching to Logic Mode: open Logic Painter, close Tile Selector
            state.studioMode = 'logic';
            if (state.activeLogicTileId > 50 || state.activeLogicTileId <= 0) {
              state.activeLogicTileId = 1;
            }
            if (state.panels.logic) {
              state.panels.logic.isOpen = true;
              state.highestZIndex += 1;
              state.panels.logic.zIndex = state.highestZIndex;
              state.activePanel = 'logic';
            }
            if (state.panels.tileset) {
              state.panels.tileset.isOpen = false;
            }
            state.brushMode = 'paint';
          } else {
            // Switching to Visual Paint Mode: open Tile Selector, close Logic Painter
            state.studioMode = 'develop';
            if (prev === -1 && state.activeBrushTileId <= 12) {
              state.activeBrushTileId = DEFAULT_STUDIO_GROUND_GID;
            }
            if (state.panels.tileset) {
              state.panels.tileset.isOpen = true;
              state.highestZIndex += 1;
              state.panels.tileset.zIndex = state.highestZIndex;
              state.activePanel = 'tileset';
            }
            if (state.panels.logic) {
              state.panels.logic.isOpen = false;
            }
            state.brushMode = 'paint';
          }
        }),
      setActiveLayerType: (type) =>
        set((state) => {
          state.activeLayerType = type;
        }),
      setClickedTile: (tile) =>
        set((state) => {
          state.clickedTile = tile;
        }),
      setHoveredTile: (tile) =>
        set((state) => {
          if (
            (state.hoveredTile === null && tile === null) ||
            (state.hoveredTile && tile && state.hoveredTile.r === tile.r && state.hoveredTile.c === tile.c)
          ) {
            return;
          }
          state.hoveredTile = tile;
        }),
      setHoveredVoxel: (voxel) =>
        set((state) => {
          if (
            (state.hoveredVoxel === null && voxel === null) ||
            (state.hoveredVoxel &&
              voxel &&
              state.hoveredVoxel.wx === voxel.wx &&
              state.hoveredVoxel.wy === voxel.wy &&
              state.hoveredVoxel.wz === voxel.wz)
          ) {
            return;
          }
          state.hoveredVoxel = voxel;
        }),
      setLastPaintedTile: (tile) =>
        set((state) => {
          state.lastPaintedTile = tile;
        }),
      setShowEditorCoords: (on) =>
        set((state) => {
          state.showEditorCoords = on;
        }),
      setShowWarpOverlays: (on) =>
        set((state) => {
          state.showWarpOverlays = on;
        }),
      setShowSpawnOverlays: (on) =>
        set((state) => {
          state.showSpawnOverlays = on;
        }),
      setBrushRadius: (radius) =>
        set((state) => {
          state.brushRadius = Math.max(1, Math.min(10, radius));
        }),
      setBrushShape: (shape) =>
        set((state) => {
          state.brushShape = shape;
        }),
      setBrushMode: (mode) =>
        set((state) => {
          state.brushMode = mode;
        }),
      setActivePrefabId: (id) =>
        set((state) => {
          state.activePrefabId = id;
        }),
      setPrefabs: (prefabs) =>
        set((state) => {
          state.prefabs = prefabs;
        }),
      setPasteMode: (mode) =>
        set((state) => {
          state.pasteMode = mode;
        }),
      setIsPasting: (pasting) =>
        set((state) => {
          state.isPasting = pasting;
        }),
      setSelectionStart: (tile) =>
        set((state) => {
          state.selectionStart = tile;
        }),
      setSelectionEnd: (tile) =>
        set((state) => {
          state.selectionEnd = tile;
        }),
      addSelectedCell: (r, c) =>
        set((state) => {
          state.selectedCells[`${r},${c}`] = true;
        }),
      removeSelectedCell: (r, c) =>
        set((state) => {
          delete state.selectedCells[`${r},${c}`];
        }),
      toggleSelectedCell: (r, c) =>
        set((state) => {
          const key = `${r},${c}`;
          if (state.selectedCells[key]) {
            delete state.selectedCells[key];
          } else {
            state.selectedCells[key] = true;
          }
        }),
      setSelectionBox: (minR, maxR, minC, maxC) =>
        set((state) => {
          const r0 = Math.min(minR, maxR);
          const r1 = Math.max(minR, maxR);
          const c0 = Math.min(minC, maxC);
          const c1 = Math.max(minC, maxC);
          state.activeSelectionGeometry = {
            type: 'rectangle',
            minX: c0,
            minZ: r0,
            maxX: c1 + 1,
            maxZ: r1 + 1,
          };
          state.selectionStart = { r: r0, c: c0 };
          state.selectionEnd = { r: r1, c: c1 };
        }),
      setSelectionCircle: (centerR, centerC, radius) =>
        set((state) => {
          state.activeSelectionGeometry = {
            type: 'circle',
            centerX: centerC,
            centerZ: centerR,
            radius,
          };
          const r0 = Math.floor(centerR - radius);
          const r1 = Math.ceil(centerR + radius);
          const c0 = Math.floor(centerC - radius);
          const c1 = Math.ceil(centerC + radius);
          state.selectionStart = { r: r0, c: c0 };
          state.selectionEnd = { r: r1, c: c1 };
        }),
      setSelectionEllipse: (centerR, centerC, radiusX, radiusZ, rotation = 0) =>
        set((state) => {
          state.activeSelectionGeometry = {
            type: 'ellipse',
            centerX: centerC,
            centerZ: centerR,
            radiusX,
            radiusZ,
            rotation,
          };
          const maxRad = Math.max(radiusX, radiusZ);
          const r0 = Math.floor(centerR - maxRad);
          const r1 = Math.ceil(centerR + maxRad);
          const c0 = Math.floor(centerC - maxRad);
          const c1 = Math.ceil(centerC + maxRad);
          state.selectionStart = { r: r0, c: c0 };
          state.selectionEnd = { r: r1, c: c1 };
        }),
      setSelectionRegularPolygon: (centerR, centerC, radius, sides, rotation = 0) =>
        set((state) => {
          state.activeSelectionGeometry = {
            type: 'regularPolygon',
            centerX: centerC,
            centerZ: centerR,
            radius,
            sides,
            rotation,
          };
          const r0 = Math.floor(centerR - radius);
          const r1 = Math.ceil(centerR + radius);
          const c0 = Math.floor(centerC - radius);
          const c1 = Math.ceil(centerC + radius);
          state.selectionStart = { r: r0, c: c0 };
          state.selectionEnd = { r: r1, c: c1 };
        }),
      setSelectionPolygon: (points) =>
        set((state) => {
          if (!points.length) return;
          state.activeSelectionGeometry = {
            type: 'polygon',
            points: points.map((p) => ({ x: p.c + 0.5, z: p.r + 0.5 })),
          };
          let minR = points[0].r, maxR = points[0].r;
          let minC = points[0].c, maxC = points[0].c;
          points.forEach((p) => {
            if (p.r < minR) minR = p.r;
            if (p.r > maxR) maxR = p.r;
            if (p.c < minC) minC = p.c;
            if (p.c > maxC) maxC = p.c;
          });
          state.selectionStart = { r: Math.floor(minR), c: Math.floor(minC) };
          state.selectionEnd = { r: Math.ceil(maxR), c: Math.ceil(maxC) };
        }),
      setSelectionFreehand: (strokes, strokeWidth = 0.5) =>
        set((state) => {
          if (!strokes.length) return;
          state.activeSelectionGeometry = {
            type: 'freehand',
            strokes,
            strokeWidth,
          };
          let minX = strokes[0].x, maxX = strokes[0].x;
          let minZ = strokes[0].z, maxZ = strokes[0].z;
          strokes.forEach((s) => {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.z < minZ) minZ = s.z;
            if (s.z > maxZ) maxZ = s.z;
          });
          state.selectionStart = { r: Math.floor(minZ), c: Math.floor(minX) };
          state.selectionEnd = { r: Math.ceil(maxZ), c: Math.ceil(maxX) };
        }),
      addSelectedBox: (minR, maxR, minC, maxC) =>
        set((state) => {
          const r0 = Math.min(minR, maxR);
          const r1 = Math.max(minR, maxR);
          const c0 = Math.min(minC, maxC);
          const c1 = Math.max(minC, maxC);
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              state.selectedCells[`${r},${c}`] = true;
            }
          }
        }),
      removeSelectedBox: (minR, maxR, minC, maxC) =>
        set((state) => {
          const r0 = Math.min(minR, maxR);
          const r1 = Math.max(minR, maxR);
          const c0 = Math.min(minC, maxC);
          const c1 = Math.max(minC, maxC);
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              delete state.selectedCells[`${r},${c}`];
            }
          }
        }),
      clearSelectedCells: () =>
        set((state) => {
          state.activeSelectionGeometry = null;
          state.selectedCells = {};
          state.selectionStart = null;
          state.selectionEnd = null;
        }),
      setSelectedCells: (cells) =>
        set((state) => {
          state.selectedCells = cells;
        }),
      getSelectedBounds: () => {
        const cells = get().selectedCells;
        const bounds = getCellsBoundingBox(cells);
        if (bounds) return bounds;
        const start = get().selectionStart;
        const end = get().selectionEnd;
        if (start && end) {
          const minR = Math.min(start.r, end.r);
          const maxR = Math.max(start.r, end.r);
          const minC = Math.min(start.c, end.c);
          const maxC = Math.max(start.c, end.c);
          return {
            minR,
            maxR,
            minC,
            maxC,
            width: maxC - minC + 1,
            height: maxR - minR + 1,
            count: (maxR - minR + 1) * (maxC - minC + 1),
          };
        }
        return null;
      },
      getSelectedCount: () => {
        const keys = Object.keys(get().selectedCells);
        if (keys.length > 0) return keys.length;
        const bounds = get().getSelectedBounds();
        return bounds ? bounds.count : 0;
      },
      markMapDirty: () =>
        set((state) => {
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
        }),
      clearMapDirty: () =>
        set((state) => {
          state.mapDirty = false;
          state.hasUnsavedChanges = false;
        }),
      setHasUnsavedChanges: (val) =>
        set((state) => {
          state.hasUnsavedChanges = val;
          state.mapDirty = val;
        }),
      setIsSavingMap: (val) =>
        set((state) => {
          state.isSavingMap = val;
        }),

      pushPaintOp: (cells) =>
        set((state) => {
          if (state.paintTransaction) {
            state.paintTransaction.push(...cells);
          } else {
            const deduplicated = deduplicatePaintedCells(cells);
            if (deduplicated.length > 0) {
              state.opStack = pushEditorOp(state.opStack, {
                kind: 'paint_cells',
                cells: deduplicated,
              });
              state.mapDirty = true;
              state.hasUnsavedChanges = true;
            }
          }
        }),

      pushVoxelOp: (voxels) =>
        set((state) => {
          if (voxels.length === 0) return;
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_voxels',
            voxels,
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
        }),

      pushFreeformOp: (before, after) =>
        set((state) => {
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'modify_freeform_layers',
            before: JSON.parse(JSON.stringify(before || [])),
            after: JSON.parse(JSON.stringify(after || [])),
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
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

      triggerUndo: (map) => {
        const res = get().undoLastOp(map);
        if (!res.ok || !res.op) return res;
        dispatchOpEvents(res.op, 'undo');
        return res;
      },

      triggerRedo: (map) => {
        const res = get().redoLastOp(map);
        if (!res.ok || !res.op) return res;
        dispatchOpEvents(res.op, 'redo');
        return res;
      },


      deleteSelectionTiles: (map, engine, targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const hasSparseSelection = Object.keys(selectedCells).length > 0;
        const start = get().selectionStart;
        const end = get().selectionEnd;
        const hovered = get().hoveredTile;
        const geom = get().activeSelectionGeometry;

        if (get().studioMode === 'voxel') {
          const voxelDoc = (map as any)?.voxelDoc;
          if (!voxelDoc) return { count: 0, layerIdx, error: 'No voxelDoc on map.' };
          const world = (map as any).__voxelWorldInstance || VoxelWorld.deserializeFromDoc(voxelDoc);
          const mapHeight = map.grid?.length || (map as any).height || 24;
          const changedVoxels: PaintedVoxel[] = [];

          const clearColumn = (r: number, c: number) => {
            const wx = c;
            const wz = mapHeight - 1 - r;
            for (let wy = 0; wy < world.totalHeightBlocks; wy++) {
              const before = world.getVoxel(wx, wy, wz);
              if (before !== VOXEL_WORD_AIR) {
                world.setVoxel(wx, wy, wz, VOXEL_WORD_AIR);
                changedVoxels.push({ wx, wy, wz, before, after: VOXEL_WORD_AIR });
              }
            }
          };

          if (geom && geom.type !== 'rectangle') {
            const width = map.grid?.[0]?.length || (map as any).width || 24;
            const height = map.grid?.length || (map as any).height || 24;
            const cells = rasterizeGeometryToCells(geom, { width, height });
            for (const key of Object.keys(cells)) {
              const [r, c] = key.split(',').map(Number);
              clearColumn(r, c);
            }
          } else if (hasSparseSelection) {
            for (const key of Object.keys(selectedCells)) {
              const [r, c] = key.split(',').map(Number);
              clearColumn(r, c);
            }
          } else if (start && end) {
            const minR = Math.min(start.r, end.r);
            const maxR = Math.max(start.r, end.r);
            const minC = Math.min(start.c, end.c);
            const maxC = Math.max(start.c, end.c);
            for (let r = minR; r <= maxR; r++) {
              for (let c = minC; c <= maxC; c++) {
                clearColumn(r, c);
              }
            }
          } else if (hovered) {
            clearColumn(hovered.r, hovered.c);
          }

          if (changedVoxels.length > 0) {
            (map as any).voxelDoc = world.serializeToDoc();
            get().pushVoxelOp(changedVoxels);
            get().markMapDirty();
            if (engine?.meshDirtyVoxelChunks) engine.meshDirtyVoxelChunks();
          }
          return { count: changedVoxels.length, layerIdx };
        }

        let eraseResult;
        if (geom && geom.type !== 'rectangle') {
          const width = map.grid?.[0]?.length || (map as any).width || 24;
          const height = map.grid?.length || (map as any).height || 24;
          const cells = rasterizeGeometryToCells(geom, { width, height });
          eraseResult = eraseSparseCells({
            map,
            layerIdx,
            cells,
          });
        } else if (hasSparseSelection) {
          eraseResult = eraseSparseCells({
            map,
            layerIdx,
            cells: selectedCells,
          });
        } else if (start && end) {
          eraseResult = eraseTilesInRegion({
            map,
            layerIdx,
            minR: Math.min(start.r, end.r),
            maxR: Math.max(start.r, end.r),
            minC: Math.min(start.c, end.c),
            maxC: Math.max(start.c, end.c),
          });
        } else if (hovered) {
          eraseResult = eraseTilesInRegion({
            map,
            layerIdx,
            minR: hovered.r,
            maxR: hovered.r,
            minC: hovered.c,
            maxC: hovered.c,
          });
        } else {
          return { count: 0, layerIdx, error: 'No selection or tile to delete.' };
        }

        if (!eraseResult.ok) {
          return { count: 0, layerIdx, error: eraseResult.reason };
        }

        const erasedCells = eraseResult.cells;
        if (erasedCells.length > 0) {
          set((state) => {
            state.opStack = pushEditorOp(state.opStack, {
              kind: 'paint_cells',
              cells: erasedCells,
            });
            state.mapDirty = true;
            state.hasUnsavedChanges = true;
            state.selectedCells = {};
            state.selectionStart = null;
            state.selectionEnd = null;
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
                detail: {
                  cells: erasedCells.map((c) => ({
                    layerIdx: c.layerIdx,
                    r: c.r,
                    c: c.c,
                    value: 0,
                  })),
                },
              })
            );
          }
        } else {
          set((state) => {
            state.selectedCells = {};
            state.selectionStart = null;
            state.selectionEnd = null;
          });
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }

        return { count: erasedCells.length, layerIdx };
      },

      paintSelection: (map, engine, targetLayerIdx, customTileId) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const hasSparseSelection = Object.keys(selectedCells).length > 0;
        const start = get().selectionStart;
        const end = get().selectionEnd;
        const hovered = get().hoveredTile;
        const geom = get().activeSelectionGeometry;

        if (get().studioMode === 'voxel') {
          const voxelDoc = (map as any)?.voxelDoc;
          if (!voxelDoc) return { count: 0, layerIdx, error: 'No voxelDoc on map.' };
          const world = (map as any).__voxelWorldInstance || VoxelWorld.deserializeFromDoc(voxelDoc);
          const mapHeight = map.grid?.length || (map as any).height || 24;
          const matId = get().activeVoxelMaterialId || 1;
          const shapeId = get().activeVoxelShape || 0;
          const orient = get().activeVoxelOrientation || 0;
          const physics = get().activeVoxelPhysics || 0;
          const voxelWord = packVoxel(matId, shapeId, orient, 0, physics, 0);
          const changedVoxels: PaintedVoxel[] = [];

          const paintColumn = (r: number, c: number) => {
            const wx = c;
            const wz = mapHeight - 1 - r;
            const wy = get().hoveredVoxel?.wy ?? 16;
            const before = world.getVoxel(wx, wy, wz);
            if (before !== voxelWord) {
              world.setVoxel(wx, wy, wz, voxelWord);
              changedVoxels.push({ wx, wy, wz, before, after: voxelWord });
            }
          };

          if (geom && geom.type !== 'rectangle') {
            const width = map.grid?.[0]?.length || (map as any).width || 24;
            const height = map.grid?.length || (map as any).height || 24;
            const cells = rasterizeGeometryToCells(geom, { width, height });
            for (const key of Object.keys(cells)) {
              const [r, c] = key.split(',').map(Number);
              paintColumn(r, c);
            }
          } else if (hasSparseSelection) {
            for (const key of Object.keys(selectedCells)) {
              const [r, c] = key.split(',').map(Number);
              paintColumn(r, c);
            }
          } else if (start && end) {
            const minR = Math.min(start.r, end.r);
            const maxR = Math.max(start.r, end.r);
            const minC = Math.min(start.c, end.c);
            const maxC = Math.max(start.c, end.c);
            for (let r = minR; r <= maxR; r++) {
              for (let c = minC; c <= maxC; c++) {
                paintColumn(r, c);
              }
            }
          } else if (hovered) {
            paintColumn(hovered.r, hovered.c);
          }

          if (changedVoxels.length > 0) {
            (map as any).voxelDoc = world.serializeToDoc();
            get().pushVoxelOp(changedVoxels);
            get().markMapDirty();
            if (engine?.meshDirtyVoxelChunks) engine.meshDirtyVoxelChunks();
          }
          return { count: changedVoxels.length, layerIdx };
        }

        const tileId =
          customTileId !== undefined
            ? customTileId
            : layerIdx === -1
            ? get().activeLogicTileId
            : get().activeBrushTileId;

        if (!map) return { count: 0, layerIdx, error: 'No active map.' };

        let paintResult: { ok: boolean; count?: number; cells?: PaintedCell[]; reason?: string } = { ok: false };
        if (geom && geom.type !== 'rectangle') {
          const width = map.grid?.[0]?.length || (map as any).width || 24;
          const height = map.grid?.length || (map as any).height || 24;
          const cells = rasterizeGeometryToCells(geom, { width, height });
          paintResult = paintSparseCells({
            map,
            layerIdx,
            cells,
            tileId,
          });
        } else if (hasSparseSelection) {
          paintResult = paintSparseCells({
            map,
            layerIdx,
            cells: selectedCells,
            tileId,
          });
        } else if (start && end) {
          if (get().paintMode === 'paste' && get().activeBrushPattern) {
            const pat = get().activeBrushPattern!;
            const r0 = Math.min(start.r, end.r);
            const c0 = Math.min(start.c, end.c);
            const r1 = Math.max(start.r, end.r);
            const c1 = Math.max(start.c, end.c);
            
            const changed: any[] = [];
            const targetGrid = layerIdx === -1 ? map.grid : map.tileLayers?.[layerIdx]?.grid;
            
            if (targetGrid) {
              for (let r = r0; r <= r1; r++) {
                if (!targetGrid[r] || Object.isFrozen(targetGrid[r])) continue;
                for (let c = c0; c <= c1; c++) {
                  const pr = (r - r0) % pat.h;
                  const pc = (c - c0) % pat.w;
                  const patGid = pat.gids[pr]?.[pc] || 0;
                  if (patGid > 0) {
                    const prev = targetGrid[r][c] || 0;
                    if (prev !== patGid) {
                      targetGrid[r][c] = patGid;
                      changed.push({ layerIdx, r, c, before: prev, after: patGid });
                    }
                  }
                }
              }
              paintResult = { ok: true, cells: changed };
            } else {
              paintResult = { ok: false, reason: 'Target grid missing' };
            }
          } else {
            paintResult = paintTilesInRegion({
              map,
              layerIdx,
              minR: Math.min(start.r, end.r),
              maxR: Math.max(start.r, end.r),
              minC: Math.min(start.c, end.c),
              maxC: Math.max(start.c, end.c),
              tileId,
            });
          }
        } else if (hovered) {
          if (get().paintMode === 'paste' && get().activeBrushPattern) {
            const pat = get().activeBrushPattern!;
            const changed: any[] = [];
            const targetGrid = layerIdx === -1 ? map.grid : map.tileLayers?.[layerIdx]?.grid;
            
            if (targetGrid) {
              for (let pr = 0; pr < pat.h; pr++) {
                for (let pc = 0; pc < pat.w; pc++) {
                  const r = hovered.r + pr;
                  const c = hovered.c + pc;
                  if (targetGrid[r] && !Object.isFrozen(targetGrid[r]) && c < targetGrid[r].length) {
                    const patGid = pat.gids[pr]?.[pc] || 0;
                    if (patGid > 0) {
                      const prev = targetGrid[r][c] || 0;
                      if (prev !== patGid) {
                        targetGrid[r][c] = patGid;
                        changed.push({ layerIdx, r, c, before: prev, after: patGid });
                      }
                    }
                  }
                }
              }
              paintResult = { ok: true, cells: changed };
            } else {
              paintResult = { ok: false, reason: 'Target grid missing' };
            }
          } else {
            paintResult = paintTilesInRegion({
              map,
              layerIdx,
              minR: hovered.r,
              maxR: hovered.r,
              minC: hovered.c,
              maxC: hovered.c,
              tileId,
            });
          }
        } else {
          return { count: 0, layerIdx, error: 'No selection or tile to paint.' };
        }

        if (!paintResult.ok) {
          return { count: 0, layerIdx, error: paintResult.reason };
        }

        const paintedCells = paintResult.cells || [];
        if (paintedCells.length > 0) {
          set((state) => {
            state.opStack = pushEditorOp(state.opStack, {
              kind: 'paint_cells',
              cells: paintedCells,
            });
            state.mapDirty = true;
            state.hasUnsavedChanges = true;
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
                detail: {
                  cells: paintedCells.map((c) => ({
                    layerIdx: c.layerIdx,
                    r: c.r,
                    c: c.c,
                    value: c.after,
                  })),
                },
              })
            );
          }

          const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
          if (activeEng) {
            for (const c of paintedCells) {
              if (c.layerIdx === -1) {
                if (!activeEng.updateLogicTile(c.r, c.c, c.after)) {
                  activeEng.enableLogicGridOverlay(map.grid || []);
                  activeEng.updateLogicTile(c.r, c.c, c.after);
                }
              } else {
                activeEng.updateSingleTile(c.r, c.c, c.after, c.layerIdx, map.tilesets);
              }
            }
          }
        }

        return { count: paintedCells.length, layerIdx };
      },

      fillSelection: (map, engine, targetLayerIdx, customTileId) => {
        return get().paintSelection(map, engine, targetLayerIdx, customTileId);
      },

      eraseSelection: (map, engine, targetLayerIdx) => {
        return get().deleteSelectionTiles(map, engine, targetLayerIdx);
      },

      rotateSelection: (map, engine, angle = 90, targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const bounds = get().getSelectedBounds();
        if (!map) return { ok: false, error: 'No active map.' };

        const rot = (angle % 360) as 0 | 90 | 180 | 270;
        const transform: StampTransform = { flipH: false, flipV: false, rotation: rot };

        const res = transformSelectionInPlace({
          map,
          layerIdx,
          cells: Object.keys(selectedCells).length > 0 ? selectedCells : undefined,
          bounds: bounds ? { minR: bounds.minR, maxR: bounds.maxR, minC: bounds.minC, maxC: bounds.maxC } : undefined,
          transform,
        });

        if (!res.ok || res.cells.length === 0) {
          return { ok: false, error: res.error || 'Nothing to rotate.' };
        }

        set((state) => {
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_cells',
            cells: res.cells,
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
          if (res.newCells && Object.keys(res.newCells).length > 0) {
            state.selectedCells = res.newCells;
          }
          if (res.newBounds) {
            state.selectionStart = { r: res.newBounds.minR, c: res.newBounds.minC };
            state.selectionEnd = { r: res.newBounds.maxR, c: res.newBounds.maxC };
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: res.cells.map((c) => ({
                  layerIdx: c.layerIdx,
                  r: c.r,
                  c: c.c,
                  value: c.after,
                })),
              },
            })
          );
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng) {
          for (const c of res.cells) {
            if (c.layerIdx === -1) {
              if (!activeEng.updateLogicTile(c.r, c.c, c.after)) {
                activeEng.enableLogicGridOverlay(map.grid || []);
                activeEng.updateLogicTile(c.r, c.c, c.after);
              }
            } else {
              activeEng.updateSingleTile(c.r, c.c, c.after, c.layerIdx, map.tilesets);
            }
          }
          if (activeEng.setMultiSelectionPreview && res.newCells) {
            activeEng.setMultiSelectionPreview(res.newCells);
          }
        }

        return { ok: true, count: res.cells.length };
      },

      flipSelection: (map, engine, axis = 'h', targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const bounds = get().getSelectedBounds();
        if (!map) return { ok: false, error: 'No active map.' };

        const transform: StampTransform = {
          flipH: axis === 'h',
          flipV: axis === 'v',
          rotation: 0,
        };

        const res = transformSelectionInPlace({
          map,
          layerIdx,
          cells: Object.keys(selectedCells).length > 0 ? selectedCells : undefined,
          bounds: bounds ? { minR: bounds.minR, maxR: bounds.maxR, minC: bounds.minC, maxC: bounds.maxC } : undefined,
          transform,
        });

        if (!res.ok || res.cells.length === 0) {
          return { ok: false, error: res.error || 'Nothing to flip.' };
        }

        set((state) => {
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_cells',
            cells: res.cells,
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
          if (res.newCells && Object.keys(res.newCells).length > 0) {
            state.selectedCells = res.newCells;
          }
          if (res.newBounds) {
            state.selectionStart = { r: res.newBounds.minR, c: res.newBounds.minC };
            state.selectionEnd = { r: res.newBounds.maxR, c: res.newBounds.maxC };
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: res.cells.map((c) => ({
                  layerIdx: c.layerIdx,
                  r: c.r,
                  c: c.c,
                  value: c.after,
                })),
              },
            })
          );
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng) {
          for (const c of res.cells) {
            if (c.layerIdx === -1) {
              if (!activeEng.updateLogicTile(c.r, c.c, c.after)) {
                activeEng.enableLogicGridOverlay(map.grid || []);
                activeEng.updateLogicTile(c.r, c.c, c.after);
              }
            } else {
              activeEng.updateSingleTile(c.r, c.c, c.after, c.layerIdx, map.tilesets);
            }
          }
          if (activeEng.setMultiSelectionPreview && res.newCells) {
            activeEng.setMultiSelectionPreview(res.newCells);
          }
        }

        return { ok: true, count: res.cells.length };
      },

      duplicateSelection: (map, engine, offsetR = 1, offsetC = 1, targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const bounds = get().getSelectedBounds();
        if (!map) return { ok: false, error: 'No active map.' };

        const res = duplicateSelectionOnMap({
          map,
          layerIdx,
          cells: Object.keys(selectedCells).length > 0 ? selectedCells : undefined,
          bounds: bounds ? { minR: bounds.minR, maxR: bounds.maxR, minC: bounds.minC, maxC: bounds.maxC } : undefined,
          offsetR,
          offsetC,
        });

        if (!res.ok || res.cells.length === 0) {
          return { ok: false, error: res.error || 'Nothing to duplicate.' };
        }

        set((state) => {
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_cells',
            cells: res.cells,
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
          if (res.newCells && Object.keys(res.newCells).length > 0) {
            state.selectedCells = res.newCells;
          }
          if (res.newBounds) {
            state.selectionStart = { r: res.newBounds.minR, c: res.newBounds.minC };
            state.selectionEnd = { r: res.newBounds.maxR, c: res.newBounds.maxC };
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: res.cells.map((c) => ({
                  layerIdx: c.layerIdx,
                  r: c.r,
                  c: c.c,
                  value: c.after,
                })),
              },
            })
          );
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng) {
          for (const c of res.cells) {
            if (c.layerIdx === -1) {
              if (!activeEng.updateLogicTile(c.r, c.c, c.after)) {
                activeEng.enableLogicGridOverlay(map.grid || []);
                activeEng.updateLogicTile(c.r, c.c, c.after);
              }
            } else {
              activeEng.updateSingleTile(c.r, c.c, c.after, c.layerIdx, map.tilesets);
            }
          }
          if (activeEng.setMultiSelectionPreview && res.newCells) {
            activeEng.setMultiSelectionPreview(res.newCells);
          }
        }

        return { ok: true, count: res.cells.length };
      },

      moveSelection: (map, engine, offsetR = 1, offsetC = 1, targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const bounds = get().getSelectedBounds();
        if (!map) return { ok: false, error: 'No active map.' };

        const res = moveSelectionOnMap({
          map,
          layerIdx,
          cells: Object.keys(selectedCells).length > 0 ? selectedCells : undefined,
          bounds: bounds ? { minR: bounds.minR, maxR: bounds.maxR, minC: bounds.minC, maxC: bounds.maxC } : undefined,
          offsetR,
          offsetC,
        });

        if (!res.ok || res.cells.length === 0) {
          return { ok: false, error: res.error || 'Nothing to move.' };
        }

        set((state) => {
          state.opStack = pushEditorOp(state.opStack, {
            kind: 'paint_cells',
            cells: res.cells,
          });
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
          if (res.newCells && Object.keys(res.newCells).length > 0) {
            state.selectedCells = res.newCells;
          }
          if (res.newBounds) {
            state.selectionStart = { r: res.newBounds.minR, c: res.newBounds.minC };
            state.selectionEnd = { r: res.newBounds.maxR, c: res.newBounds.maxC };
          }
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: res.cells.map((c) => ({
                  layerIdx: c.layerIdx,
                  r: c.r,
                  c: c.c,
                  value: c.after,
                })),
              },
            })
          );
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng) {
          for (const c of res.cells) {
            if (c.layerIdx === -1) {
              if (!activeEng.updateLogicTile(c.r, c.c, c.after)) {
                activeEng.enableLogicGridOverlay(map.grid || []);
                activeEng.updateLogicTile(c.r, c.c, c.after);
              }
            } else {
              activeEng.updateSingleTile(c.r, c.c, c.after, c.layerIdx, map.tilesets);
            }
          }
          if (activeEng.setMultiSelectionPreview && res.newCells) {
            activeEng.setMultiSelectionPreview(res.newCells);
          }
        }

        return { ok: true, count: res.cells.length };
      },


      copySelection: (map, targetLayerIdx) => {
        const layerIdx = targetLayerIdx ?? get().activeLayerIdx;
        const selectedCells = get().selectedCells;
        const hasSparseSelection = Object.keys(selectedCells).length > 0;
        const start = get().selectionStart;
        const end = get().selectionEnd;
        const hovered = get().hoveredTile;

        let clipboard: TileClipboardData | null = null;
        const geom = get().activeSelectionGeometry;
        if (geom && geom.type !== 'rectangle') {
          const width = map.grid?.[0]?.length || (map as any).width || 24;
          const height = map.grid?.length || (map as any).height || 24;
          const cells = rasterizeGeometryToCells(geom, { width, height });
          clipboard = extractSparseCellsFromMap({
            map,
            cells,
            activeLayerIdx: layerIdx,
          });
        } else if (hasSparseSelection) {
          clipboard = extractSparseCellsFromMap({
            map,
            cells: selectedCells,
            activeLayerIdx: layerIdx,
          });
        } else if (start && end) {
          clipboard = extractSubgridFromMap({
            map,
            minR: Math.min(start.r, end.r),
            maxR: Math.max(start.r, end.r),
            minC: Math.min(start.c, end.c),
            maxC: Math.max(start.c, end.c),
            activeLayerIdx: layerIdx,
          });
        } else if (hovered) {
          clipboard = extractSubgridFromMap({
            map,
            minR: hovered.r,
            maxR: hovered.r,
            minC: hovered.c,
            maxC: hovered.c,
            activeLayerIdx: layerIdx,
          });
        } else {
          return { ok: false, error: 'Select an area or hover a tile first.' };
        }

        if (!clipboard) return { ok: false, error: 'Failed to extract selection.' };

        set((state) => {
          state.tileClipboard = clipboard;
        });

        return { ok: true, width: clipboard.width, height: clipboard.height };
      },

      cutSelection: (map, engine, targetLayerIdx) => {
        const copyRes = get().copySelection(map, targetLayerIdx);
        if (!copyRes.ok) return copyRes;

        const delRes = get().deleteSelectionTiles(map, engine, targetLayerIdx);
        return {
          ok: true,
          width: copyRes.width,
          height: copyRes.height,
          count: delRes.count,
          error: delRes.error,
        };
      },

      pasteClipboard: (map, engine, targetR, targetC, customMode) => {
        const clip = get().tileClipboard;
        if (!clip) return { ok: false, error: 'Clipboard is empty. Copy tiles first (Ctrl+C).' };
        if (!map) return { ok: false, error: 'No active map.' };

        let activeClip = clip;
        const transform = get().stampTransform;
        if (transform && (transform.flipH || transform.flipV || transform.rotation !== 0)) {
          activeClip = transformClipboard(clip, transform);
        }

        const mode = customMode ?? get().pasteMode ?? 'overlay';
        const bounds = get().getSelectedBounds();
        
        let r = targetR;
        let c = targetC;
        if (typeof r !== 'number' || typeof c !== 'number') {
          if (bounds) {
            r = bounds.minR;
            c = bounds.minC;
          } else {
            r = get().hoveredTile?.r ?? activeClip.sourceOrigin?.r ?? 0;
            c = get().hoveredTile?.c ?? activeClip.sourceOrigin?.c ?? 0;
          }
        }
        const safeR = r ?? 0;
        const safeC = c ?? 0;

        const activeLayer = get().activeLayerIdx;

        const stampRes = stampClipboardOntoMap({
          map,
          clipboard: activeClip,
          targetR: safeR,
          targetC: safeC,
          mode,
          activeLayerIdx: activeLayer,
        });

        if (!stampRes.ok || stampRes.cells.length === 0) {
          return { ok: false, error: stampRes.error || 'Nothing pasted.' };
        }

        const op: EditorOp =
          stampRes.newLayerCreated && stampRes.createdLayer && typeof stampRes.newLayerIdx === 'number'
            ? {
                kind: 'compound',
                description: 'Paste onto New Layer',
                ops: [
                  {
                    kind: 'create_layer',
                    layerIdx: stampRes.newLayerIdx,
                    layer: stampRes.createdLayer,
                  },
                  {
                    kind: 'paint_cells',
                    cells: stampRes.cells,
                  },
                ],
              }
            : {
                kind: 'paint_cells',
                cells: stampRes.cells,
              };

        set((state) => {
          state.opStack = pushEditorOp(state.opStack, op);
          state.mapDirty = true;
          state.hasUnsavedChanges = true;
          if (stampRes.newLayerCreated && typeof stampRes.newLayerIdx === 'number') {
            state.activeLayerIdx = stampRes.newLayerIdx;
          }
        });


        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: stampRes.cells.map((cell) => ({
                  layerIdx: cell.layerIdx,
                  r: cell.r,
                  c: cell.c,
                  value: cell.after,
                })),
              },
            })
          );
        }

        const activeEng = engine || (typeof window !== 'undefined' ? (window as any).__babylonEngine : null);
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }

        return { ok: true, count: stampRes.cells.length };
      },

      cancelPaste: () => {
        set((state) => {
          state.isPasting = false;
          if (state.brushMode === 'paste') {
            state.brushMode = 'paint';
          }
        });
        const activeEng = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
        if (activeEng?.clearSelectionPreview) {
          activeEng.clearSelectionPreview();
        }
      },

      flipStampH: () => {
        set((state) => {
          state.stampTransform.flipH = !state.stampTransform.flipH;
        });
      },

      flipStampV: () => {
        set((state) => {
          state.stampTransform.flipV = !state.stampTransform.flipV;
        });
      },

      rotateStampCW: () => {
        set((state) => {
          state.stampTransform.rotation = rotateCW(state.stampTransform.rotation);
          state.brushRotation = state.stampTransform.rotation;
        });
      },

      rotateStampCCW: () => {
        set((state) => {
          state.stampTransform.rotation = rotateCCW(state.stampTransform.rotation);
          state.brushRotation = state.stampTransform.rotation;
        });
      },

      resetStampTransform: () => {
        set((state) => {
          state.stampTransform = { ...DEFAULT_STAMP_TRANSFORM };
          state.brushRotation = 0;
        });
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
        let op: DefinitionOp | null = null;
        set((state) => {
          const res = redoDefinitionOp(state.definitionOpStack);
          state.definitionOpStack = res.stack;
          op = res.op;
        });
        return op;
      },

      clearDefinitionStackFor: (resourceKey) => {
        set((state) => {
          state.definitionOpStack = clearDefinitionOpsForKey(state.definitionOpStack, resourceKey);
        });
      },

      setSoftLock: (lock) => set((state) => {
        state.activeLocks[lock.resource] = lock;
      }),
      removeSoftLock: (resource) => set((state) => {
        delete state.activeLocks[resource];
      }),
      clearExpiredLocks: () => set((state) => {
        const now = new Date().toISOString();
        for (const res in state.activeLocks) {
          if (state.activeLocks[res].expiresAt < now) {
            delete state.activeLocks[res];
          }
        }
      }),
      resetLayout: () => set((state) => {
        state.panels = JSON.parse(JSON.stringify(DEFAULT_PANELS));
        persistLayouts(get);
      }),
    }))
  )
);
