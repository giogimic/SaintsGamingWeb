/**
 * Saints Gaming — 3D Swept AABB Voxel Collision Resolution & Step-Up Controller
 *
 * Implements high-velocity swept AABB collision prevention, axis-separated slide
 * response, and automated 0.5m step-up logic over the 32³ voxel grid.
 */

import {
  isVoxelSolid,
  isVoxelAir,
  getVoxelShape,
  VoxelShape,
  getVoxelPhysics,
  VoxelPhysics,
} from './VoxelWord';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface VoxelObstacleBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface SweptCollisionResult {
  position: Vector3D;
  velocity: Vector3D;
  isGrounded: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
  steppedUp: boolean;
}

export interface VoxelWorldCollisionQuery {
  getVoxel(wx: number, wy: number, wz: number): number;
}

export class SweptAABBController {
  public static readonly DEFAULT_WIDTH = 0.6;
  public static readonly DEFAULT_HEIGHT = 1.8;
  public static readonly DEFAULT_DEPTH = 0.6;
  public static readonly DEFAULT_STEP_HEIGHT = 0.5;
  public static readonly MAX_SUBSTEP_DIST = 0.35; // Subdivide steps exceeding 0.35m to prevent tunneling

  public readonly width: number;
  public readonly height: number;
  public readonly depth: number;
  public readonly stepHeight: number;
  private readonly halfW: number;
  private readonly halfD: number;

