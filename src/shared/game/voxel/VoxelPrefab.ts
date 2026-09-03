/**
 * Saints Gaming — 3D Volumetric Prefab Blueprint Contract, Extraction & Matrix Rotation
 *
 * Provides strongly-typed .prefab schema, 3D subvolume extraction, 90° CW Y-axis matrix rotation,
 * and chunk memory stamping for the Studio Stamp Tool ('P').
 */

import { VoxelWorld } from './VoxelWorldDoc';
import {
  isVoxelAir,
  getVoxelShape,
  getVoxelOrientation,
  withVoxelOrientation,
  VoxelShape,
  VOXEL_WORD_AIR,
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
  palette: number[]; // Unique 32-bit voxel words
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
export function rotateVoxelWordCW(word: number): number {
  if (isVoxelAir(word)) return word;
  const shape = getVoxelShape(word);

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
    const curOrient = getVoxelOrientation(word);
    const newOrient = rotateOrientationCW(curOrient);
    return withVoxelOrientation(word, newOrient);
  }

  return word;
}

/**
 * Unpacks a prefab's RLE voxelData into a flat Uint32Array of length (dx * dy * dz).
 */
export function unpackPrefabVoxels(prefab: VoxelPrefabData): Uint32Array {
  const [dx, dy, dz] = prefab.dimensions;
  const total = dx * dy * dz;
  const data = new Uint32Array(total);

  let targetIdx = 0;
  const rle = prefab.voxelData;
  for (let i = 0; i + 1 < rle.length && targetIdx < total; i += 2) {
    const count = rle[i];
    const palIdx = rle[i + 1];
    const word = prefab.palette[palIdx] ?? VOXEL_WORD_AIR;
    for (let c = 0; c < count && targetIdx < total; c++) {
      data[targetIdx++] = word;
    }
  }

  return data;
}

/**
 * Packs a flat Uint32Array into palette and RLE data.
 */
export function packPrefabVoxels(
  voxels: Uint32Array
): { palette: number[]; voxelData: number[] } {
  const paletteMap = new Map<number, number>();
  const palette: number[] = [];

  for (let i = 0; i < voxels.length; i++) {
    const word = voxels[i];
    if (!paletteMap.has(word)) {
      paletteMap.set(word, palette.length);
      palette.push(word);
    }
  }

  const voxelData: number[] = [];
  if (voxels.length > 0) {
    let curPalIdx = paletteMap.get(voxels[0])!;
    let count = 1;

    for (let i = 1; i < voxels.length; i++) {
      const palIdx = paletteMap.get(voxels[i])!;
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

  return { palette, voxelData };
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
  const rotatedVoxels = new Uint32Array(newDx * newDy * newDz);

  for (let y = 0; y < dy; y++) {
    for (let z = 0; z < dz; z++) {
      for (let x = 0; x < dx; x++) {
        const origIdx = x + y * dx + z * dx * dy;
        const word = originalVoxels[origIdx];

        // 90 deg CW rotation mapping around Y
        const rotX = dz - 1 - z;
        const rotY = y;
        const rotZ = x;

        const rotIdx = rotX + rotY * newDx + rotZ * newDx * newDy;
        rotatedVoxels[rotIdx] = rotateVoxelWordCW(word);
      }
    }
  }

  const { palette, voxelData } = packPrefabVoxels(rotatedVoxels);

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
    palette,
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
  const voxels = new Uint32Array(total);

  let idx = 0;
  for (let y = 0; y < dy; y++) {
    for (let z = 0; z < dz; z++) {
      for (let x = 0; x < dx; x++) {
        const wx = minX + x;
        const wy = minY + y;
        const wz = minZ + z;
        voxels[idx++] = world.getVoxel(wx, wy, wz);
      }
    }
  }

  const { palette, voxelData } = packPrefabVoxels(voxels);

  return {
    formatVersion: 1,
    name,
    category,
    dimensions: [dx, dy, dz],
    anchorOffset: [0, 0, 0],
    palette,
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
        const word = voxels[idx++];
        if (ignoreAir && isVoxelAir(word)) continue;

        const wx = originWX + x;
        const wy = originWY + y;
        const wz = originWZ + z;

        if (world.canEditVoxel(wx, wy, wz)) {
          const changed = world.setVoxel(wx, wy, wz, word);
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
