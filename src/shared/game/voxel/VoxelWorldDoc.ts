import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from './VoxelChunk';
import { VOXEL_WORD_AIR } from './VoxelWord';

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
  palette: VoxelMaterialDef[];
  chunks: Record<string, number[]>; // key: "cx_cz_cy" -> RLE encoded array
  entities?: any[];
  gates?: any[];
  environment?: {
    lightingPreset?: string;
    weather?: string;
    musicTrack?: string;
  };
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
  public chunks = new Map<string, VoxelChunk>();
  public palette: VoxelMaterialDef[] = [];

  constructor(
    id: string,
    name: string,
    widthChunks: number = 2,
    depthChunks: number = 2,
    heightChunks: number = 1,
    blockSizePx: number = DEFAULT_BLOCK_SIZE_PX
  ) {
    this.id = id;
    this.name = name;
    this.widthChunks = Math.max(1, widthChunks);
    this.depthChunks = Math.max(1, depthChunks);
    this.heightChunks = Math.max(1, heightChunks);
    this.blockSizePx = Math.min(MAX_BLOCK_SIZE_PX, Math.max(MIN_BLOCK_SIZE_PX, blockSizePx));
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
    return -this.totalWidthBlocks / 2;
  }

  public get originOffsetZ(): number {
    return -this.totalDepthBlocks / 2;
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

  public setVoxel(wx: number, wy: number, wz: number, word: number): boolean {
    const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(wx, wy, wz);
    const chunk = this.getChunk(cx, cz, cy, true)!;
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
      palette: this.palette,
      chunks: chunkPayloads,
    };
  }

  /**
   * Reconstruct world from V3 Document.
   */
  public static deserializeFromDoc(doc: VoxelWorldDocV3): VoxelWorld {
    const world = new VoxelWorld(
      doc.id,
      doc.name,
      doc.dimensions?.widthChunks || 2,
      doc.dimensions?.depthChunks || 2,
      doc.dimensions?.heightChunks || 1,
      doc.blockSizePx || DEFAULT_BLOCK_SIZE_PX
    );

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

    return world;
  }
}

export function generateDefaultWorldDoc(widthChunks = 2, depthChunks = 2, blockSizePx = DEFAULT_BLOCK_SIZE_PX): VoxelWorldDocV3 {
  const world = new VoxelWorld('world_default', 'Default Voxel World', widthChunks, depthChunks, 1, blockSizePx);
  world.generateDefaultWorld();
  return world.serializeToDoc();
}
