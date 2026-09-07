import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';
import { VOXEL_WORD_AIR, isVoxelAir, isVoxelSolid } from './VoxelWord';
import { VoxelBlockEntity, getBlockEntityKey } from './VoxelBlockEntity';
import { migrateLegacyDocTo32Cubic } from './chunkMigration';

export interface VoxelMaterialDef {
  id: number;
  name: string;
  textureUrl?: string;
  colorHex?: string;
  roughness?: number;
  metallic?: number;
  emissive?: string;
  isTransparent?: boolean;
}

export interface VoxelWorldDocV3 {
  formatVersion: 3;
  id: string;
  name: string;
  gameId: string;
  version: number;
  blockSizePx: number; // 6..1024, default 64
  dimensions: {
    widthChunks: number;
    depthChunks: number;
    heightChunks: number;
  };
  mapWidth?: number;
  mapHeight?: number;
  palette: VoxelMaterialDef[];
  chunks: Record<string, number[]>; // key: "cx_cz_cy" -> RLE encoded array
  entities?: any[];
  blockEntities?: Record<string, VoxelBlockEntity>;
  gates?: any[];
  environment?: {
    lightingPreset?: string;
    weather?: string;
    musicTrack?: string;
  };
  generationMetadata?: {
    mode?: string;
    terrainProfile?: string;
    seed?: string | number;
    baseMaterial?: number;
    baseElevation?: number;
    elevationRange?: number;
    createdAt?: number;
  };
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  publishedVersion?: number;
}

export const DEFAULT_BLOCK_SIZE_PX = 64;
export const MIN_BLOCK_SIZE_PX = 6;
export const MAX_BLOCK_SIZE_PX = 1024;

export const STANDARD_BLOCK_SIZES = [6, 8, 16, 24, 32, 48, 64, 128, 256, 512, 1024] as const;

export class VoxelWorld {
  public id: string;
  public name: string;
  public blockSizePx: number;
  public widthChunks: number;
  public depthChunks: number;
  public heightChunks: number;
  public mapWidth?: number;
  public mapHeight?: number;
  public chunks = new Map<string, VoxelChunk>();
  public palette: VoxelMaterialDef[] = [];
  public blockEntities = new Map<string, VoxelBlockEntity>();

  public getBlockEntity(wx: number, wy: number, wz: number): VoxelBlockEntity | undefined {
    return this.blockEntities.get(getBlockEntityKey(wx, wy, wz));
  }

  public setBlockEntity(wx: number, wy: number, wz: number, entity: VoxelBlockEntity): void {
    this.blockEntities.set(getBlockEntityKey(wx, wy, wz), entity);
  }

  public removeBlockEntity(wx: number, wy: number, wz: number): boolean {
    return this.blockEntities.delete(getBlockEntityKey(wx, wy, wz));
  }

  public getAllBlockEntities(): VoxelBlockEntity[] {
    return Array.from(this.blockEntities.values());
  }

  constructor(
    idOrOptions: string | { id: string; name?: string; dimensions?: { widthChunks?: number; depthChunks?: number; heightChunks?: number }; blockSizePx?: number },
    name?: string,
    widthChunks: number = 2,
    depthChunks: number = 2,
    heightChunks: number = 1,
    blockSizePx: number = DEFAULT_BLOCK_SIZE_PX
  ) {
    if (typeof idOrOptions === 'object') {
      this.id = idOrOptions.id;
      this.name = idOrOptions.name || idOrOptions.id;
      this.widthChunks = Math.max(1, idOrOptions.dimensions?.widthChunks ?? 2);
      this.depthChunks = Math.max(1, idOrOptions.dimensions?.depthChunks ?? 2);
      this.heightChunks = Math.max(1, idOrOptions.dimensions?.heightChunks ?? 1);
      this.blockSizePx = Math.min(MAX_BLOCK_SIZE_PX, Math.max(MIN_BLOCK_SIZE_PX, idOrOptions.blockSizePx ?? DEFAULT_BLOCK_SIZE_PX));
    } else {
      this.id = idOrOptions;
      this.name = name || idOrOptions;
      this.widthChunks = Math.max(1, widthChunks);
      this.depthChunks = Math.max(1, depthChunks);
      this.heightChunks = Math.max(1, heightChunks);
      this.blockSizePx = Math.min(MAX_BLOCK_SIZE_PX, Math.max(MIN_BLOCK_SIZE_PX, blockSizePx));
    }
    this.initDefaultPalette();
  }

