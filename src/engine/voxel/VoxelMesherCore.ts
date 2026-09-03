/**
 * Saints Gaming — Core Voxel Chunk Meshing Engine with 34³ Halo & Vertex AO
 *
 * Pure computational mesher: runs seamlessly inside a Web Worker or synchronously on main thread.
 * Ingests 34³ halo bitset, performs neighbor face culling, computes per-vertex Ambient Occlusion (0..3),
 * and produces transferable Float32Array / Uint32Array buffers.
 */

import {
  VoxelShape,
  isVoxelAir,
  isVoxelFaceOccluding,
  getVoxelMaterial,
  getVoxelShape,
  getVoxelOrientation,
  VOXEL_MAT_FARMLAND_MOIST,
} from '@/shared/game/voxel/VoxelWord';
import {
  getVoxelMaterialDef,
  getFaceUv,
} from '@/shared/game/voxel/VoxelMaterialDefinition';
import { VoxelMeshBuilder } from './VoxelGeometry';

export interface TransferableVoxelMeshResult {
  chunkKey: string;
  cx: number;
  cy: number;
  cz: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  quadCount: number;
}

export interface HaloMeshInput {
  chunkKey: string;
  cx: number;
  cy: number;
  cz: number;
  halo: Uint32Array; // 34x34x34 = 39,304 uint32 words
  originOffsetX: number;
  originOffsetY: number;
  originOffsetZ: number;
}

const AO_MULTIPLIERS: [number, number, number, number] = [0.5, 0.68, 0.84, 1.0];

export function computeVertexAO(s1Word: number, s2Word: number, cornerWord: number): number {
  const s1 = isVoxelFaceOccluding(s1Word) ? 1 : 0;
  const s2 = isVoxelFaceOccluding(s2Word) ? 1 : 0;
  const c = isVoxelFaceOccluding(cornerWord) ? 1 : 0;
  if (s1 && s2) {
    return 0; // Fully occluded corner
  }
  return 3 - (s1 + s2 + c);
}

export function aoToFactor(aoLevel: number): number {
  return AO_MULTIPLIERS[Math.max(0, Math.min(3, aoLevel))] ?? 1.0;
}

/**
 * Meshes a 32³ chunk using its 34³ halo buffer.
 */
