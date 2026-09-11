"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/services/bake/bakeWorker.ts
var bakeWorker_exports = {};
module.exports = __toCommonJS(bakeWorker_exports);
var import_worker_threads = require("worker_threads");

// src/shared/game/voxel/VoxelWord.ts
var VoxelShape = {
  AIR: 0,
  FULL_CUBE: 1,
  SLOPE_45: 2,
  SLOPE_GENTLE_BASE: 3,
  SLOPE_GENTLE_TOP: 4,
  SLOPE_CORNER_OUTER: 5,
  SLOPE_CORNER_INNER: 6,
  SLAB_BOTTOM: 7,
  SLAB_TOP: 8,
  STAIRS_STRAIGHT: 9,
  STAIRS_CORNER: 10,
  PRISM_DIAGONAL: 11,
  COLUMN_CENTER: 12,
  FENCE_RAIL: 13,
  ADAPTIVE_ALPHA: 14,
  FARMLAND: 15,
  CROSS_QUAD: 16,
  THIN_LAYER: 17,
  POST_CENTER: 18,
  WALL_PANEL: 19,
  FLUID_SURFACE: 20
};
var VoxelOrientation = {
  NORTH: 0,
  // 0 deg
  EAST: 1,
  // 90 deg
  SOUTH: 2,
  // 180 deg
  WEST: 3,
  // 270 deg
  INVERTED_NORTH: 4,
  INVERTED_EAST: 5,
  INVERTED_SOUTH: 6,
  INVERTED_WEST: 7
};
var VoxelPhysics = {
  PASS_THROUGH: 0,
  SOLID_OBSTACLE: 1,
  WALKABLE_SLOPE: 2,
  SWIMMABLE_FLUID: 3,
  CLIMBABLE: 4,
  HAZARD: 5
};
var VoxelLogic = {
  NONE: 0,
  SPAWN_ANCHOR: 1,
  WARP_GATE: 2,
  HARVEST_NODE: 3,
  SHOP_COUNTER: 4,
  SAFE_ZONE: 5,
  QUEST_TARGET: 6
};
var VOXEL_MAT_AIR = 0;
var VOXEL_MAT_GUNMETAL = 1;
var VOXEL_MAT_GRASS = 2;
var VOXEL_MAT_DIRT = 3;
var VOXEL_MAT_STONE = 4;
var VOXEL_MAT_WATER = 6;
function packVoxel(materialId, shapeId = VoxelShape.FULL_CUBE, orientation = VoxelOrientation.NORTH, aoTint = 0, physics = VoxelPhysics.SOLID_OBSTACLE, logic = VoxelLogic.NONE) {
  const low = (materialId & 16777215 | (shapeId & 255) << 24) >>> 0;
  const high = (orientation & 15 | (aoTint & 15) << 4 | (physics & 15) << 8 | (logic & 15) << 12) >>> 0;
  return { low, high };
}
function extractShapeId(low) {
  return low >>> 24 & 255;
}
function isVoxelAir(low) {
  return (low & 16777215) === 0 && extractShapeId(low) === VoxelShape.AIR;
}
var airPack = packVoxel(VOXEL_MAT_AIR, VoxelShape.AIR, VoxelOrientation.NORTH, 0, VoxelPhysics.PASS_THROUGH, VoxelLogic.NONE);
var gunmetalPack = packVoxel(VOXEL_MAT_GUNMETAL, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, VoxelLogic.NONE);
var grassPack = packVoxel(VOXEL_MAT_GRASS, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE, VoxelLogic.NONE);
var VOXEL_WORD_AIR_LOW = airPack.low;
var VOXEL_WORD_AIR_HIGH = airPack.high;
var VOXEL_WORD_GUNMETAL_LOW = gunmetalPack.low;
var VOXEL_WORD_GUNMETAL_HIGH = gunmetalPack.high;
var VOXEL_WORD_GRASS_LOW = grassPack.low;
var VOXEL_WORD_GRASS_HIGH = grassPack.high;