  private initDefaultPalette(): void {
    this.palette = [
      { id: 0, name: 'Air', isTransparent: true },
      { id: 1, name: 'Gunmetal Base', colorHex: '#2a2d34', roughness: 0.75 },
      { id: 2, name: 'Lush Grass', colorHex: '#4a8505', roughness: 0.8 },
      { id: 3, name: 'Rich Dirt', colorHex: '#6d4c41', roughness: 0.9 },
      { id: 4, name: 'Cliff Stone', colorHex: '#757575', roughness: 0.6 },
      { id: 5, name: 'Dune Sand', colorHex: '#ffd54f', roughness: 0.85 },
      { id: 6, name: 'Crystal Water', colorHex: '#0288d1', isTransparent: true, roughness: 0.1 },
      { id: 7, name: 'Oak Wood', colorHex: '#8d6e63', roughness: 0.7 },
      { id: 8, name: 'Alpine Snow', colorHex: '#eceff1', roughness: 0.4 },
      { id: 9, name: 'Molten Lava', colorHex: '#ef4444', roughness: 0.2 },
      { id: 10, name: 'Murky Swamp', colorHex: '#3f6212', roughness: 0.8 },
      { id: 11, name: 'Ancient Dungeon', colorHex: '#475569', roughness: 0.5 },
      { id: 12, name: 'Glacial Ice', colorHex: '#67e8f9', isTransparent: true, roughness: 0.1 },
    ];
  }

  public get totalWidthBlocks(): number {
    return this.widthChunks * CHUNK_SIZE_X;
  }

  public get totalDepthBlocks(): number {
    return this.depthChunks * CHUNK_SIZE_Z;
  }

  public get totalHeightBlocks(): number {
    return this.heightChunks * CHUNK_SIZE_Y;
  }

  public get originOffsetX(): number {
    return 0;
  }

  public get originOffsetZ(): number {
    return 0;
  }

  public get originOffsetY(): number {
    return -16;
  }

  public voxelToWorldMesh(wx: number, wy: number, wz: number): { x: number; y: number; z: number } {
    return {
      x: wx + this.originOffsetX,
      y: wy + this.originOffsetY,
      z: wz + this.originOffsetZ,
    };
  }

  public worldMeshToVoxel(x: number, y: number, z: number): { wx: number; wy: number; wz: number } {
    return {
      wx: Math.floor(x - this.originOffsetX),
      wy: Math.floor(y - this.originOffsetY),
      wz: Math.floor(z - this.originOffsetZ),
    };
  }

  public static worldToChunkCoords(wx: number, wy: number, wz: number): {
    cx: number;
    cz: number;
    cy: number;
    lx: number;
    ly: number;
    lz: number;
  } {
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const cy = Math.floor(wy / CHUNK_SIZE_Y);

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    const ly = ((wy % CHUNK_SIZE_Y) + CHUNK_SIZE_Y) % CHUNK_SIZE_Y;

    return { cx, cz, cy, lx, ly, lz };
  }

  public getChunk(cx: number, cz: number, cy: number = 0, createIfMissing: boolean = false): VoxelChunk | null {
    const key = VoxelChunk.getChunkKey(cx, cz, cy);
    let chunk = this.chunks.get(key);
    if (!chunk && createIfMissing) {
      chunk = new VoxelChunk(cx, cz, cy);
      this.chunks.set(key, chunk);
    }
    return chunk || null;
  }

  public getVoxel(wx: number, wy: number, wz: number): number {
    const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(wx, wy, wz);
    const chunk = this.getChunk(cx, cz, cy, false);
    if (!chunk) return VOXEL_WORD_AIR;
    return chunk.get(lx, ly, lz);
  }

