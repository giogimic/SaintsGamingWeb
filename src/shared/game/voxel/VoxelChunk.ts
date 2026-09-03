import { VOXEL_WORD_AIR, VOXEL_WORD_GUNMETAL, isVoxelAir } from './VoxelWord';

export const CHUNK_SIZE_X = 32;
export const CHUNK_SIZE_Z = 32;
export const CHUNK_SIZE_Y = 32; // Vertical height — 32x32x32 isotropic standard
export const CHUNK_TOTAL_CELLS = CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y; // 32,768 cells

export const CHUNK_SHIFT_X = 5;
export const CHUNK_SHIFT_Z = 5;
export const CHUNK_SHIFT_Y = 5;
export const CHUNK_MASK = 31; // 0x1F

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
    return (localX & 31) | ((localZ & 31) << 5) | ((localY & 31) << 10);
  }

  public static getLocalCoords(index: number): { lx: number; ly: number; lz: number } {
    const lx = index & 31;
    const lz = (index >> 5) & 31;
    const ly = (index >> 10) & 31;
    return { lx, ly, lz };
  }

  public static isValidLocal(lx: number, ly: number, lz: number): boolean {
    return lx >= 0 && lx < 32 && lz >= 0 && lz < 32 && ly >= 0 && ly < 32;
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

  /**
   * Palette-Indexed Binary RLE serialization:
   * Maps unique voxel words to 1-byte indices (P <= 256),
   * and encodes sequences as [count (uint16), palette_index (uint8)].
   */
  public serializePaletteRLEBinary(): Uint8Array {
    // 1. Build unique palette (words in occurrence order)
    const paletteMap = new Map<number, number>();
    const palette: number[] = [];

    for (let i = 0; i < this.data.length; i++) {
      const word = this.data[i];
      if (!paletteMap.has(word)) {
        paletteMap.set(word, palette.length);
        palette.push(word);
        if (palette.length > 256) {
          // Fallback if chunk exceeds 256 unique materials: truncate to 256
          break;
        }
      }
    }

    const paletteCount = Math.min(256, palette.length);

    // 2. Compute RLE runs using palette indices
    const runs: Array<{ count: number; palIdx: number }> = [];
    if (this.data.length > 0) {
      let currentWord = this.data[0];
      let currentPalIdx = paletteMap.get(currentWord) ?? 0;
      let count = 1;

      for (let i = 1; i < this.data.length; i++) {
        const word = this.data[i];
        const palIdx = paletteMap.get(word) ?? 0;
        if (palIdx === currentPalIdx && count < 65535) {
          count++;
        } else {
          runs.push({ count, palIdx: currentPalIdx });
          currentPalIdx = palIdx;
          count = 1;
        }
      }
      runs.push({ count, palIdx: currentPalIdx });
    }

    // 3. Allocate binary buffer:
    // Header: 1 (type) + 6 (cx, cy, cz) + 1 (paletteCount) + paletteCount * 4
    // Runs: runs.length * 3 (uint16 count + uint8 palIdx)
    const headerSize = 1 + 6 + 1 + paletteCount * 4;
    const bodySize = runs.length * 3;
    const buffer = new Uint8Array(headerSize + bodySize);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    let offset = 0;
    view.setUint8(offset++, 0x01); // CHUNK_PACKET_PALETTE_RLE
    view.setInt16(offset, this.cx, true); offset += 2;
    view.setInt16(offset, this.cy, true); offset += 2;
    view.setInt16(offset, this.cz, true); offset += 2;

    view.setUint8(offset++, paletteCount === 256 ? 0 : paletteCount);
    for (let p = 0; p < paletteCount; p++) {
      view.setUint32(offset, palette[p] >>> 0, true);
      offset += 4;
    }

    for (let r = 0; r < runs.length; r++) {
      view.setUint16(offset, runs[r].count, true);
      offset += 2;
      view.setUint8(offset++, runs[r].palIdx);
    }

    return buffer;
  }

  /**
   * Reconstruct chunk from a Palette-Indexed Binary RLE buffer.
   */
  public static deserializePaletteRLEBinary(bytes: Uint8Array): VoxelChunk {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    const packetType = view.getUint8(offset++);
    if (packetType !== 0x01) {
      throw new Error(`Invalid chunk packet type: 0x${packetType.toString(16)}`);
    }

    const cx = view.getInt16(offset, true); offset += 2;
    const cy = view.getInt16(offset, true); offset += 2;
    const cz = view.getInt16(offset, true); offset += 2;

    let paletteCount = view.getUint8(offset++);
    if (paletteCount === 0) paletteCount = 256;

    const palette: number[] = new Array(paletteCount);
    for (let p = 0; p < paletteCount; p++) {
      palette[p] = view.getUint32(offset, true);
      offset += 4;
    }

    const chunk = new VoxelChunk(cx, cz, cy);
    let targetIdx = 0;

    while (offset + 3 <= bytes.byteLength && targetIdx < CHUNK_TOTAL_CELLS) {
      const count = view.getUint16(offset, true); offset += 2;
      const palIdx = view.getUint8(offset++);
      const word = palette[palIdx] ?? VOXEL_WORD_AIR;

      for (let c = 0; c < count && targetIdx < CHUNK_TOTAL_CELLS; c++) {
        chunk.data[targetIdx++] = word;
      }
    }

    chunk.isDirty = true;
    return chunk;
  }

  /**
   * Serializes a single-voxel mutation into an authoritative delta packet (13 bytes).
   */
  public static serializeVoxelDelta(
    cx: number,
    cy: number,
    cz: number,
    localIndex: number,
    word: number
  ): Uint8Array {
    const buffer = new Uint8Array(13);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 0x02); // CHUNK_PACKET_DELTA_VOXEL
    view.setInt16(1, cx, true);
    view.setInt16(3, cy, true);
    view.setInt16(5, cz, true);
    view.setUint16(7, localIndex & 0x7fff, true);
    view.setUint32(9, word >>> 0, true);
    return buffer;
  }

  /**
   * Deserializes a single-voxel mutation delta packet.
   */
  public static deserializeVoxelDelta(bytes: Uint8Array): {
    cx: number;
    cy: number;
    cz: number;
    localIndex: number;
    word: number;
  } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const packetType = view.getUint8(0);
    if (packetType !== 0x02) {
      throw new Error(`Invalid delta packet type: 0x${packetType.toString(16)}`);
    }
    return {
      cx: view.getInt16(1, true),
      cy: view.getInt16(3, true),
      cz: view.getInt16(5, true),
      localIndex: view.getUint16(7, true),
      word: view.getUint32(9, true),
    };
  }
}

