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
}

export interface LogicTile {
  id: number;
  name: string;
  color?: string | null;
  isSolid: boolean;
  interactable: boolean;
  onInteractAction?: string | null;
  onInteractPayload?: string | null;
  onStepAction?: string | null;
  onStepPayload?: string | null;
}