  /**
   * Scans downward from world ceiling to find the highest solid voxel Y coordinate at (wx, wz).
   * Defaults to 15 (top of base foundation) if only air is encountered.
   */
  public getTopSolidVoxelY(wx: number, wz: number): number {
    for (let wy = this.totalHeightBlocks - 1; wy >= 0; wy--) {
      const word = this.getVoxel(wx, wy, wz);
      if (word && !isVoxelAir(word) && isVoxelSolid(word)) {
        return wy;
      }
    }
    return 15;
  }

  public setVoxel(wx: number, wy: number, wz: number, word: number): boolean {
    const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(wx, wy, wz);
    // Only create missing chunks if we are actively placing a block (word !== 0). 
    // This avoids instantiating empty chunks when erasing air.
    const chunk = this.getChunk(cx, cz, cy, word !== 0);
    if (!chunk) return false;

    const changed = chunk.set(lx, ly, lz, word);
    if (changed) {
      if (lx === 0) {
        const neighbor = this.getChunk(cx - 1, cz, cy, false);
        if (neighbor) neighbor.isDirty = true;
      } else if (lx === CHUNK_SIZE_X - 1) {
        const neighbor = this.getChunk(cx + 1, cz, cy, false);
        if (neighbor) neighbor.isDirty = true;
      }
      if (lz === 0) {
        const neighbor = this.getChunk(cx, cz - 1, cy, false);
        if (neighbor) neighbor.isDirty = true;
      } else if (lz === CHUNK_SIZE_Z - 1) {
        const neighbor = this.getChunk(cx, cz + 1, cy, false);
        if (neighbor) neighbor.isDirty = true;
      }
      if (ly === 0) {
        const neighbor = this.getChunk(cx, cz, cy - 1, false);
        if (neighbor) neighbor.isDirty = true;
      } else if (ly === CHUNK_SIZE_Y - 1) {
        const neighbor = this.getChunk(cx, cz, cy + 1, false);
        if (neighbor) neighbor.isDirty = true;
      }
    }
    return changed;
  }

  /** Connected adjacent neighbors for boundary halo sampling and seamless transitions */
  public adjacentNeighbors = new Map<
    'north' | 'east' | 'south' | 'west',
    { mapId: string; world: VoxelWorld; offsetWX: number; offsetWZ: number }
  >();

  public registerAdjacentNeighbor(
    direction: 'north' | 'east' | 'south' | 'west',
    neighborWorld: VoxelWorld,
    offsetWX = 0,
    offsetWZ = 0
  ): void {
    this.adjacentNeighbors.set(direction, {
      mapId: neighborWorld.id,
      world: neighborWorld,
      offsetWX,
      offsetWZ,
    });
  }

  public clearAdjacentNeighbors(): void {
    this.adjacentNeighbors.clear();
  }

  public isWithinLocalBounds(wx: number, wy: number, wz: number): boolean {
    return (
      wy >= 0 &&
      wy < this.totalHeightBlocks
    );
  }

  /**
   * Safety guard: verifies coordinate is within local map boundary.
   * Protects adjacent maps from accidental brush corruption during editing.
   */
  public canEditVoxel(wx: number, wy: number, wz: number): boolean {
    return this.isWithinLocalBounds(wx, wy, wz);
  }

