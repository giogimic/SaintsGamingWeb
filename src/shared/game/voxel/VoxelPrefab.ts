/**
 * Saints Gaming — 3D Volumetric Prefab Blueprint Contract, Extraction & Matrix Rotation
 *
 * Provides strongly-typed .prefab schema, 3D subvolume extraction, 90° CW Y-axis matrix rotation,
 * and chunk memory stamping for the Studio Stamp Tool ('P').
 */

import { VoxelWorld } from './VoxelWorldDoc';
import {
  isVoxelAir,
  extractShapeId,
  extractOrientation,
  withVoxelOrientationHigh,
  VoxelShape,
  VOXEL_WORD_AIR_LOW,
  VOXEL_WORD_AIR_HIGH,
} from './VoxelWord';

export interface PrefabEntityMarker {
  id: string;
  type: string;
  relX: number;
  relY: number;
  relZ: number;
  properties?: Record<string, any>;
}

export interface PrefabTriggerMarker {
  id: string;
  action: string;
  relX: number;
  relY: number;
  relZ: number;
}

export interface PrefabLootMarker {
  chestId: string;
  tableId: string;
  relX: number;
  relY: number;
  relZ: number;
}

export interface VoxelPrefabData {
  formatVersion: 1;
  name: string;
  category?: string;
  dimensions: [number, number, number]; // [dx, dy, dz]
  anchorOffset: [number, number, number]; // [ax, ay, az]
  paletteLow: number[]; // Unique 32-bit low voxel words
  paletteHigh: number[]; // Unique 32-bit high voxel words
  voxelData: number[]; // RLE compressed: [count, palIdx, count, palIdx, ...]
  metadata?: {
    entities?: PrefabEntityMarker[];
    triggers?: PrefabTriggerMarker[];
    lootTables?: PrefabLootMarker[];
  };
}

/**
 * Rotates orientation 90° Clockwise on Y-axis (North -> East -> South -> West).
 */
export function rotateOrientationCW(orient: number): number {
  return (orient + 1) % 4;
}

/**
 * Rotates directional voxel words (stairs, slopes, fences) 90° CW on Y-axis.
 */
export function rotateVoxelWordCW(low: number, high: number): { low: number; high: number } {
  if (isVoxelAir(low)) return { low, high };
  const shape = extractShapeId(low);

  const hasOrientation =
    shape === VoxelShape.SLOPE_45 ||
    shape === VoxelShape.STAIRS_STRAIGHT ||
    shape === VoxelShape.STAIRS_CORNER ||
    shape === VoxelShape.SLOPE_GENTLE_BASE ||
    shape === VoxelShape.SLOPE_GENTLE_TOP ||
    shape === VoxelShape.SLOPE_CORNER_OUTER ||
    shape === VoxelShape.SLOPE_CORNER_INNER ||
    shape === VoxelShape.PRISM_DIAGONAL ||
    shape === VoxelShape.FENCE_RAIL;

  if (hasOrientation) {
    const curOrient = extractOrientation(high);
    const newOrient = rotateOrientationCW(curOrient);
    return { low, high: withVoxelOrientationHigh(high, newOrient) };
  }

  return { low, high };
}

/**
 * Unpacks a prefab's RLE voxelData into a flat Uint32Array of length (dx * dy * dz).
 */
export function unpackPrefabVoxels(prefab: VoxelPrefabData): { low: Uint32Array; high: Uint32Array } {
  const [dx, dy, dz] = prefab.dimensions;
  const total = dx * dy * dz;
  const dataLow = new Uint32Array(total);
  const dataHigh = new Uint32Array(total);

  let targetIdx = 0;
  for (let i = 0; i < prefab.voxelData.length; i += 2) {
    const count = prefab.voxelData[i];
    const palIdx = prefab.voxelData[i + 1];

    let l = VOXEL_WORD_AIR_LOW;
    let h = VOXEL_WORD_AIR_HIGH;
    if (prefab.paletteLow && prefab.paletteLow[palIdx] !== undefined) {
      l = prefab.paletteLow[palIdx];
      h = prefab.paletteHigh[palIdx];
    }

    for (let c = 0; c < count && targetIdx < total; c++) {
      dataLow[targetIdx] = l;
      dataHigh[targetIdx] = h;
      targetIdx++;
    }
  }

  return { low: dataLow, high: dataHigh };
}