  constructor(
    width: number = SweptAABBController.DEFAULT_WIDTH,
    height: number = SweptAABBController.DEFAULT_HEIGHT,
    depth: number = SweptAABBController.DEFAULT_DEPTH,
    stepHeight: number = SweptAABBController.DEFAULT_STEP_HEIGHT
  ) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.stepHeight = stepHeight;
    this.halfW = width / 2;
    this.halfD = depth / 2;
  }

  public getAABB(pos: Vector3D): AABB {
    return {
      minX: pos.x - this.halfW,
      minY: pos.y,
      minZ: pos.z - this.halfD,
      maxX: pos.x + this.halfW,
      maxY: pos.y + this.height,
      maxZ: pos.z + this.halfD,
    };
  }

  public static aabbOverlaps(a: AABB, b: VoxelObstacleBox, epsilon: number = 1e-4): boolean {
    return (
      a.minX < b.maxX - epsilon &&
      a.maxX > b.minX + epsilon &&
      a.minY < b.maxY - epsilon &&
      a.maxY > b.minY + epsilon &&
      a.minZ < b.maxZ - epsilon &&
      a.maxZ > b.minZ + epsilon
    );
  }

  /**
   * Retrieves all solid voxel bounding boxes intersecting a given query AABB.
   */
  public queryObstacleBoxes(
    world: VoxelWorldCollisionQuery,
    queryBox: AABB
  ): VoxelObstacleBox[] {
    const minBX = Math.floor(queryBox.minX);
    const maxBX = Math.floor(queryBox.maxX);
    const minBY = Math.floor(queryBox.minY);
    const maxBY = Math.floor(queryBox.maxY);
    const minBZ = Math.floor(queryBox.minZ);
    const maxBZ = Math.floor(queryBox.maxZ);

    const boxes: VoxelObstacleBox[] = [];

    for (let by = minBY; by <= maxBY; by++) {
      for (let bz = minBZ; bz <= maxBZ; bz++) {
        for (let bx = minBX; bx <= maxBX; bx++) {
          const word = world.getVoxel(bx, by, bz);
          if (!word || isVoxelAir(word)) continue;

          const phys = getVoxelPhysics(word);
          if (
            phys === VoxelPhysics.PASS_THROUGH ||
            phys === VoxelPhysics.SWIMMABLE_FLUID ||
            phys === VoxelPhysics.WALKABLE_SLOPE
          ) {
            continue;
          }

          const shape = getVoxelShape(word);
          if (
            shape === VoxelShape.SLOPE_45 ||
            shape === VoxelShape.STAIRS_STRAIGHT ||
            shape === VoxelShape.STAIRS_CORNER ||
            shape === VoxelShape.SLOPE_GENTLE_BASE ||
            shape === VoxelShape.SLOPE_GENTLE_TOP
          ) {
            continue;
          }

          if (isVoxelSolid(word) || phys === VoxelPhysics.SOLID_OBSTACLE || phys === VoxelPhysics.HAZARD) {
            const shape = getVoxelShape(word);
            if (shape === VoxelShape.SLAB_BOTTOM) {
              boxes.push({
                minX: bx,
                minY: by,
                minZ: bz,
                maxX: bx + 1,
                maxY: by + 0.5,
                maxZ: bz + 1,
              });
            } else if (shape === VoxelShape.SLAB_TOP) {
              boxes.push({
                minX: bx,
                minY: by + 0.5,
                minZ: bz,
                maxX: bx + 1,
                maxY: by + 1,
                maxZ: bz + 1,
              });
            } else {
              boxes.push({
                minX: bx,
                minY: by,
                minZ: bz,
                maxX: bx + 1,
                maxY: by + 1,
                maxZ: bz + 1,
              });
            }
          }
        }
      }
    }

    return boxes;
  }

  /**
   * Simulates a continuous movement step with sub-stepping, swept AABB collision,
   * axis separation, wall-sliding, and automatic step-up logic.
   */
  public simulateMove(
    world: VoxelWorldCollisionQuery,
    startPos: Vector3D,
    velocity: Vector3D,
    dt: number,
    overrideMaxStepHeight?: number
  ): SweptCollisionResult {
    const totalDispX = velocity.x * dt;
    const totalDispY = velocity.y * dt;
    const totalDispZ = velocity.z * dt;

    const totalDist = Math.sqrt(
      totalDispX * totalDispX + totalDispY * totalDispY + totalDispZ * totalDispZ
    );

    // High velocity sub-stepping to prevent tunneling (e.g. at 20 m/s)
    const numSubSteps = Math.max(
      1,
      Math.ceil(totalDist / SweptAABBController.MAX_SUBSTEP_DIST)
    );

    const subDispX = totalDispX / numSubSteps;
    const subDispY = totalDispY / numSubSteps;
    const subDispZ = totalDispZ / numSubSteps;

    let curX = startPos.x;
    let curY = startPos.y;
    let curZ = startPos.z;
    let curVx = velocity.x;
    let curVy = velocity.y;
    let curVz = velocity.z;

    let isGrounded = false;
    let hitCeiling = false;
    let hitWall = false;
    let steppedUp = false;

    for (let step = 0; step < numSubSteps; step++) {
      const origStepX = curX;
      const origStepY = curY;
      const origStepZ = curZ;

      // 1. Resolve Y Axis First (Gravity / Grounding / Ceiling)
      const candY = curY + subDispY;
      const aabbY: AABB = {
        minX: curX - this.halfW,
        minY: Math.min(curY, candY),
        maxX: curX + this.halfW,
        maxY: Math.max(curY, candY) + this.height,
        minZ: curZ - this.halfD,
        maxZ: curZ + this.halfD,
      };

      const yObstacles = this.queryObstacleBoxes(world, aabbY);
      let resolvedY = candY;

      if (subDispY < 0) {
        // Moving Down -> Ground collision check
        let highestGround = -Infinity;
        for (const box of yObstacles) {
          if (
            curX - this.halfW < box.maxX - 1e-4 &&
            curX + this.halfW > box.minX + 1e-4 &&
            curZ - this.halfD < box.maxZ - 1e-4 &&
            curZ + this.halfD > box.minZ + 1e-4
          ) {
            if (box.maxY <= curY + 1e-4 && box.maxY > highestGround) {
              highestGround = box.maxY;
            }
          }
        }

        if (highestGround !== -Infinity && candY <= highestGround) {
          resolvedY = highestGround;
          curVy = 0;
          isGrounded = true;
        } else {
          isGrounded = false;
        }
      } else if (subDispY > 0) {
        // Moving Up -> Ceiling collision check
        let lowestCeiling = Infinity;
        for (const box of yObstacles) {
          if (
            curX - this.halfW < box.maxX - 1e-4 &&
            curX + this.halfW > box.minX + 1e-4 &&
            curZ - this.halfD < box.maxZ - 1e-4 &&
            curZ + this.halfD > box.minZ + 1e-4
          ) {
            if (box.minY >= curY + this.height - 1e-4 && box.minY < lowestCeiling) {
              lowestCeiling = box.minY;
            }
          }
        }

        if (lowestCeiling !== Infinity && candY + this.height >= lowestCeiling) {
          resolvedY = lowestCeiling - this.height;
          curVy = 0;
          hitCeiling = true;
        }
      }

      curY = resolvedY;

      // Ground presence check when vertical displacement is near zero
      if (curVy <= 0 && !isGrounded) {
        const groundCheckAABB: AABB = {
          minX: curX - this.halfW,
          minY: curY - 0.05,
          maxX: curX + this.halfW,
          maxY: curY + 0.01,
          minZ: curZ - this.halfD,
          maxZ: curZ + this.halfD,
        };
        const groundBoxes = this.queryObstacleBoxes(world, groundCheckAABB);
        for (const box of groundBoxes) {
          if (
            curX - this.halfW < box.maxX - 1e-4 &&
            curX + this.halfW > box.minX + 1e-4 &&
            curZ - this.halfD < box.maxZ - 1e-4 &&
            curZ + this.halfD > box.minZ + 1e-4 &&
            Math.abs(curY - box.maxY) < 0.05
          ) {
            isGrounded = true;
            break;
          }
        }
      }

      // 2. Resolve Horizontal (X and Z) with Automated Step-Up
      const hasHorizMovement = subDispX !== 0 || subDispZ !== 0;

      if (hasHorizMovement) {
        let directX = curX + subDispX;
        let directZ = curZ + subDispZ;
        let xBlocked = false;
        let zBlocked = false;

        // X Axis
        if (subDispX !== 0) {
          const aabbX: AABB = {
            minX: Math.min(curX, directX) - this.halfW,
            minY: curY,
            maxX: Math.max(curX, directX) + this.halfW,
            maxY: curY + this.height,
            minZ: curZ - this.halfD,
            maxZ: curZ + this.halfD,
          };
          const xObstacles = this.queryObstacleBoxes(world, aabbX);
          for (const box of xObstacles) {
            if (SweptAABBController.aabbOverlaps(aabbX, box)) {
              xBlocked = true;
              hitWall = true;
              if (subDispX > 0) {
                directX = Math.min(directX, box.minX - this.halfW);
              } else {
                directX = Math.max(directX, box.maxX + this.halfW);
              }
            }
          }
        }

        // Z Axis
        if (subDispZ !== 0) {
          const aabbZ: AABB = {
            minX: directX - this.halfW,
            minY: curY,
            maxX: directX + this.halfW,
            maxY: curY + this.height,
            minZ: Math.min(curZ, directZ) - this.halfD,
            maxZ: Math.max(curZ, directZ) + this.halfD,
          };
          const zObstacles = this.queryObstacleBoxes(world, aabbZ);
          for (const box of zObstacles) {
            if (SweptAABBController.aabbOverlaps(aabbZ, box)) {
              zBlocked = true;
              hitWall = true;
              if (subDispZ > 0) {
                directZ = Math.min(directZ, box.minZ - this.halfD);
              } else {
                directZ = Math.max(directZ, box.maxZ + this.halfD);
              }
            }
          }
        }

        // 3. Step-Up Simulation if Blocked While Grounded
        if ((xBlocked || zBlocked) && isGrounded) {
          const activeStepHeight = overrideMaxStepHeight ?? this.stepHeight;
          const stepLiftY = origStepY + activeStepHeight;
          const liftBox: AABB = {
            minX: origStepX - this.halfW,
            minY: origStepY,
            maxX: origStepX + this.halfW,
            maxY: stepLiftY + this.height,
            minZ: origStepZ - this.halfD,
            maxZ: origStepZ + this.halfD,
          };

          const ceilingObstacles = this.queryObstacleBoxes(world, liftBox);
          let ceilingBlocksLift = false;
          for (const box of ceilingObstacles) {
            if (box.minY > origStepY && box.minY < stepLiftY + this.height) {
              if (
                origStepX - this.halfW < box.maxX - 1e-4 &&
                origStepX + this.halfW > box.minX + 1e-4 &&
                origStepZ - this.halfD < box.maxZ - 1e-4 &&
                origStepZ + this.halfD > box.minZ + 1e-4
              ) {
                ceilingBlocksLift = true;
                break;
              }
            }
          }

          if (!ceilingBlocksLift) {
            // Move horizontally at elevated step height
            let stepX = origStepX + subDispX;
            let stepZ = origStepZ + subDispZ;

            const elevatedAABB: AABB = {
              minX: stepX - this.halfW,
              minY: stepLiftY,
              maxX: stepX + this.halfW,
              maxY: stepLiftY + this.height,
              minZ: stepZ - this.halfD,
              maxZ: stepZ + this.halfD,
            };

            const elevatedObstacles = this.queryObstacleBoxes(world, elevatedAABB);
            let elevatedBlocked = false;
            for (const box of elevatedObstacles) {
              if (SweptAABBController.aabbOverlaps(elevatedAABB, box)) {
                elevatedBlocked = true;
                break;
              }
            }

            if (!elevatedBlocked) {
              // Drop down onto elevated surface
              const dropQueryBox: AABB = {
                minX: stepX - this.halfW,
                minY: origStepY,
                maxX: stepX + this.halfW,
                maxY: stepLiftY + this.height,
                minZ: stepZ - this.halfD,
                maxZ: stepZ + this.halfD,
              };

              const dropObstacles = this.queryObstacleBoxes(world, dropQueryBox);
              let landingY = origStepY;

              for (const box of dropObstacles) {
                if (
                  stepX - this.halfW < box.maxX - 1e-4 &&
                  stepX + this.halfW > box.minX + 1e-4 &&
                  stepZ - this.halfD < box.maxZ - 1e-4 &&
                  stepZ + this.halfD > box.minZ + 1e-4
                ) {
                  if (box.maxY <= stepLiftY + 1e-4 && box.maxY > landingY) {
                    landingY = box.maxY;
                  }
                }
              }

              if (landingY > origStepY && landingY <= origStepY + this.stepHeight + 1e-4) {
                curX = stepX;
                curZ = stepZ;
                curY = landingY;
                isGrounded = true;
                steppedUp = true;
                hitWall = false; // Resolved via step-up!
                continue; // Successfully stepped up!
              }
            }
          }
        }

        // Apply direct or slid horizontal movement
        curX = directX;
        curZ = directZ;
        if (xBlocked) curVx = 0;
        if (zBlocked) curVz = 0;
      }
    }

    return {
      position: { x: curX, y: curY, z: curZ },
      velocity: { x: curVx, y: curVy, z: curVz },
      isGrounded,
      hitCeiling,
      hitWall,
      steppedUp,
    };
  }
}
