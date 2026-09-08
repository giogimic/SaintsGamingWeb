import { VoxelShape, VOXEL_WORD_AIR_LOW, VOXEL_WORD_AIR_HIGH, VOXEL_WORD_GUNMETAL_LOW, VOXEL_WORD_GUNMETAL_HIGH, isVoxelAir } from './VoxelWord';

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
  public dataLow: Uint32Array;
  public dataHigh: Uint32Array;
  public isDirty = true;
  public lastModified = Date.now();

  constructor(cx: number, cz: number, cy: number = 0, initialDataLow?: Uint32Array, initialDataHigh?: Uint32Array) {
    this.cx = cx;
    this.cz = cz;
    this.cy = cy;
    this.key = VoxelChunk.getChunkKey(cx, cz, cy);
    this.dataLow = initialDataLow && initialDataLow.length === CHUNK_TOTAL_CELLS
      ? initialDataLow
      : new Uint32Array(CHUNK_TOTAL_CELLS);
    this.dataHigh = initialDataHigh && initialDataHigh.length === CHUNK_TOTAL_CELLS
      ? initialDataHigh
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

  public getLow(lx: number, ly: number, lz: number): number {
    if (!VoxelChunk.isValidLocal(lx, ly, lz)) return VOXEL_WORD_AIR_LOW;
    const idx = VoxelChunk.getIndex(lx, ly, lz);
    return this.dataLow[idx];
  }

  public getHigh(lx: number, ly: number, lz: number): number {
    if (!VoxelChunk.isValidLocal(lx, ly, lz)) return VOXEL_WORD_AIR_HIGH;
    const idx = VoxelChunk.getIndex(lx, ly, lz);
    return this.dataHigh[idx];
  }

  public set(lx: number, ly: number, lz: number, low: number, high: number): boolean {
    if (!VoxelChunk.isValidLocal(lx, ly, lz)) return false;
    const idx = VoxelChunk.getIndex(lx, ly, lz);
    if (this.dataLow[idx] === low && this.dataHigh[idx] === high) return false;
    this.dataLow[idx] = low >>> 0;
    this.dataHigh[idx] = high >>> 0;
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
          this.dataLow[idx] = VOXEL_WORD_GUNMETAL_LOW;
          this.dataHigh[idx] = VOXEL_WORD_GUNMETAL_HIGH;
        }
      }
    }
    this.isDirty = true;
  }

  public isEmpty(): boolean {
    for (let i = 0; i < this.dataLow.length; i++) {
      if (!isVoxelAir(this.dataLow[i])) return false;
    }
    return true;
  }

  /**
   * Run-Length Encoding (RLE) serialization:
   * Encodes sequences of repeating 64-bit voxel words.
   * NOT USED ON NETWORK (PaletteRLE is used on network).
   */
  public serializeRLE(): number[] {
    throw new Error('serializeRLE is deprecated for 64-bit chunks. Use PaletteRLEBinary.');
  }

  public static deserializeRLE(rleArray: number[], cx: number, cz: number, cy: number = 0): VoxelChunk {
    throw new Error('deserializeRLE is deprecated for 64-bit chunks. Use PaletteRLEBinary.');
  }

  /**
   * Palette-Indexed Binary RLE serialization:
   * Maps unique 64-bit voxel words to 1-byte indices (P <= 256).
   */
  public serializePaletteRLEBinary(): Uint8Array {
    const paletteMap = new Map<bigint, number>();
    const paletteLow: number[] = [];
    const paletteHigh: number[] = [];

    for (let i = 0; i < this.dataLow.length; i++) {
      const low = this.dataLow[i];
      const high = this.dataHigh[i];
      const b64 = (BigInt(high >>> 0) << BigInt(32)) | BigInt(low >>> 0);
      
      if (!paletteMap.has(b64)) {
        paletteMap.set(b64, paletteLow.length);
        paletteLow.push(low);
        paletteHigh.push(high);
        if (paletteLow.length > 256) {
          break;
        }
      }
    }

    const paletteCount = Math.min(256, paletteLow.length);

    const runs: Array<{ count: number; palIdx: number }> = [];
    if (this.dataLow.length > 0) {
      const l0 = this.dataLow[0];
      const h0 = this.dataHigh[0];
      let currentPalIdx = paletteMap.get((BigInt(h0 >>> 0) << BigInt(32)) | BigInt(l0 >>> 0)) ?? 0;
      let count = 1;

      for (let i = 1; i < this.dataLow.length; i++) {
        const l = this.dataLow[i];
        const h = this.dataHigh[i];
        const b64 = (BigInt(h >>> 0) << BigInt(32)) | BigInt(l >>> 0);
        const palIdx = paletteMap.get(b64) ?? 0;
        
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

    // Header: 1 (type) + 6 (cx, cy, cz) + 1 (paletteCount) + paletteCount * 8
    // Runs: runs.length * 3 (uint16 count + uint8 palIdx)
    const headerSize = 1 + 6 + 1 + paletteCount * 8;
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
      view.setUint32(offset, paletteLow[p] >>> 0, true);
      offset += 4;
      view.setUint32(offset, paletteHigh[p] >>> 0, true);
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

    const paletteLow: number[] = new Array(paletteCount);
    const paletteHigh: number[] = new Array(paletteCount);
    for (let p = 0; p < paletteCount; p++) {
      paletteLow[p] = view.getUint32(offset, true);
      offset += 4;
      paletteHigh[p] = view.getUint32(offset, true);
      offset += 4;
    }

    const chunk = new VoxelChunk(cx, cz, cy);
    let targetIdx = 0;

    while (offset + 3 <= bytes.byteLength && targetIdx < CHUNK_TOTAL_CELLS) {
      const count = view.getUint16(offset, true); offset += 2;
      const palIdx = view.getUint8(offset++);
      const low = paletteLow[palIdx] ?? VOXEL_WORD_AIR_LOW;
      const high = paletteHigh[palIdx] ?? VOXEL_WORD_AIR_HIGH;

      for (let c = 0; c < count && targetIdx < CHUNK_TOTAL_CELLS; c++) {
        chunk.dataLow[targetIdx] = low;
        chunk.dataHigh[targetIdx] = high;
        targetIdx++;
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
    low: number,
    high: number
  ): Uint8Array {
    const buffer = new Uint8Array(17);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 0x02); // CHUNK_PACKET_DELTA_VOXEL
    view.setInt16(1, cx, true);
    view.setInt16(3, cy, true);
    view.setInt16(5, cz, true);
    view.setUint16(7, localIndex & 0x7fff, true);
    view.setUint32(9, low >>> 0, true);
    view.setUint32(13, high >>> 0, true);
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
    low: number;
    high: number;
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
      low: view.getUint32(9, true),
      high: view.getUint32(13, true),
    };
  }
}
