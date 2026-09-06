/**
 * Saints Gaming Studio — Editor Interaction Contracts & Types
 *
 * Defines explicit contracts separating:
 * 1. SOURCE ("What asset am I holding?")
 * 2. WORLD ("What existing object/region am I selecting?")
 * 3. TOOL ("What operation am I performing?")
 * 4. GEOMETRY ("What shape defines the operation?")
 * 5. TRANSFORM ("How is the object oriented and positioned?")
 * 6. TARGET ("Where does the result apply?")
 * 7. SURFACE ("What editing paradigm is active: 2D, 2.5D, 3D?")
 */

import type { ContinuousGeometry, TransformPivot } from '@/shared/game/geometry/continuousGeometry';

export type SurfaceMode = '2d' | '2.5d' | '3d';

export type EditorToolId =
  | 'select'
  | 'brush'
  | 'fill'
  | 'eraser'
  | 'eyedropper'
  | 'transform'
  | 'place'
  | 'portal'
  | 'prefab'
  | 'shape'
  | 'extrude'
  | 'smooth'
  | 'paste';

export type BrushShapeType = 'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon' | 'cylinder';

export type SelectionShapeType = 'box' | 'circle' | 'ellipse' | 'lasso' | 'polygon';

export type SelectionCombineMode = 'normal' | 'add' | 'subtract';

// ==========================================
// 1. SOURCE ASSET DEFINITIONS
// ==========================================

export interface SingleTileSource {
  type: 'tile';
  gid: number;
  tilesetName?: string;
}

export interface TilePatternSource {
  type: 'pattern';
  w: number;
  h: number;
  gids: number[][];
  mask?: boolean[][];
}

export interface TerrainMaterialSource {
  type: 'terrain-material';
  id: string;
  name: string;
  sourceSheet: string;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  width: number;
  height: number;
}

export interface PropAssetSource {
  type: 'prop';
  id: string;
  name: string;
  category: 'Tree' | 'Rock' | 'Building' | 'Foliage' | 'Decor' | 'Structure';
  sourceSheet: string;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  width: number;
  height: number;
  defaultScale?: number;
  collision?: 'SOLID' | 'NONE' | 'WATER';
  elevationOffset?: number;
}

export interface FoliageAssetSource {
  type: 'foliage';
  id: string;
  name: string;
  sourceSheet: string;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  width: number;
  height: number;
  sway?: boolean;
}

export interface PrefabSource {
  type: 'prefab';
  id: string;
  name: string;
  width: number;
  height: number;
  visualData?: Array<{ r: number; c: number; tileId: number; layerOffset?: number }>;
  logicData?: Array<{ r: number; c: number; tileId: number }>;
}

export type SourceAsset =
  | SingleTileSource
  | TilePatternSource
  | TerrainMaterialSource
  | PropAssetSource
  | FoliageAssetSource
  | PrefabSource;

// ==========================================
// 2. WORLD SELECTION DEFINITIONS
// ==========================================

export interface ContinuousWorldSelection {
  kind: 'continuous';
  geometry: ContinuousGeometry;
  combineMode: SelectionCombineMode;
}

export interface DiscreteWorldSelection {
  kind: 'discrete';
  cells: Record<string, boolean>; // key: "r,c"
  bounds?: { minR: number; maxR: number; minC: number; maxC: number };
}

export interface ObjectWorldSelection {
  kind: 'objects';
  objectIds: string[];
}

export type WorldSelection =
  | ContinuousWorldSelection
  | DiscreteWorldSelection
  | ObjectWorldSelection;

// ==========================================
// 3. TRANSFORM & PIVOT STATE
// ==========================================

export interface TransformState {
  position: { x: number; y: number; z: number };
  rotation: number; // 0 to 360 degrees
  scale: { x: number; y: number; z: number };
  pivot: TransformPivot;
  snapping: {
    enabled: boolean;
    step: number;
  };
}

export const DEFAULT_TRANSFORM_STATE: TransformState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  scale: { x: 1, y: 1, z: 1 },
  pivot: { anchorX: 0.5, anchorZ: 0.5, offsetX: 0, offsetZ: 0 },
  snapping: { enabled: false, step: 1.0 },
};

// ==========================================
// 4. TARGET LAYER DEFINITIONS
// ==========================================

export type LayerTarget =
  | { type: 'tile'; layerIdx: number }
  | { type: 'logic'; layerIdx: -1 }
  | { type: 'splat'; layerIdx?: number }
  | { type: 'prop'; layerIdx?: number }
  | { type: 'foliage'; layerIdx?: number };

import type { VoxelTargetResolution } from '@/shared/game/voxel/VoxelTargetResolver';

// ==========================================
// 5. POINTER CONTEXT FOR TOOL DISPATCH
// ==========================================

export interface ToolPointerEvent {
  eventType: 'down' | 'move' | 'up';
  button: number; // 0: left, 1: middle, 2: right
  tilePos: { r: number; c: number };
  worldPos: { x: number; y: number; z: number };
  voxelTarget?: VoxelTargetResolution | null;
  rawEvent: PointerEvent | MouseEvent;
  isShift: boolean;
  isCtrl: boolean;
  isAlt: boolean;
  isSpace: boolean;
}