  /**
   * 1-Block Halo Boundary Voxel Query.
   * If (wx, wy, wz) is inside this map, returns local voxel.
   * If (wx, wy, wz) is outside, queries the connected adjacent neighbor map.
   * Eliminates cracks, seams, and false perimeter air at borders.
   */
  public getVoxelWithHalo(wx: number, wy: number, wz: number): number {
    const width = this.mapWidth ?? this.totalWidthBlocks;
    const depth = this.mapHeight ?? this.totalDepthBlocks;

    // Within local bounds
    if (wx >= 0 && wx < width && wz >= 0 && wz < depth && wy >= 0 && wy < this.totalHeightBlocks) {
      return this.getVoxel(wx, wy, wz);
    }

    // West boundary (wx < 0)
    if (wx < 0) {
      const westNeighbor = this.adjacentNeighbors.get('west');
      if (westNeighbor) {
        const nWidth = westNeighbor.world.mapWidth ?? westNeighbor.world.totalWidthBlocks;
        return westNeighbor.world.getVoxel(nWidth + wx, wy, wz - westNeighbor.offsetWZ);
      }
    }

    // East boundary (wx >= width)
    if (wx >= width) {
      const eastNeighbor = this.adjacentNeighbors.get('east');
      if (eastNeighbor) {
        return eastNeighbor.world.getVoxel(wx - width, wy, wz - eastNeighbor.offsetWZ);
      }
    }

    // South boundary (wz < 0)
    if (wz < 0) {
      const southNeighbor = this.adjacentNeighbors.get('south');
      if (southNeighbor) {
        const nDepth = southNeighbor.world.mapHeight ?? southNeighbor.world.totalDepthBlocks;
        return southNeighbor.world.getVoxel(wx - southNeighbor.offsetWX, wy, nDepth + wz);
      }
    }

    // North boundary (wz >= depth)
    if (wz >= depth) {
      const northNeighbor = this.adjacentNeighbors.get('north');
      if (northNeighbor) {
        return northNeighbor.world.getVoxel(wx - northNeighbor.offsetWX, wy, wz - depth);
      }
    }

    return VOXEL_WORD_AIR;
  }

  /**
   * Extracts a 34x34x34 halo buffer for a chunk, extending 1 block in all 6 directions
   * (X: -1..32, Y: -1..32, Z: -1..32).
   * Used for off-thread greedy meshing with complete neighbor face culling and ambient occlusion.
   */
  public extractChunkHalo34(cx: number, cz: number, cy: number = 0): Uint32Array {
    const halo = new Uint32Array(34 * 34 * 34);
    const startWX = cx * CHUNK_SIZE_X;
    const startWY = cy * CHUNK_SIZE_Y;
    const startWZ = cz * CHUNK_SIZE_Z;

    for (let rz = -1; rz <= 32; rz++) {
      const hz = rz + 1;
      const wz = startWZ + rz;
      for (let ry = -1; ry <= 32; ry++) {
        const hy = ry + 1;
        const wy = startWY + ry;
        const baseIdx = hy * 34 + hz * 1156;
        for (let rx = -1; rx <= 32; rx++) {
          const hx = rx + 1;
          const wx = startWX + rx;
          halo[baseIdx + hx] = this.getVoxelWithHalo(wx, wy, wz);
        }
      }
    }
    return halo;
  }

  /**
   * Generates default Gunmetal base for all chunks in the world volume.
   */
  public generateDefaultWorld(): void {
    for (let cx = 0; cx < this.widthChunks; cx++) {
      for (let cz = 0; cz < this.depthChunks; cz++) {
        for (let cy = 0; cy < this.heightChunks; cy++) {
          const chunk = this.getChunk(cx, cz, cy, true)!;
          chunk.generateDefaultBase();
        }
      }
    }
  }

