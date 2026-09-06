import * as pako from 'pako';
import { CHUNK_TOTAL_CELLS } from './VoxelChunk';

/**
 * Compresses a Uint32Array chunk data array into a Buffer using gzip.
 */
export function compressChunkData(data: Uint32Array): Buffer {
  if (data.length !== CHUNK_TOTAL_CELLS) {
    throw new Error(`Invalid chunk data length: expected ${CHUNK_TOTAL_CELLS}, got ${data.length}`);
  }
  // Convert Uint32Array to Uint8Array directly (4 bytes per element)
  const uint8Data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  
  // Compress using pako gzip
  const compressed = pako.gzip(uint8Data);
  return Buffer.from(compressed);
}

/**
 * Decompresses a Buffer back into a Uint32Array chunk data array.
 */
export function decompressChunkData(buffer: Buffer | Uint8Array): Uint32Array {
  // Decompress using pako
  const decompressed = pako.ungzip(buffer);
  
  // Convert back to Uint32Array
  const uint32Data = new Uint32Array(
    decompressed.buffer, 
    decompressed.byteOffset, 
    decompressed.byteLength / Uint32Array.BYTES_PER_ELEMENT
  );
  
  if (uint32Data.length !== CHUNK_TOTAL_CELLS) {
    throw new Error(`Invalid decompressed chunk length: expected ${CHUNK_TOTAL_CELLS}, got ${uint32Data.length}`);
  }
  
  return uint32Data;
}
