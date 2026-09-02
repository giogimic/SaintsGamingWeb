import { VOXEL_WORD_AIR, VOXEL_WORD_GUNMETAL, isVoxelAir } from './VoxelWord';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_SIZE_Y = 32; // Vertical height
export const CHUNK_TOTAL_CELLS = CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y; // 8,192 cells

export interface ChunkCoord {
  cx: number;
  cz: number;
  cy?: number;
}

export class VoxelChunk {
  public readonly cx: number;
  public readonly cz: number;
  public readonly cy: number;
  public readonly key: string;
  public data: Uint32Array;
  public isDirty = true;
  public lastModified = Date.now();

  constructor(cx: number, cz: number, cy: number = 0, initialData?: Uint32Array) {
    this.cx = cx;
    this.cz = cz;
    this.cy = cy;
    this.key = VoxelChunk.getChunkKey(cx, cz, cy);
    this.data = initialData && initialData.length === CHUNK_TOTAL_CELLS
      ? initialData
      : new Uint32Array(CHUNK_TOTAL_CELLS);
  }

  public static getChunkKey(cx: number, cz: number, cy: number = 0): string {
    return `${cx}_${cz}_${cy}`;
  }

  public static parseChunkKey(key: string): { cx: number; cz: number; cy: number } {
    const parts = key.split('_').map(Number);
    return {
      cx: parts[0] ?? 0,
      cz: parts[1] ?? 0,
      cy: parts[2] ?? 0,
    };
  }

  public static getIndex(localX: number, localY: number, localZ: number): number {
    return localX + localZ * CHUNK_SIZE_X + localY * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
  }

  public static getLocalCoords(index: number): { lx: number; ly: number; lz: number } {
    const lx = index % CHUNK_SIZE_X;
    const lz = Math.floor(index / CHUNK_SIZE_X) % CHUNK_SIZE_Z;
    const ly = Math.floor(index / (CHUNK_SIZE_X * CHUNK_SIZE_Z));
    return { lx, ly, lz };
  }

  public static isValidLocal(lx: number, ly: number, lz: number): boolean {
    return lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z && ly >= 0 && ly < CHUNK_SIZE_Y;
  }

  public get(lx: number, ly: number, lz: number): number {
    if (!VoxelChunk.isValidLocal(lx, ly, lz)) return VOXEL_WORD_AIR;
    const idx = VoxelChunk.getIndex(lx, ly, lz);
    return this.data[idx];
  }

  public set(lx: number, ly: number, lz: number, word: number): boolean {
    if (!VoxelChunk.isValidLocal(lx, ly, lz)) return false;
    const idx = VoxelChunk.getIndex(lx, ly, lz);
    if (this.data[idx] === word) return false;
    this.data[idx] = word >>> 0;
    this.isDirty = true;
    this.lastModified = Date.now();
    return true;
  }

  /**
   * Initializes a chunk with default Gunmetal base on the bottom half (y: 0..15)
   * and air on the top half (y: 16..31).
   */
  public generateDefaultBase(): void {
    const halfY = Math.floor(CHUNK_SIZE_Y / 2);
    for (let y = 0; y < halfY; y++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
          const idx = VoxelChunk.getIndex(x, y, z);
          this.data[idx] = VOXEL_WORD_GUNMETAL;
        }
      }
    }
    this.isDirty = true;
  }

  public isEmpty(): boolean {
    for (let i = 0; i < this.data.length; i++) {
      if (!isVoxelAir(this.data[i])) return false;
    }
    return true;
  }

  /**
   * Run-Length Encoding (RLE) serialization:
   * Encodes sequences of repeating 32-bit voxel words into [count, value, count, value, ...]
   */
  public serializeRLE(): number[] {
    const out: number[] = [];
    if (this.data.length === 0) return out;

    let currentVal = this.data[0];
    let count = 1;

    for (let i = 1; i < this.data.length; i++) {
      const val = this.data[i];
      if (val === currentVal && count < 65535) {
        count++;
      } else {
        out.push(count, currentVal);
        currentVal = val;
        count = 1;
      }
    }
    out.push(count, currentVal);
    return out;
  }

  /**
   * Reconstruct chunk voxel data from an RLE encoded array.
   */
  public static deserializeRLE(rleArray: number[], cx: number, cz: number, cy: number = 0): VoxelChunk {
    const chunk = new VoxelChunk(cx, cz, cy);
    let targetIdx = 0;

    for (let i = 0; i < rleArray.length; i += 2) {
      const count = rleArray[i];
      const val = rleArray[i + 1] >>> 0;
      for (let c = 0; c < count && targetIdx < CHUNK_TOTAL_CELLS; c++) {
        chunk.data[targetIdx++] = val;
      }
    }

    chunk.isDirty = true;
    return chunk;
  }
}
