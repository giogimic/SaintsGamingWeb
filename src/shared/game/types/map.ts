import type { VoxelWorldDocV3 } from '../voxel/VoxelWorldDoc';

export interface GateData {
  targetMapId: string;
  spawnPoint: { x: number; y: number };
  requiredElement?: string;
  errorMessage?: string;
}

export interface NPCPlacement {
  id: string;
  templateId?: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  direction?: string;
  dialogueKey?: string;
}

export interface EncounterEntry {
  speciesSlug?: string;
  speciesId?: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
  timeOfDay?: 'any' | 'day' | 'night';
}

export interface TileLayer {
  name: string;
  grid: number[][];
}

export interface FreeformObject {
  id: string;
  asset: string; // URL or identifier fallback
  assetId?: string; // Persistent UsableAsset ID
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  uOffset?: number;
  vOffset?: number;
  uScale?: number;
  vScale?: number;
}

export interface FreeformRegion {
  type: string;
  points: [number, number][];
  action?: string;
  target?: string;
}

export interface FreeformSplatPoint {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
  uOffset?: number;
  vOffset?: number;
  uScale?: number;
  vScale?: number;
  assetId?: string;
}

export interface FreeformLayer {
  id: string;
  name: string;
  type: 'paint-splat' | 'free-form' | 'polygon';
  data?: Record<string, FreeformSplatPoint[]>;
  objects?: FreeformObject[];
  regions?: FreeformRegion[];
}


export interface TilesetMeta {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
  imagewidth?: number;
  imageheight?: number;
}

export interface MapConnection {
  targetMapId: string;
  targetEdge?: 'north' | 'south' | 'east' | 'west';
  offsetX: number;
  offsetZ: number;
}

export const WORLD_CHUNK_SIZE = 32;

export type ChunkLifecycleState = 
  | 'UNREQUESTED'
  | 'FETCHING'
  | 'DECODED'
  | 'BUILDING'
  | 'READY'
  | 'VISIBLE'
  | 'HIDDEN'
  | 'EVICTABLE'
  | 'EVICTED'
  | 'FAILED';

export interface ChunkKey {
  mapId: string;
  mapVersion: number;
  chunkX: number;
  chunkZ: number;
  worldTransform: { x: number; z: number };
}

export interface RenderedChunk {
  mapId: string;
  offsetX: number;
  offsetZ: number;
  width: number;
  height: number;
  grid?: number[][];
  tileLayers?: TileLayer[];
  tilesets?: TilesetMeta[];
}

export interface MapData {
  id: string;
  version?: number;
  name: string;
  grid: number[][];
  gates: Record<number, GateData>;
  npcs: NPCPlacement[];
  encountersData: EncounterEntry[];
  tileLayers?: TileLayer[];
  tilesets?: TilesetMeta[];
  freeformLayers?: FreeformLayer[];
  width: number;
  height: number;
  musicTrack?: string | null;
  weatherType?: string | null;
  recommendedLevel?: number | null;
  lightingPreset?: string | null;
  biome?: string | null;
  description?: string | null;
  cameraStyle?: 'isometric' | 'follow45' | 'topdown' | 'free';
  defaultCameraStyle?: 'isometric' | 'follow45' | 'topdown' | 'free';
  allowCameraOverride?: boolean;
  allowCustomCamera?: boolean;
  allowCustomPlayerCamera?: boolean;
  connections?: {
    north?: string | MapConnection;
    south?: string | MapConnection;
    east?: string | MapConnection;
    west?: string | MapConnection;
  };
  chunks?: RenderedChunk[];
  voxelDoc?: VoxelWorldDocV3;
  blockSizePx?: number; // 6..1024, default 64
}

export interface LogicTile {
  id: number;
  name: string;
  color?: string | null;
  isSolid: boolean;
  interactable: boolean;

  // Rich Simulation Semantics (Bible 34 §5)
  terrainType?: 'grass' | 'dirt' | 'stone' | 'sand' | 'water' | 'snow' | 'swamp' | 'wood' | 'lava' | 'road';
  movementCost?: number;
  elevation?: number;
  passableBy?: Array<'walk' | 'swim' | 'fly' | 'climb'>;
  environmentalEffect?: string | null;
  weatherReactive?: boolean;
  destructible?: boolean;

  onInteractAction?: string | null;
  onInteractPayload?: string | null;
  onStepAction?: string | null;
  onStepPayload?: string | null;
}

export interface SkirtConfig {
  type: 'single';
  gid: number;
}

export const BIOME_SKIRT_CONFIG: Record<string, SkirtConfig> = {
  town: { type: 'single', gid: 17 },
  overworld: { type: 'single', gid: 17 },
  cave: { type: 'single', gid: 1 },
  default: { type: 'single', gid: 17 },
};