  /**
   * Serialize entire world to V3 Document JSON.
   */
  public serializeToDoc(): VoxelWorldDocV3 {
    const chunkPayloads: Record<string, number[]> = {};
    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunk.isEmpty()) {
        chunkPayloads[key] = chunk.serializeRLE();
      }
    }

    const blockEntitiesRecord: Record<string, VoxelBlockEntity> = {};
    for (const [key, be] of this.blockEntities.entries()) {
      blockEntitiesRecord[key] = be;
    }

    return {
      formatVersion: 3,
      id: this.id,
      name: this.name,
      gameId: 'saints',
      version: 1,
      blockSizePx: this.blockSizePx,
      dimensions: {
        widthChunks: this.widthChunks,
        depthChunks: this.depthChunks,
        heightChunks: this.heightChunks,
      },
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      palette: this.palette,
      chunks: chunkPayloads,
      blockEntities: Object.keys(blockEntitiesRecord).length > 0 ? blockEntitiesRecord : undefined,
    };
  }

  /**
   * Reconstruct world from V3 Document. Automatically migrates legacy 16x16x32 chunks to 32³.
   */
  public static deserializeFromDoc(inputDoc: VoxelWorldDocV3): VoxelWorld {
    const doc = migrateLegacyDocTo32Cubic(inputDoc);
    const world = new VoxelWorld(
      doc.id,
      doc.name,
      doc.dimensions?.widthChunks || 2,
      doc.dimensions?.depthChunks || 2,
      doc.dimensions?.heightChunks || 1,
      doc.blockSizePx || DEFAULT_BLOCK_SIZE_PX
    );

    world.mapWidth = doc.mapWidth;
    world.mapHeight = doc.mapHeight;

    if (doc.palette && Array.isArray(doc.palette)) {
      world.palette = doc.palette;
    }

    if (doc.chunks && typeof doc.chunks === 'object') {
      for (const [key, rleData] of Object.entries(doc.chunks)) {
        const { cx, cz, cy } = VoxelChunk.parseChunkKey(key);
        const chunk = VoxelChunk.deserializeRLE(rleData, cx, cz, cy);
        world.chunks.set(key, chunk);
      }
    }

    if (doc.blockEntities && typeof doc.blockEntities === 'object') {
      for (const [key, be] of Object.entries(doc.blockEntities)) {
        world.blockEntities.set(key, be);
      }
    }

    return world;
  }
}

export function generateDefaultWorldDoc(
  widthChunks = 2,
  depthChunks = 2,
  blockSizePx = DEFAULT_BLOCK_SIZE_PX,
  mapWidth?: number,
  mapHeight?: number
): VoxelWorldDocV3 {
  const world = new VoxelWorld('world_default', 'Default Voxel World', widthChunks, depthChunks, 1, blockSizePx);
  world.mapWidth = mapWidth;
  world.mapHeight = mapHeight;
  world.generateDefaultWorld();
  return world.serializeToDoc();
}

/**
 * Multi-map spatial registry managing spatial coordinates, cross-map adjacency,
 * and halo queries across the continuous World Atlas.
 */
export class SpatialVoxelWorldManager {
  private static instance: SpatialVoxelWorldManager;
  private worlds = new Map<string, VoxelWorld>();
  private worldOffsets = new Map<string, { x: number; z: number }>();

  public static getInstance(): SpatialVoxelWorldManager {
    if (!SpatialVoxelWorldManager.instance) {
      SpatialVoxelWorldManager.instance = new SpatialVoxelWorldManager();
    }
    return SpatialVoxelWorldManager.instance;
  }

  public registerWorld(world: VoxelWorld, offsetWX = 0, offsetWZ = 0): void {
    this.worlds.set(world.id, world);
    this.worldOffsets.set(world.id, { x: offsetWX, z: offsetWZ });
  }

  public unregisterWorld(mapId: string): void {
    const world = this.worlds.get(mapId);
    if (world) {
      world.clearAdjacentNeighbors();
      this.worlds.delete(mapId);
      this.worldOffsets.delete(mapId);
    }
  }

  public getWorld(mapId: string): VoxelWorld | undefined {
    return this.worlds.get(mapId);
  }

  public getWorldOffset(mapId: string): { x: number; z: number } {
    return this.worldOffsets.get(mapId) || { x: 0, z: 0 };
  }

  public connectAdjacent(
    sourceMapId: string,
    targetMapId: string,
    direction: 'north' | 'east' | 'south' | 'west',
    offsetWX = 0,
    offsetWZ = 0
  ): boolean {
    const src = this.worlds.get(sourceMapId);
    const tgt = this.worlds.get(targetMapId);
    if (!src || !tgt) return false;

    src.registerAdjacentNeighbor(direction, tgt, offsetWX, offsetWZ);

    const reverse: Record<'north' | 'east' | 'south' | 'west', 'north' | 'east' | 'south' | 'west'> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    tgt.registerAdjacentNeighbor(reverse[direction], src, -offsetWX, -offsetWZ);
    return true;
  }

  public clear(): void {
    for (const w of this.worlds.values()) {
      w.clearAdjacentNeighbors();
    }
    this.worlds.clear();
    this.worldOffsets.clear();
  }
}

