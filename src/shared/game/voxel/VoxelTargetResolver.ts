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

export interface VoxelTargetResolution {
  hit: boolean;
  hitPoint: VoxelVector3;
  hitNormal: VoxelVector3;
  voxelCoord: { wx: number; wy: number; wz: number };
  adjacentVoxelCoord: { wx: number; wy: number; wz: number };
  chunkCoord: { cx: number; cz: number; cy: number };
  localCoord: { lx: number; ly: number; lz: number };
  existingVoxel: number;
  isInsideWorld: boolean;
}

export interface RawPickTarget {
  hit?: boolean;
  pickedMesh?: { name: string } | null;
  pickedPoint?: VoxelVector3 | null;
  getNormal?: (useWorldCoordinates?: boolean) => VoxelVector3 | null;
}

/**
 * Resolves an authoritative 3D voxel target from a 3D raycast / pick result.
 */
export function resolveVoxelTarget(
  pick: RawPickTarget | null | undefined,
  world: VoxelWorld,
  ray?: VoxelRay | null,
  options?: { planeLockEnabled?: boolean; targetPlaneY?: number }
): VoxelTargetResolution | null {
  if (!world) return null;

  const totalW = world.totalWidthBlocks;
  const totalZ = world.totalDepthBlocks;
  const totalH = world.totalHeightBlocks;

  // 0. Horizon Raycasting (Plane Lock Override)
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

      const existingVoxel = isInsideWorld
        ? world.getVoxel(targetVoxel.wx, targetVoxel.wy, targetVoxel.wz)
        : 0;

      const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(
        targetVoxel.wx,
        targetVoxel.wy,
        targetVoxel.wz
      );

      return {
        hit: true,
        hitPoint: { x: hitX, y: meshPlaneY, z: hitZ },
        hitNormal: { x: 0, y: 1, z: 0 },
        voxelCoord: targetVoxel,
        adjacentVoxelCoord: targetVoxel, // For plane lock, target is exactly the clicked cell on the plane
        chunkCoord: { cx, cz, cy },
        localCoord: { lx, ly, lz },
        existingVoxel,
        isInsideWorld,
      };
    }
  }

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
      : 0;

    const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(
      targetVoxel.wx,
      targetVoxel.wy,
      targetVoxel.wz
    );

    return {
      hit: true,
      hitPoint: { x: pt.x, y: pt.y, z: pt.z },
      hitNormal: { x: nx, y: ny, z: nz },
      voxelCoord: targetVoxel,
      adjacentVoxelCoord: adjacentVoxel,
      chunkCoord: { cx, cz, cy },
      localCoord: { lx, ly, lz },
      existingVoxel,
      isInsideWorld,
    };
  }

  // 2. Analytical Raycast against Top Voxel Surface / Ground Plane
  if (ray && Math.abs(ray.direction.y) > 1e-6) {
    const t0 = -ray.origin.y / ray.direction.y;
    if (t0 >= 0) {
      const approxX = ray.origin.x + t0 * ray.direction.x;
      const approxZ = ray.origin.z + t0 * ray.direction.z;
      const approxVoxel = world.worldMeshToVoxel(approxX, 0, approxZ);

      // Derive ground planes directly from the top voxel surface
      const topWY = typeof world.getTopSolidVoxelY === 'function'
        ? world.getTopSolidVoxelY(approxVoxel.wx, approxVoxel.wz)
        : 15;
      const topSurfaceMeshY = (topWY + 1) + world.originOffsetY;

      const t = (topSurfaceMeshY - ray.origin.y) / ray.direction.y;
      const hitX = ray.origin.x + t * ray.direction.x;
      const hitY = topSurfaceMeshY;
      const hitZ = ray.origin.z + t * ray.direction.z;

      const targetVoxel = world.worldMeshToVoxel(hitX, hitY - 0.05, hitZ);
      const adjacentVoxel = world.worldMeshToVoxel(hitX, hitY + 0.05, hitZ);

      const isInsideWorld =
        targetVoxel.wx >= 0 &&
        targetVoxel.wx < totalW &&
        targetVoxel.wz >= 0 &&
        targetVoxel.wz < totalZ;

      const existingVoxel = isInsideWorld
        ? world.getVoxel(targetVoxel.wx, targetVoxel.wy, targetVoxel.wz)
        : 0;

      const { cx, cz, cy, lx, ly, lz } = VoxelWorld.worldToChunkCoords(
        targetVoxel.wx,
        targetVoxel.wy,
        targetVoxel.wz
      );

      return {
        hit: true,
        hitPoint: { x: hitX, y: hitY, z: hitZ },
        hitNormal: { x: 0, y: 1, z: 0 },
        voxelCoord: targetVoxel,
        adjacentVoxelCoord: adjacentVoxel,
        chunkCoord: { cx, cz, cy },
        localCoord: { lx, ly, lz },
        existingVoxel,
        isInsideWorld,
      };
    }
  }

  return null;
}

/**
 * Resolves the operational target coordinate based on authoring mode:
 * - 'add' | 'extrude': P_target = P_hit + n (adjacent placement voxel)
 * - 'carve' | 'paint' | 'erase' | 'replace': P_target = P_hit (underlying intersected voxel)
 */
export function getTargetVoxelCoord(
  mode: 'add' | 'extrude' | 'carve' | 'paint' | 'erase' | 'replace',
  target: VoxelTargetResolution
): { wx: number; wy: number; wz: number } {
  if (mode === 'add' || mode === 'extrude') {
    return target.adjacentVoxelCoord;
  }
  return target.voxelCoord;
}