/**
 * Packs a flat Uint32Array into palette and RLE data.
 */
export function packPrefabVoxels(
  voxels: { low: Uint32Array; high: Uint32Array }
): { paletteLow: number[]; paletteHigh: number[]; voxelData: number[] } {
  const paletteMap = new Map<string, number>();
  const paletteLow: number[] = [];
  const paletteHigh: number[] = [];

  for (let i = 0; i < voxels.low.length; i++) {
    const l = voxels.low[i];
    const h = voxels.high[i];
    const key = `${l}_${h}`;
    if (!paletteMap.has(key)) {
      paletteMap.set(key, paletteLow.length);
      paletteLow.push(l);
      paletteHigh.push(h);
    }
  }

  const voxelData: number[] = [];
  if (voxels.low.length > 0) {
    let curPalIdx = paletteMap.get(`${voxels.low[0]}_${voxels.high[0]}`)!;
    let count = 1;

    for (let i = 1; i < voxels.low.length; i++) {
      const palIdx = paletteMap.get(`${voxels.low[i]}_${voxels.high[i]}`)!;
      if (palIdx === curPalIdx && count < 65535) {
        count++;
      } else {
        voxelData.push(count, curPalIdx);
        curPalIdx = palIdx;
        count = 1;
      }
    }
    voxelData.push(count, curPalIdx);
  }

  return { paletteLow, paletteHigh, voxelData };
}

/**
 * Rotates a VoxelPrefab 90° Clockwise on the Y-Axis using 3D Matrix Index Transformation.
 *
 * Original Dimensions: [dx, dy, dz] -> Rotated Dimensions: [dz, dy, dx]
 * Coordinate Mapping: (x, y, z) -> (dz - 1 - z, y, x)
 */
export function rotatePrefab90CW(prefab: VoxelPrefabData): VoxelPrefabData {
  const [dx, dy, dz] = prefab.dimensions;
  const newDx = dz;
  const newDy = dy;
  const newDz = dx;

  const originalVoxels = unpackPrefabVoxels(prefab);
  const rotatedVoxelsLow = new Uint32Array(newDx * newDy * newDz);
  const rotatedVoxelsHigh = new Uint32Array(newDx * newDy * newDz);

  for (let y = 0; y < dy; y++) {
    for (let z = 0; z < dz; z++) {
      for (let x = 0; x < dx; x++) {
        const origIdx = x + y * dx + z * dx * dy;
        const low = originalVoxels.low[origIdx];
        const high = originalVoxels.high[origIdx];

        // 90 deg CW rotation mapping around Y
        const rotX = dz - 1 - z;
        const rotY = y;
        const rotZ = x;

        const rotIdx = rotX + rotY * newDx + rotZ * newDx * newDy;
        const rotated = rotateVoxelWordCW(low, high);
        rotatedVoxelsLow[rotIdx] = rotated.low;
        rotatedVoxelsHigh[rotIdx] = rotated.high;
      }
    }
  }

  const { paletteLow, paletteHigh, voxelData } = packPrefabVoxels({ low: rotatedVoxelsLow, high: rotatedVoxelsHigh });

  // Rotate anchor offset
  const [ax, ay, az] = prefab.anchorOffset;
  const newAnchorOffset: [number, number, number] = [dz - 1 - az, ay, ax];

  // Rotate metadata markers if present
  let newMetadata: VoxelPrefabData['metadata'];
  if (prefab.metadata) {
    newMetadata = {};
    if (prefab.metadata.entities) {
      newMetadata.entities = prefab.metadata.entities.map((e) => ({
        ...e,
        relX: dz - 1 - e.relZ,
        relY: e.relY,
        relZ: e.relX,
      }));
    }
    if (prefab.metadata.triggers) {
      newMetadata.triggers = prefab.metadata.triggers.map((t) => ({
        ...t,
        relX: dz - 1 - t.relZ,
        relY: t.relY,
        relZ: t.relX,
      }));
    }
    if (prefab.metadata.lootTables) {
      newMetadata.lootTables = prefab.metadata.lootTables.map((l) => ({
        ...l,
        relX: dz - 1 - l.relZ,
        relY: l.relY,
        relZ: l.relX,
      }));
    }
  }

  return {
    formatVersion: 1,
    name: prefab.name,
    category: prefab.category,
    dimensions: [newDx, newDy, newDz],
    anchorOffset: newAnchorOffset,
    paletteLow,
    paletteHigh,
    voxelData,
    metadata: newMetadata,
  };
}

