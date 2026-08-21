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

export interface TilesetMeta {
  firstgid: number;
  imageSource: string;
  columns: number;
  tilewidth: number;
  tileheight: number;
}

export interface MapConnection {
  targetMapId: string;
  targetEdge?: 'north' | 'south' | 'east' | 'west';
  offsetX: number;
  offsetZ: number;
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
  name: string;
  grid: number[][];
  gates: Record<number, GateData>;
  npcs: NPCPlacement[];
  encountersData: EncounterEntry[];
  tileLayers?: TileLayer[];
  tilesets?: TilesetMeta[];
  width: number;
  height: number;
  musicTrack?: string | null;
  weatherType?: string | null;
  recommendedLevel?: number | null;
  lightingPreset?: string | null;
  biome?: string | null;
  description?: string | null;
  connections?: {
    north?: string | MapConnection;
    south?: string | MapConnection;
    east?: string | MapConnection;
    west?: string | MapConnection;
  };
  chunks?: RenderedChunk[];
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