// src/shared/game/voxel/VoxelChunk.ts
var CHUNK_SIZE_X = 32;
var CHUNK_SIZE_Z = 32;
var CHUNK_SIZE_Y = 32;
var CHUNK_TOTAL_CELLS = CHUNK_SIZE_X * CHUNK_SIZE_Z * CHUNK_SIZE_Y;
var VoxelChunk = class _VoxelChunk {
  constructor(cx, cz, cy = 0, initialDataLow, initialDataHigh) {
    this.isDirty = true;
    this.lastModified = Date.now();
    this.cx = cx;
    this.cz = cz;
    this.cy = cy;
    this.key = _VoxelChunk.getChunkKey(cx, cz, cy);
    this.dataLow = initialDataLow && initialDataLow.length === CHUNK_TOTAL_CELLS ? initialDataLow : new Uint32Array(CHUNK_TOTAL_CELLS);
    this.dataHigh = initialDataHigh && initialDataHigh.length === CHUNK_TOTAL_CELLS ? initialDataHigh : new Uint32Array(CHUNK_TOTAL_CELLS);
  }
  static getChunkKey(cx, cz, cy = 0) {
    return `${cx}_${cz}_${cy}`;
  }
  static parseChunkKey(key) {
    const parts = key.split("_").map(Number);
    return {
      cx: parts[0] ?? 0,
      cz: parts[1] ?? 0,
      cy: parts[2] ?? 0
    };
  }
  static getIndex(localX, localY, localZ) {
    return localX & 31 | (localZ & 31) << 5 | (localY & 31) << 10;
  }
  static getLocalCoords(index) {
    const lx = index & 31;
    const lz = index >> 5 & 31;
    const ly = index >> 10 & 31;
    return { lx, ly, lz };
  }
  static isValidLocal(lx, ly, lz) {
    return lx >= 0 && lx < 32 && lz >= 0 && lz < 32 && ly >= 0 && ly < 32;
  }
  getLow(lx, ly, lz) {
    if (!_VoxelChunk.isValidLocal(lx, ly, lz)) return VOXEL_WORD_AIR_LOW;
    const idx = _VoxelChunk.getIndex(lx, ly, lz);
    return this.dataLow[idx];
  }
  getHigh(lx, ly, lz) {
    if (!_VoxelChunk.isValidLocal(lx, ly, lz)) return VOXEL_WORD_AIR_HIGH;
    const idx = _VoxelChunk.getIndex(lx, ly, lz);
    return this.dataHigh[idx];
  }
  set(lx, ly, lz, low, high) {
    if (!_VoxelChunk.isValidLocal(lx, ly, lz)) return false;
    const idx = _VoxelChunk.getIndex(lx, ly, lz);
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
  generateDefaultBase() {
    const halfY = Math.floor(CHUNK_SIZE_Y / 2);
    for (let y = 0; y < halfY; y++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        for (let x = 0; x < CHUNK_SIZE_X; x++) {
          const idx = _VoxelChunk.getIndex(x, y, z);
          this.dataLow[idx] = VOXEL_WORD_GUNMETAL_LOW;
          this.dataHigh[idx] = VOXEL_WORD_GUNMETAL_HIGH;
        }
      }
    }
    this.isDirty = true;
  }
  isEmpty() {
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
  serializeRLE() {
    throw new Error("serializeRLE is deprecated for 64-bit chunks. Use PaletteRLEBinary.");
  }
  static deserializeRLE(rleArray, cx, cz, cy = 0) {
    throw new Error("deserializeRLE is deprecated for 64-bit chunks. Use PaletteRLEBinary.");
  }
  /**
   * Palette-Indexed Binary RLE serialization:
   * Maps unique 64-bit voxel words to 1-byte indices (P <= 256).
   */
  serializePaletteRLEBinary() {
    const paletteMap = /* @__PURE__ */ new Map();
    const paletteLow = [];
    const paletteHigh = [];
    for (let i = 0; i < this.dataLow.length; i++) {
      const low = this.dataLow[i];
      const high = this.dataHigh[i];
      const b64 = BigInt(high >>> 0) << BigInt(32) | BigInt(low >>> 0);
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
    const runs = [];
    if (this.dataLow.length > 0) {
      const l0 = this.dataLow[0];
      const h0 = this.dataHigh[0];
      let currentPalIdx = paletteMap.get(BigInt(h0 >>> 0) << BigInt(32) | BigInt(l0 >>> 0)) ?? 0;
      let count = 1;
      for (let i = 1; i < this.dataLow.length; i++) {
        const l = this.dataLow[i];
        const h = this.dataHigh[i];
        const b64 = BigInt(h >>> 0) << BigInt(32) | BigInt(l >>> 0);
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
    const headerSize = 1 + 6 + 1 + paletteCount * 8;
    const bodySize = runs.length * 3;
    const buffer = new Uint8Array(headerSize + bodySize);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;
    view.setUint8(offset++, 1);
    view.setInt16(offset, this.cx, true);
    offset += 2;
    view.setInt16(offset, this.cy, true);
    offset += 2;
    view.setInt16(offset, this.cz, true);
    offset += 2;
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
  static deserializePaletteRLEBinary(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;
    const packetType = view.getUint8(offset++);
    if (packetType !== 1) {
      throw new Error(`Invalid chunk packet type: 0x${packetType.toString(16)}`);
    }
    const cx = view.getInt16(offset, true);
    offset += 2;
    const cy = view.getInt16(offset, true);
    offset += 2;
    const cz = view.getInt16(offset, true);
    offset += 2;
    let paletteCount = view.getUint8(offset++);
    if (paletteCount === 0) paletteCount = 256;
    const paletteLow = new Array(paletteCount);
    const paletteHigh = new Array(paletteCount);
    for (let p = 0; p < paletteCount; p++) {
      paletteLow[p] = view.getUint32(offset, true);
      offset += 4;
      paletteHigh[p] = view.getUint32(offset, true);
      offset += 4;
    }
    const chunk = new _VoxelChunk(cx, cz, cy);
    let targetIdx = 0;
    while (offset + 3 <= bytes.byteLength && targetIdx < CHUNK_TOTAL_CELLS) {
      const count = view.getUint16(offset, true);
      offset += 2;
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
  static serializeVoxelDelta(cx, cy, cz, localIndex, low, high) {
    const buffer = new Uint8Array(17);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 2);
    view.setInt16(1, cx, true);
    view.setInt16(3, cy, true);
    view.setInt16(5, cz, true);
    view.setUint16(7, localIndex & 32767, true);
    view.setUint32(9, low >>> 0, true);
    view.setUint32(13, high >>> 0, true);
    return buffer;
  }
  /**
   * Deserializes a single-voxel mutation delta packet.
   */
  static deserializeVoxelDelta(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const packetType = view.getUint8(0);
    if (packetType !== 2) {
      throw new Error(`Invalid delta packet type: 0x${packetType.toString(16)}`);
    }
    return {
      cx: view.getInt16(1, true),
      cy: view.getInt16(3, true),
      cz: view.getInt16(5, true),
      localIndex: view.getUint16(7, true),
      low: view.getUint32(9, true),
      high: view.getUint32(13, true)
    };
  }
};

// src/shared/game/voxel/chunkMigration.ts
var LEGACY_CHUNK_TOTAL_CELLS = 16 * 16 * 32;

// src/shared/game/atlas/world/TerrainModifiers.ts
function calculateTerrainElevation(context, resolver, x, z) {
  const sample = { x, y: 0, z };
  const elev = context.elevation.sample(sample);
  const cont = context.continentalness.sample(sample);
  const erosion = context.erosion.sample(sample);
  const rugged = context.ruggedness.sample(sample);
  const area = resolver.resolveArea(context, x, z);
  const mods = area.terrainModifiers;
  const erosionFactor = 1 - erosion;
  const ruggedImpact = rugged * erosionFactor * cont * mods.ruggednessMultiplier;
  let finalHeight = elev + ruggedImpact;
  finalHeight = finalHeight * mods.heightMultiplier + mods.heightOffset;
  return finalHeight;
}

// src/shared/game/voxel/VoxelWorldGenerator.ts
function mulberry32(a) {
  return function() {
    var t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function resolveVoxelAtElevation(wy, surfaceY, area, fallbackBaseMaterial, waterLevel = 12) {
  if (wy > surfaceY) {
    if (wy <= waterLevel) {
      return packVoxel(VOXEL_MAT_WATER, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SWIMMABLE_FLUID);
    }
    return { low: VOXEL_WORD_AIR_LOW, high: VOXEL_WORD_AIR_HIGH };
  }
  if (area && area.strata) {
    if (wy === surfaceY) {
      return packVoxel(area.strata.surfaceMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    const depth2 = surfaceY - wy;
    if (depth2 <= area.strata.subsurfaceDepth) {
      return packVoxel(area.strata.subsurfaceMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    if (wy === 0) {
      return packVoxel(area.strata.bedrockMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
    return packVoxel(area.strata.mantleMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
  }
  if (wy === surfaceY) {
    return packVoxel(fallbackBaseMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
  }
  const depth = surfaceY - wy;
  if (depth <= 2) {
    if (fallbackBaseMaterial === VOXEL_MAT_GRASS) {
      return packVoxel(VOXEL_MAT_DIRT, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    }
  }
  return packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
}
function generateChunkVoxels(cx, cz, cy, config, atlasContext, atlasResolver) {
  const chunk = new VoxelChunk(cx, cz, cy);
  const mode = config.mode || "foundation";
  const baseMaterial = config.baseMaterial ?? VOXEL_MAT_GRASS;
  const baseElevation = config.baseElevation ?? 16;
  const elevationRange = config.elevationRange ?? 8;
  const waterLevel = config.waterLevel ?? 12;
  const maxHeight = (config.heightChunks || 1) * CHUNK_SIZE_Y;
  if (mode === "blank") {
    return chunk;
  }
  if (mode === "foundation") {
    const targetWord = packVoxel(baseMaterial, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    const stoneWord = packVoxel(VOXEL_MAT_STONE, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
    for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
      const globalWY = cy * CHUNK_SIZE_Y + ly;
      if (globalWY >= baseElevation) continue;
      const isSurface = globalWY === baseElevation - 1;
      const word = isSurface ? targetWord : baseMaterial === VOXEL_MAT_GRASS ? stoneWord : targetWord;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
          const idx = VoxelChunk.getIndex(lx, ly, lz);
          chunk.dataLow[idx] = word.low;
          chunk.dataHigh[idx] = word.high;
        }
      }
    }
    chunk.isDirty = true;
    return chunk;
  }
  const startWX = cx * CHUNK_SIZE_X;
  const startWZ = cz * CHUNK_SIZE_Z;
  const startWY = cy * CHUNK_SIZE_Y;
  for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = startWX + lx;
      const wz = startWZ + lz;
      let surfaceY = baseElevation;
      let area = null;
      if (atlasContext && atlasResolver) {
        area = atlasResolver.resolveArea(atlasContext, wx, wz);
        const atlasElev = calculateTerrainElevation(atlasContext, atlasResolver, wx, wz);
        const mappedElev = baseElevation + (atlasElev - 0.5) * elevationRange * 2;
        surfaceY = Math.max(1, Math.min(maxHeight - 1, Math.round(mappedElev)));
      }
      for (let ly = 0; ly < CHUNK_SIZE_Y; ly++) {
        const wy = startWY + ly;
        const word = resolveVoxelAtElevation(wy, surfaceY, area, baseMaterial, waterLevel);
        if (word.low !== VOXEL_WORD_AIR_LOW) {
          const idx = VoxelChunk.getIndex(lx, ly, lz);
          chunk.dataLow[idx] = word.low;
          chunk.dataHigh[idx] = word.high;
        }
      }
    }
  }
  const seedStr = String(config.seed || 1337);
  const chunkSeed = Array.from(seedStr).reduce((acc, char) => acc + char.charCodeAt(0), 0) ^ (chunk.cx * 73856093 ^ chunk.cz * 19349663);
  const random = mulberry32(chunkSeed);
  for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
      const wx = chunk.cx * CHUNK_SIZE_X + lx;
      const wz = chunk.cz * CHUNK_SIZE_Z + lz;
      const area = atlasContext && atlasResolver ? atlasResolver.resolveArea(atlasContext, wx, wz) : null;
      if (!area || !area.decorators) continue;
      let topLy = -1;
      let topWord = { low: VOXEL_WORD_AIR_LOW, high: VOXEL_WORD_AIR_HIGH };
      for (let ly = CHUNK_SIZE_Y - 1; ly >= 0; ly--) {
        const idx = VoxelChunk.getIndex(lx, ly, lz);
        if (chunk.dataLow[idx] !== VOXEL_WORD_AIR_LOW) {
          topLy = ly;
          topWord = { low: chunk.dataLow[idx], high: chunk.dataHigh[idx] };
          break;
        }
      }
      if (topLy >= 0 && topLy < CHUNK_SIZE_Y - 1) {
        if (area.decorators.surfaceFlora && area.decorators.surfaceFlora.length > 0) {
          const topPhys = topWord.high >>> 8 & 15;
          if (topPhys !== VoxelPhysics.SWIMMABLE_FLUID) {
            for (const rule of area.decorators.surfaceFlora) {
              if (random() < rule.probability) {
                const stack = rule.stackHeight || 1;
                for (let sy = 0; sy < stack; sy++) {
                  if (topLy + 1 + sy < CHUNK_SIZE_Y) {
                    const idx = VoxelChunk.getIndex(lx, topLy + 1 + sy, lz);
                    const packed = packVoxel(rule.material, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
                    chunk.dataLow[idx] = packed.low;
                    chunk.dataHigh[idx] = packed.high;
                  }
                }
                break;
              }
            }
          }
        }
      }
      if (area.decorators.subsurfaceOres && area.decorators.subsurfaceOres.length > 0) {
        for (let ly = 0; ly <= topLy; ly++) {
          if (random() < 0.05) {
            for (const rule of area.decorators.subsurfaceOres) {
              if (random() < rule.probability) {
                const idx = VoxelChunk.getIndex(lx, ly, lz);
                const phys = chunk.dataHigh[idx] >>> 8 & 15;
                if (phys === VoxelPhysics.SOLID_OBSTACLE) {
                  const packed = packVoxel(rule.material, VoxelShape.FULL_CUBE, VoxelOrientation.NORTH, 0, VoxelPhysics.SOLID_OBSTACLE);
                  chunk.dataLow[idx] = packed.low;
                  chunk.dataHigh[idx] = packed.high;
                  break;
                }
              }
            }
          }
        }
      }
    }
  }
  chunk.isDirty = true;
  return chunk;
}

// src/server/services/bake/bakeWorker.ts
var import_zlib = __toESM(require("zlib"));
async function handleTask(task) {
  const { config, regionX, regionZ, chunksPerRegion } = task;
  const startCx = regionX * chunksPerRegion;
  const startCz = regionZ * chunksPerRegion;
  const regionData = {};
  let chunksGenerated = 0;
  for (let lz = 0; lz < chunksPerRegion; lz++) {
    for (let lx = 0; lx < chunksPerRegion; lx++) {
      const cx = startCx + lx;
      const cz = startCz + lz;
      const seedBase = String(config.seed || 1337);
      const chunkHash = `${seedBase}_v1_${cx}_${cz}_0_all`;
      const chunkConfig = {
        ...config,
        seed: chunkHash
      };
      const chunk = generateChunkVoxels(cx, cz, 0, chunkConfig);
      if (chunk.dataLow.length !== 32768 || chunk.dataHigh.length !== 32768) {
        throw new Error(`Validation failed for chunk ${cx},${cz}: Invalid array lengths.`);
      }
      const chunkKey = `${cx}_${cz}_0`;
      regionData[chunkKey] = [
        ...chunk.dataLow,
        ...chunk.dataHigh
      ];
      chunksGenerated++;
    }
  }
  const regionString = JSON.stringify({ chunks: regionData });
  const compressedBuffer = import_zlib.default.deflateSync(Buffer.from(regionString, "utf-8"));
  const checksum = require("crypto").createHash("sha256").update(compressedBuffer).digest("hex");
  const result = {
    taskId: task.taskId,
    regionX,
    regionZ,
    status: "COMPLETED",
    chunksGenerated,
    compressedPayload: new Uint8Array(compressedBuffer),
    checksum
  };
  import_worker_threads.parentPort?.postMessage(result);
}
import_worker_threads.parentPort?.on("message", async (task) => {
  try {
    await handleTask(task);
  } catch (err) {
    const errResult = {
      taskId: task.taskId,
      regionX: task.regionX,
      regionZ: task.regionZ,
      status: "ERROR",
      chunksGenerated: 0,
      error: err.message || "Unknown Worker Error"
    };
    import_worker_threads.parentPort?.postMessage(errResult);
  }
});
