import type { WorldConnection } from '../world-resolver';

/**
 * The internal state of the compiler pipeline as it processes a publish request.
 */
export interface CompilerContext {
  projectId: string;
  
  // Working definitions
  mapsIncluded: Set<string>;
  
  // Required dependencies discovered during compilation
  requiredRegions: Set<string>;      // e.g. "mapId_regionX_regionZ"
  requiredNPCs: Set<string>;         // slug
  requiredMonsters: Set<string>;     // slug 
  requiredCreatures: Set<string>;    // slug
  requiredAbilities: Set<string>;    // id
  requiredItems: Set<string>;        // id
  requiredQuests: Set<string>;       // id
  requiredAssets: Set<string>;       // path/url
  
  // Assembled output payload
  manifest: ReleaseManifest;
  
  // Validation issues
  warnings: string[];
  errors: string[];
}

/**
 * The immutable representation of a Published World.
 * This exactly matches the Go `ReleaseManifest` struct in `the-lobby/internal/world/release.go`.
 */
export interface ReleaseManifest {
  version: string;
  world: {
    name: string;
    spawnMap: string;
    spawnX: number;
    spawnY: number;
    spawnZ: number;
  };
  maps: {
    id: string;
    name: string;
    version: number;
    gridData?: string | null;
    gatesData?: string;
    encountersData?: string;
    entitiesData?: string;
    freeformLayersData?: string | null;
    tileLayersData?: string | null;
    tilesetsData?: string | null;
    mapType: string;
    spawnX: number;
    spawnY: number;
    spawnZ: number;
  }[];
  atlas: Record<string, string>; // "mapId_regionX_regionZ" -> "artifactChecksum"
  actors: {
    npcs: {
      slug: string;
      name: string;
      worldModel: string;
      dialogueTree: any | null; // Parsed DialogueNode tree
      capabilities: any;
    }[];
    creatures: any[];
    monsters: any[];
  };
  gameplay: {
    abilities: any[];
    quests: any[];
  };
  items: any[];
  connections: WorldConnection[];
  assets: string[];
}
