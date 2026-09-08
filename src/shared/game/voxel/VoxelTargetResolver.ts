/**
 * Saints Gaming — Authoritative 3D Voxel Spatial Target Resolver
 *
 * Resolves screen pointer raycasts directly into exact 3D volumetric voxel
 * coordinates (wx, wy, wz), face normals, and adjacent placement coordinates.
 */

import { VoxelWorld } from './VoxelWorldDoc';

export interface VoxelVector3 {
  x: number;
  y: number;
  z: number;
}

export interface VoxelRay {
  origin: VoxelVector3;
  direction: VoxelVector3;
}

export type VoxelTargetResolution =
  | {
      kind: 'voxel-hit';
      hitPoint: VoxelVector3;
      hitNormal: VoxelVector3;
      voxelCoord: { wx: number; wy: number; wz: number };
      adjacentVoxelCoord: { wx: number; wy: number; wz: number };
      chunkCoord: { cx: number; cz: number; cy: number };
      localCoord: { lx: number; ly: number; lz: number };
      existingVoxel: { low: number; high: number };
      isInsideWorld: boolean;
    }
  | {
      kind: 'plane-hit';
      hitPoint: VoxelVector3;
      voxelCoord: { wx: number; wy: number; wz: number };
      planeY: number;
      isInsideWorld: boolean;
    }
  | {
      kind: 'none';
    };

export interface RawPickTarget {
  hit?: boolean;
  pickedMesh?: { name: string } | null;
  pickedPoint?: VoxelVector3 | null;
  getNormal?: (useWorldCoordinates?: boolean) => VoxelVector3 | null;
}