export function meshChunkWithHalo34(input: HaloMeshInput): TransferableVoxelMeshResult {
  const { chunkKey, cx, cy, cz, halo, originOffsetX, originOffsetY, originOffsetZ } = input;
  const builder = new VoxelMeshBuilder();

  const startWX = cx * 32;
  const startWY = cy * 32;
  const startWZ = cz * 32;

  // Inline halo index calculation: hx + hy * 34 + hz * 1156 (hz * 34 * 34)
  const sample = (hx: number, hy: number, hz: number): number => {
    if (hx < 0 || hx > 33 || hy < 0 || hy > 33 || hz < 0 || hz > 33) return 0;
    return halo[hx + hy * 34 + hz * 1156];
  };

  let quadCount = 0;

  for (let ly = 0; ly < 32; ly++) {
    const hy = ly + 1;
    const wy = startWY + ly + originOffsetY;

    for (let lz = 0; lz < 32; lz++) {
      const hz = lz + 1;
      const wz = startWZ + lz + originOffsetZ;

      for (let lx = 0; lx < 32; lx++) {
        const hx = lx + 1;
        const wx = startWX + lx + originOffsetX;

        const word = sample(hx, hy, hz);
        if (isVoxelAir(word)) continue;

        const shape = getVoxelShape(word);
        const orientation = getVoxelOrientation(word);
        const materialId = getVoxelMaterial(word);
        const matDef = getVoxelMaterialDef(materialId);
        const baseRgba = matDef.tintRgba;

        const topUv = getFaceUv(matDef, 'top');
        const bottomUv = getFaceUv(matDef, 'bottom');
        const northUv = getFaceUv(matDef, 'north');
        const southUv = getFaceUv(matDef, 'south');
        const eastUv = getFaceUv(matDef, 'east');
        const westUv = getFaceUv(matDef, 'west');
        const sideUv = matDef.faceMapping.side || northUv;

        // Specialized shapes
        if (shape === VoxelShape.SLOPE_45) {
          builder.addSlope45(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 3;
          continue;
        } else if (shape === VoxelShape.SLAB_BOTTOM) {
          builder.addHalfSlab(wx, wy, wz, false, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        } else if (shape === VoxelShape.SLAB_TOP) {
          builder.addHalfSlab(wx, wy, wz, true, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        } else if (shape === VoxelShape.STAIRS_STRAIGHT) {
          builder.addStairsStraight(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 8;
          continue;
        } else if (shape === VoxelShape.STAIRS_CORNER) {
          builder.addStairsCorner(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 11;
          continue;
        } else if (shape === VoxelShape.SLOPE_GENTLE_BASE) {
          builder.addSlopeGentleBase(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 4;
          continue;
        } else if (shape === VoxelShape.SLOPE_GENTLE_TOP) {
          builder.addSlopeGentleTop(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 5;
          continue;
        } else if (shape === VoxelShape.SLOPE_CORNER_OUTER) {
          builder.addSlopeCornerOuter(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 4;
          continue;
        } else if (shape === VoxelShape.SLOPE_CORNER_INNER) {
          builder.addSlopeCornerInner(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 7;
          continue;
        } else if (shape === VoxelShape.PRISM_DIAGONAL) {
          builder.addPrismDiagonal(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 5;
          continue;
        } else if (shape === VoxelShape.COLUMN_CENTER) {
          builder.addColumnCenter(wx, wy, wz, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        } else if (shape === VoxelShape.FENCE_RAIL) {
          builder.addFenceRail(wx, wy, wz, orientation, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 12;
          continue;
        } else if (shape === VoxelShape.FARMLAND) {
          const isMoist = materialId === VOXEL_MAT_FARMLAND_MOIST;
          builder.addFarmland(wx, wy, wz, isMoist, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        } else if (shape === VoxelShape.CROSS_QUAD) {
          builder.addCrossQuad(wx, wy, wz, 1.0, baseRgba, topUv);
          quadCount += 4;
          continue;
        } else if (shape === VoxelShape.THIN_LAYER) {
          builder.addThinLayer(wx, wy, wz, 0.125, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        } else if (shape === VoxelShape.FLUID_SURFACE) {
          builder.addFluidSurface(wx, wy, wz, 0.875, baseRgba, topUv, sideUv, bottomUv);
          quadCount += 6;
          continue;
        }

        // Full Cube Faces with 34³ Halo Culling and Per-Vertex Ambient Occlusion
        // 1. Top Face (+Y)
        const above = sample(hx, hy + 1, hz);
        if (!isVoxelFaceOccluding(above)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx - 1, hy + 1, hz), sample(hx, hy + 1, hz - 1), sample(hx - 1, hy + 1, hz - 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx + 1, hy + 1, hz), sample(hx, hy + 1, hz - 1), sample(hx + 1, hy + 1, hz - 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx + 1, hy + 1, hz), sample(hx, hy + 1, hz + 1), sample(hx + 1, hy + 1, hz + 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx - 1, hy + 1, hz), sample(hx, hy + 1, hz + 1), sample(hx - 1, hy + 1, hz + 1)));

          builder.addQuad(
            [wx, wy + 1, wz],
            [wx + 1, wy + 1, wz],
            [wx + 1, wy + 1, wz + 1],
            [wx, wy + 1, wz + 1],
            [0, 1, 0],
            topUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 1.0, baseRgba[1] * 1.0, baseRgba[2] * 1.0, baseRgba[3]]
          );
          quadCount++;
        }

        // 2. Bottom Face (-Y)
        const below = sample(hx, hy - 1, hz);
        if (!isVoxelFaceOccluding(below)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx - 1, hy - 1, hz), sample(hx, hy - 1, hz + 1), sample(hx - 1, hy - 1, hz + 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx + 1, hy - 1, hz), sample(hx, hy - 1, hz + 1), sample(hx + 1, hy - 1, hz + 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx + 1, hy - 1, hz), sample(hx, hy - 1, hz - 1), sample(hx + 1, hy - 1, hz - 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx - 1, hy - 1, hz), sample(hx, hy - 1, hz - 1), sample(hx - 1, hy - 1, hz - 1)));

          builder.addQuad(
            [wx, wy, wz + 1],
            [wx + 1, wy, wz + 1],
            [wx + 1, wy, wz],
            [wx, wy, wz],
            [0, -1, 0],
            bottomUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 0.55, baseRgba[1] * 0.55, baseRgba[2] * 0.55, baseRgba[3]]
          );
          quadCount++;
        }

        // 3. North Face (+Z)
        const north = sample(hx, hy, hz + 1);
        if (!isVoxelFaceOccluding(north)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz + 1), sample(hx, hy - 1, hz + 1), sample(hx + 1, hy - 1, hz + 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz + 1), sample(hx, hy - 1, hz + 1), sample(hx - 1, hy - 1, hz + 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz + 1), sample(hx, hy + 1, hz + 1), sample(hx - 1, hy + 1, hz + 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz + 1), sample(hx, hy + 1, hz + 1), sample(hx + 1, hy + 1, hz + 1)));

          builder.addQuad(
            [wx + 1, wy, wz + 1],
            [wx, wy, wz + 1],
            [wx, wy + 1, wz + 1],
            [wx + 1, wy + 1, wz + 1],
            [0, 0, 1],
            northUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 0.88, baseRgba[1] * 0.88, baseRgba[2] * 0.88, baseRgba[3]]
          );
          quadCount++;
        }

        // 4. South Face (-Z)
        const south = sample(hx, hy, hz - 1);
        if (!isVoxelFaceOccluding(south)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz - 1), sample(hx, hy - 1, hz - 1), sample(hx - 1, hy - 1, hz - 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz - 1), sample(hx, hy - 1, hz - 1), sample(hx + 1, hy - 1, hz - 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz - 1), sample(hx, hy + 1, hz - 1), sample(hx + 1, hy + 1, hz - 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz - 1), sample(hx, hy + 1, hz - 1), sample(hx - 1, hy + 1, hz - 1)));

          builder.addQuad(
            [wx, wy, wz],
            [wx + 1, wy, wz],
            [wx + 1, wy + 1, wz],
            [wx, wy + 1, wz],
            [0, 0, -1],
            southUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 0.72, baseRgba[1] * 0.72, baseRgba[2] * 0.72, baseRgba[3]]
          );
          quadCount++;
        }

        // 5. East Face (+X)
        const east = sample(hx + 1, hy, hz);
        if (!isVoxelFaceOccluding(east)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz - 1), sample(hx + 1, hy - 1, hz), sample(hx + 1, hy - 1, hz - 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz + 1), sample(hx + 1, hy - 1, hz), sample(hx + 1, hy - 1, hz + 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz + 1), sample(hx + 1, hy + 1, hz), sample(hx + 1, hy + 1, hz + 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx + 1, hy, hz - 1), sample(hx + 1, hy + 1, hz), sample(hx + 1, hy + 1, hz - 1)));

          builder.addQuad(
            [wx + 1, wy, wz],
            [wx + 1, wy, wz + 1],
            [wx + 1, wy + 1, wz + 1],
            [wx + 1, wy + 1, wz],
            [1, 0, 0],
            eastUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 0.82, baseRgba[1] * 0.82, baseRgba[2] * 0.82, baseRgba[3]]
          );
          quadCount++;
        }

        // 6. West Face (-X)
        const west = sample(hx - 1, hy, hz);
        if (!isVoxelFaceOccluding(west)) {
          const ao0 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz + 1), sample(hx - 1, hy - 1, hz), sample(hx - 1, hy - 1, hz + 1)));
          const ao1 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz - 1), sample(hx - 1, hy - 1, hz), sample(hx - 1, hy - 1, hz - 1)));
          const ao2 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz - 1), sample(hx - 1, hy + 1, hz), sample(hx - 1, hy + 1, hz - 1)));
          const ao3 = aoToFactor(computeVertexAO(sample(hx - 1, hy, hz + 1), sample(hx - 1, hy + 1, hz), sample(hx - 1, hy + 1, hz + 1)));

          builder.addQuad(
            [wx, wy, wz + 1],
            [wx, wy, wz],
            [wx, wy + 1, wz],
            [wx, wy + 1, wz + 1],
            [-1, 0, 0],
            westUv,
            [ao0, ao1, ao2, ao3],
            [baseRgba[0] * 0.78, baseRgba[1] * 0.78, baseRgba[2] * 0.78, baseRgba[3]]
          );
          quadCount++;
        }
      }
    }
  }

  return {
    chunkKey,
    cx,
    cy,
    cz,
    positions: new Float32Array(builder.positions),
    normals: new Float32Array(builder.normals),
    uvs: new Float32Array(builder.uvs),
    colors: new Float32Array(builder.colors),
    indices: new Uint32Array(builder.indices),
    quadCount,
  };
}