/**
 * Extracts a 3D subvolume from the VoxelWorld as a reusable VoxelPrefab.
 */
export function extractVoxelPrefab(
  world: VoxelWorld,
  bounds: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number },
  name: string,
  category: string = 'Custom'
): VoxelPrefabData {
  const minX = Math.min(bounds.minX, bounds.maxX);
  const maxX = Math.max(bounds.minX, bounds.maxX);
  const minY = Math.min(bounds.minY, bounds.maxY);
  const maxY = Math.max(bounds.minY, bounds.maxY);
  const minZ = Math.min(bounds.minZ, bounds.maxZ);
  const maxZ = Math.max(bounds.minZ, bounds.maxZ);

  const dx = maxX - minX + 1;
  const dy = maxY - minY + 1;
  const dz = maxZ - minZ + 1;

  const total = dx * dy * dz;
  const voxelsLow = new Uint32Array(total);
  const voxelsHigh = new Uint32Array(total);

  let idx = 0;
  for (let y = 0; y < dy; y++) {
    for (let z = 0; z < dz; z++) {
      for (let x = 0; x < dx; x++) {
        const wx = minX + x;
        const wy = minY + y;
        const wz = minZ + z;
        const v = world.getVoxel(wx, wy, wz);
        voxelsLow[idx] = v.low;
        voxelsHigh[idx] = v.high;
        idx++;
      }
    }
  }

  const { paletteLow, paletteHigh, voxelData } = packPrefabVoxels({ low: voxelsLow, high: voxelsHigh });

  return {
    formatVersion: 1,
    name,
    category,
    dimensions: [dx, dy, dz],
    anchorOffset: [0, 0, 0],
    paletteLow,
    paletteHigh,
    voxelData,
  };
}

/**
 * Stamps a VoxelPrefab into the VoxelWorld at target world coordinates.
 */
export function stampVoxelPrefab(
  world: VoxelWorld,
  prefab: VoxelPrefabData,
  targetWX: number,
  targetWY: number,
  targetWZ: number,
  ignoreAir = false
): { modifiedCount: number; dirtyChunks: Set<string> } {
  const [dx, dy, dz] = prefab.dimensions;
  const [ax, ay, az] = prefab.anchorOffset;
  const originWX = targetWX - ax;
  const originWY = targetWY - ay;
  const originWZ = targetWZ - az;

  const voxels = unpackPrefabVoxels(prefab);
  const dirtyChunks = new Set<string>();
  let modifiedCount = 0;

  let idx = 0;
  for (let y = 0; y < dy; y++) {
    for (let z = 0; z < dz; z++) {
      for (let x = 0; x < dx; x++) {
        const low = voxels.low[idx];
        const high = voxels.high[idx++];
        if (ignoreAir && isVoxelAir(low)) continue;

        const wx = originWX + x;
        const wy = originWY + y;
        const wz = originWZ + z;

        if (world.canEditVoxel(wx, wy, wz)) {
          const changed = world.setVoxel(wx, wy, wz, low, high);
          if (changed) {
            modifiedCount++;
            const { cx, cz, cy } = VoxelWorld.worldToChunkCoords(wx, wy, wz);
            dirtyChunks.add(`${cx},${cz},${cy}`);
          }
        }
      }
    }
  }

  return { modifiedCount, dirtyChunks };
}