export function resolveVoxelTarget(
  pick: RawPickTarget | null | undefined,
  world: VoxelWorld,
  ray?: VoxelRay | null,
  options?: { planeLockEnabled?: boolean; targetPlaneY?: number }
): VoxelTargetResolution {
  if (!world) return { kind: 'none' };

  const totalW = world.totalWidthBlocks;
  const totalZ = world.totalDepthBlocks;
  const totalH = world.totalHeightBlocks;

  // 1. Direct Mesh Hit against a chunk or ground surface
  if (pick?.hit && pick.pickedPoint) {
    const pt = pick.pickedPoint;
    const rawNormal = pick.getNormal?.(true) || { x: 0, y: 1, z: 0 };

    // Snap normal to dominant cardinal axis
    let nx = 0, ny = 1, nz = 0;
    const absX = Math.abs(rawNormal.x);
    const absY = Math.abs(rawNormal.y);
    const absZ = Math.abs(rawNormal.z);

    if (absX >= absY && absX >= absZ) {
      nx = rawNormal.x > 0 ? 1 : -1;
      ny = 0;
      nz = 0;
    } else if (absY >= absX && absY >= absZ) {
      nx = 0;
      ny = rawNormal.y > 0 ? 1 : -1;
      nz = 0;
    } else {
      nx = 0;
      ny = 0;
      nz = rawNormal.z > 0 ? 1 : -1;
    }

    // Step slightly inside the voxel for targeted solid block (e.g. erase / sample / replace)
    const inPos = {
      x: pt.x - nx * 0.05,
      y: pt.y - ny * 0.05,
      z: pt.z - nz * 0.05,
    };
    const targetVoxel = world.worldMeshToVoxel(inPos.x, inPos.y, inPos.z);

    // Step slightly outside for adjacent placement block (e.g. build on top / side face)
    const outPos = {
      x: pt.x + nx * 0.05,
      y: pt.y + ny * 0.05,
      z: pt.z + nz * 0.05,
    };
    const adjacentVoxel = world.worldMeshToVoxel(outPos.x, outPos.y, outPos.z);

    const isInsideWorld =
      targetVoxel.wx >= 0 &&
      targetVoxel.wx < totalW &&
      targetVoxel.wz >= 0 &&
      targetVoxel.wz < totalZ &&
      targetVoxel.wy >= 0 &&
      targetVoxel.wy < totalH;

    const existingVoxel = isInsideWorld
      ? world.getVoxel(targetVoxel.wx, targetVoxel.wy, targetVoxel.wz)
      : { low: 0, high: 0 };

    const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(
      targetVoxel.wx,
      targetVoxel.wy,
      targetVoxel.wz
    );

    return {
      kind: 'voxel-hit',
      hitPoint: pt,
      hitNormal: { x: nx, y: ny, z: nz },
      voxelCoord: targetVoxel,
      adjacentVoxelCoord: adjacentVoxel,
      chunkCoord: { cx, cz, cy },
      localCoord: { lx, ly, lz },
      existingVoxel,
      isInsideWorld,
    };
  }

  // 2. Horizon Raycasting (Plane Lock Override on empty space)
  if (options?.planeLockEnabled && options.targetPlaneY !== undefined && ray && Math.abs(ray.direction.y) > 1e-6) {
    const planeY = options.targetPlaneY;
    const meshPlaneY = planeY + world.originOffsetY; // Convert voxel Y to mesh Y
    
    const t = (meshPlaneY - ray.origin.y) / ray.direction.y;
    if (t >= 0) {
      const hitX = ray.origin.x + t * ray.direction.x;
      const hitZ = ray.origin.z + t * ray.direction.z;
      
      const targetVoxel = world.worldMeshToVoxel(hitX, meshPlaneY, hitZ);
      const isInsideWorld =
        targetVoxel.wx >= 0 &&
        targetVoxel.wx < totalW &&
        targetVoxel.wz >= 0 &&
        targetVoxel.wz < totalZ;

      return {
        kind: 'plane-hit',
        hitPoint: { x: hitX, y: meshPlaneY, z: hitZ },
        voxelCoord: targetVoxel,
        planeY,
        isInsideWorld,
      };
    }
  }

  // 3. Fallback: Infinite mathematical plane at Y=0 for building in empty space
  // If plane lock is off, but we clicked empty air, we need a baseline to place the first block.
  if (!pick?.hit && ray && Math.abs(ray.direction.y) > 1e-6) {
    const meshPlaneY = 0; // Default intersection plane for empty maps
    const t = (meshPlaneY - ray.origin.y) / ray.direction.y;
    if (t >= 0) {
      const hitX = ray.origin.x + t * ray.direction.x;
      const hitZ = ray.origin.z + t * ray.direction.z;
      
      const targetVoxel = world.worldMeshToVoxel(hitX, meshPlaneY, hitZ);
      // Floor the Y to 0 for the voxel coordinate, so it sits exactly on the plane
      targetVoxel.wy = Math.max(0, targetVoxel.wy); 
      
      const isInsideWorld =
        targetVoxel.wx >= 0 &&
        targetVoxel.wx < totalW &&
        targetVoxel.wz >= 0 &&
        targetVoxel.wz < totalZ;

      return {
        kind: 'plane-hit',
        hitPoint: { x: hitX, y: meshPlaneY, z: hitZ },
        voxelCoord: targetVoxel,
        planeY: targetVoxel.wy,
        isInsideWorld,
      };
    }
  }

  return { kind: 'none' };
}

/**
 * Resolves the operational target coordinate based on authoring mode:
 * - 'add' | 'extrude': P_target = P_hit + n (adjacent placement voxel)
 * - 'carve' | 'paint' | 'erase' | 'replace': P_target = P_hit (underlying intersected voxel)
 */
export function getTargetVoxelCoord(
  mode: 'add' | 'extrude' | 'carve' | 'paint' | 'erase' | 'replace',
  target: VoxelTargetResolution
): { wx: number; wy: number; wz: number } | null {
  if (target.kind === 'none') return null;
  if (target.kind === 'plane-hit') return target.voxelCoord;
  
  if (mode === 'add' || mode === 'extrude') {
    return target.adjacentVoxelCoord;
  }
  return target.voxelCoord;
}
