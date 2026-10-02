import { inputManager } from '../../input/InputManager';
import { KEYBINDS } from '../../input/InputConstants';
import { useSessionStore } from '../../state/useSessionStore';
import { usePlayerStore } from '../../state/usePlayerStore';
import { useWorldStore } from '../../state/useWorldStore';
import { useMultiplayerStore } from '../../state/useMultiplayerStore';
import { socketManager } from '../../net/SocketManager';
import { PortalTransitSystem } from './PortalTransitSystem';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { mapMesher } from '../MapMesher';
import { cameraManager } from '../CameraManager';
import { worldStreamer } from '../streaming/WorldStreamer';
import { SweptAABBController } from '@/shared/game/voxel/VoxelCollision';
import { resolveSafeVoxelSpawnInWorld } from '@/shared/game/voxel/SpawnResolver';

const voxelMovementController = new SweptAABBController();

export class LocalMovementSystem {
  private lastMoveCommandTime = 0;
  private readonly MOVE_THROTTLE_MS = 150; // Throttle socket emits
  
  // 3D Physics State
  private verticalVelocity = 0;
  private isGrounded = true;
  private voidRecoveryPending = false;
  private spawnReady = true;

  // Heading & Rotation State
  private currentMoveAngle: number | null = null;
  private lastFacingAngle: number = 0;
  
  // Spirit Gate Physics Handoff
  private portalTransit = new PortalTransitSystem();

  public getCurrentMoveAngle(): number | null {
    return this.currentMoveAngle;
  }

  public getLastFacingAngle(): number {
    return this.lastFacingAngle;
  }

  public setLastFacingAngle(angle: number) {
    this.lastFacingAngle = angle;
  }

  /** Clear stale fall velocity after an authoritative join or teleport. */
  public resetAfterTeleport() {
    this.verticalVelocity = 0;
    this.isGrounded = true;
  }

  /** Prevent gravity/input from advancing an unvalidated join position. */
  public setSpawnReady(ready: boolean) {
    this.spawnReady = ready;
  }

  private dropPlayerBackOntoWorld(world: NonNullable<ReturnType<typeof mapMesher.getVoxelWorld>>) {
    if (this.voidRecoveryPending) return;
    this.voidRecoveryPending = true;
    void this.recoverPlayerOntoWorld(world).finally(() => {
      this.voidRecoveryPending = false;
    });
  }

  private async recoverPlayerOntoWorld(world: NonNullable<ReturnType<typeof mapMesher.getVoxelWorld>>) {
    const player = usePlayerStore.getState().player;
    const mapData = useWorldStore.getState().activeMapData || {};
    const spawn = mapData.spawnPoint || mapData.gates?.spawnPoint || {};
    const width = world.totalWidthBlocks;
    const depth = world.totalDepthBlocks;
    const spawnX = Number.isFinite(spawn.x) ? spawn.x : Math.floor(width / 2);
    const spawnZ = Number.isFinite(spawn.z)
      ? spawn.z
      : Number.isFinite(spawn.y)
        ? depth - 1 - spawn.y
        : Math.floor(depth / 2);
    let safeSpawn = resolveSafeVoxelSpawnInWorld(world, spawnX, spawnZ, 32);
    if (!safeSpawn.isSafe) {
      // The canonical spawn can be in another baked region if this character
      // entered through a remote gate. Load that region before declaring it
      // unavailable; fractal worlds request the matching generated chunk.
      await worldStreamer.ensureSpawnRegionLoaded(
        spawnX,
        Number.isFinite(spawn.y) ? spawn.y : 16,
        spawnZ,
      );
      if (mapMesher.getVoxelWorld() !== world) return;
      safeSpawn = resolveSafeVoxelSpawnInWorld(world, spawnX, spawnZ, 32);
    }
    if (!safeSpawn.isSafe) {
      console.warn('[LocalMovementSystem] Void recovery found no safe ground; dropping at world center:', safeSpawn.reason);
    }

    const fallbackX = Math.max(0, Math.min(width - 1, Math.floor(width / 2)));
    const fallbackZ = Math.max(0, Math.min(depth - 1, Math.floor(depth / 2)));
    const dropPosition = {
      x: (safeSpawn.isSafe ? safeSpawn.position.x : fallbackX) + 0.5,
      // Player state and collision use voxel-space height. Rendering applies
      // the world's origin offset, so this appears above the visible map top.
      y: world.totalHeightBlocks + 2,
      z: (safeSpawn.isSafe ? safeSpawn.position.z : fallbackZ) + 0.5,
    };
    this.verticalVelocity = 0;
    this.isGrounded = false;
    usePlayerStore.getState().setPlayerPosition(dropPosition, player.direction, false);
    const sequence = useMultiplayerStore.getState().incrementMoveSeq();
    socketManager.emit('input' as any, {
      type: 'MOVE_3D',
      sequence,
      voidRecovery: true,
      x: dropPosition.x,
      y: dropPosition.y,
      z: dropPosition.z,
      vx: 0,
      vy: 0,
      vz: 0,
      direction: player.direction,
      timestamp: Date.now(),
    });
  }

  public update(dt: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player movement input if we're exploring
    if (scene !== 'exploring' || !this.spawnReady) return;
    
    this.processMovement(dt);
  }

  private isTileWalkable(x: number, y: number): boolean {
    const activeMapData = useWorldStore.getState().activeMapData;
    if (!activeMapData) return true; // Default to walkable if no map

    const mapType = (activeMapData.mapType || 'TILE').toUpperCase();
    
    if (mapType === 'TILE' && activeMapData.grid) {
      if (!Array.isArray(activeMapData.grid[0])) {
        // If grid is 1D array, skip bounds check (server-side collision handles it)
        return true;
      }
      
      // Bounds check
      if (y < 0 || y >= activeMapData.grid.length || x < 0 || x >= activeMapData.grid[0].length) {
        return false;
      }
      
      const tileId = activeMapData.grid[y][x];
      // 0: safe, 2: tall grass (walkable). 1: wall/boundary, 5: tree, 6: ore, etc.
      if (tileId === 1 || tileId === 5 || tileId === 6) {
        return false;
      }
      return true;
    } else if (mapType === 'VOXEL' || mapType === 'FRACTAL') {
      const voxelWorld = mapMesher.getVoxelWorld();
      if (!voxelWorld) return false; // Cannot move without world
      
      const chunkX = Math.floor(x / 32); // CHUNK_SIZE
      const chunkZ = Math.floor(y / 32); // y parameter is actually targetZ in 3D mode
      
      const chunk = voxelWorld.getChunk(chunkX, chunkZ, 0);
      if (!chunk || chunk.isEmpty()) {
         return false; // Safely constrain if missing
      }
      return true;
    }
    
    return true;
  }

  private processMovement(dt: number) {
    let inputX = 0;
    let inputZ = 0;
    let newDirection = '';

    const activeMapData = useWorldStore.getState().activeMapData;
    const mapType = String(activeMapData?.mapType || 'TILE').toUpperCase();
    const is3D = mapType === 'VOXEL' || mapType === 'FRACTAL' || mapType === 'HYBRID';
    const voxelWorld = is3D ? mapMesher.getVoxelWorld() : null;
    const simulate3DPhysics = is3D && !!voxelWorld;

    if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_UP)) {
      inputZ = 1;
      newDirection = 'up';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_DOWN)) {
      inputZ = -1;
      newDirection = 'down';
    }
    if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_LEFT)) {
      inputX = -1;
      newDirection = 'left';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_RIGHT)) {
      inputX = 1;
      newDirection = 'right';
    }

    const isMoving = inputX !== 0 || inputZ !== 0;
    const now = Date.now();
    const playerStore = usePlayerStore.getState();
    const currentPos = playerStore.player.position;

    // A 3D map without streamed collision chunks is not safe to move through.
    // Previously this path skipped physics and still applied horizontal input.
    if (is3D && !voxelWorld) {
      this.currentMoveAngle = null;
      if (playerStore.player.isMoving) {
        playerStore.setPlayerPosition(currentPos, undefined, false, this.lastFacingAngle);
      }
      return;
    }

    if (!isMoving && !simulate3DPhysics) {
      this.currentMoveAngle = null;
      if (playerStore.player.isMoving) {
        playerStore.setPlayerPosition(currentPos, undefined, false, this.lastFacingAngle);
        socketManager.emit('player_move' as any, {
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
          direction: playerStore.player.direction,
        });
        this.lastMoveCommandTime = now;
      }
      return;
    }

    let velocityX = 0;
    let velocityY = 0;
    let velocityZ = 0;
    const dtSec = Math.max(0, dt / 1000.0);
    const wasGrounded = this.isGrounded;

    {
      let dx = 0;
      let dz = 0;
      let dy = 0;
      
      if (is3D) {
        // Continuous, camera-relative movement
        const isSprinting = inputManager.isKeyPressed(KEYBINDS.SPRINT[0]);
        const speed = isSprinting ? 22.0 : 15.0; // units per second
        const yaw = cameraManager.yaw;
        
        // Normalize input vector
        const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
        const normX = length > 0 ? inputX / length : 0;
        const normZ = length > 0 ? inputZ / length : 0;
        
        // Rotate input by camera yaw. 
        // Babylon uses a left-handed coordinate system.
        // Yaw = 0 means looking down +Z axis.
        const moveX = normX * Math.cos(yaw) + normZ * Math.sin(yaw);
        const moveZ = -normX * Math.sin(yaw) + normZ * Math.cos(yaw);
        
        if (isMoving) {
          const moveAngle = Math.atan2(-moveX, moveZ);
          this.currentMoveAngle = moveAngle;
        } else {
          this.currentMoveAngle = null;
        }

        // Convert to delta-time movement (dt is in milliseconds)
        dx = moveX * speed * dtSec;
        dz = moveZ * speed * dtSec;

        // Jump
        if (simulate3DPhysics && inputManager.isAnyKeyPressed(KEYBINDS.JUMP) && this.isGrounded) {
          this.verticalVelocity = 12.0; // Jump force
          this.isGrounded = false;
          import('@/engine/sound-synth').then(({ soundSynth }) => {
            if (soundSynth && soundSynth.playJumpSound) soundSynth.playJumpSound();
          });
        }

        if (simulate3DPhysics) {
          this.verticalVelocity = Math.max(-60.0, this.verticalVelocity - 30.0 * dtSec);
          dy = this.verticalVelocity * dtSec;
        }
        velocityX = moveX * speed;
        velocityY = this.verticalVelocity;
        velocityZ = moveZ * speed;
      } else {
        if (newDirection) {
          switch (newDirection) {
            case 'down': this.lastFacingAngle = Math.PI; break;
            case 'up': this.lastFacingAngle = 0; break;
            case 'left': this.lastFacingAngle = Math.PI / 2; break;
            case 'right': this.lastFacingAngle = -Math.PI / 2; break;
          }
          this.currentMoveAngle = this.lastFacingAngle;
        } else {
          this.currentMoveAngle = null;
        }

        // Discrete 2D grid movement
        if (now - this.lastMoveCommandTime < this.MOVE_THROTTLE_MS) return;
        dx = inputX;
        if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_UP)) dy = -1;
        else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_DOWN)) dy = 1;
      }
      
      let targetX = currentPos.x + dx;
      let targetY = currentPos.y + dy;
      let targetZ = (currentPos.z || 0) + dz;

      // 3D Collision and Step Logic
      if (is3D) {
        if (voxelWorld) {
          // Player state and collision both use voxel-space coordinates. The
          // renderer alone applies the world's vertical origin offset.
          const collision = voxelMovementController.simulateMove(
            voxelWorld,
            {
              x: currentPos.x,
              y: currentPos.y,
              z: currentPos.z || 0,
            },
            { x: velocityX, y: velocityY, z: velocityZ },
            dtSec,
          );
          targetX = collision.position.x;
          targetY = collision.position.y;
          targetZ = collision.position.z;
          velocityX = collision.velocity.x;
          velocityY = collision.velocity.y;
          velocityZ = collision.velocity.z;
          this.verticalVelocity = collision.velocity.y;
          this.isGrounded = collision.isGrounded;
          // Falling below the voxel floor returns the player to the configured
          // world-center spawn, high above its surface so they visibly drop in.
          if (collision.position.y < -4) {
            this.dropPlayerBackOntoWorld(voxelWorld);
            return;
          }
        }
      } else {
        // 2D collision
        if (!this.isTileWalkable(targetX, targetY)) {
          if (playerStore.player.direction !== newDirection) {
              playerStore.setPlayerPosition(currentPos, newDirection as any, false, this.lastFacingAngle);
              if (now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
                socketManager.emit('player_move' as any, { x: currentPos.x, y: currentPos.y, z: currentPos.z, direction: newDirection });
                this.lastMoveCommandTime = now;
              }
          }
          return;
        }
      }

      // Update local position smoothly
      const direction = newDirection || playerStore.player.direction;
      playerStore.setPlayerPosition({ x: targetX, y: targetY, z: targetZ }, direction as any, isMoving, this.lastFacingAngle);

      // Footstep audio cadence
      if (isMoving && (!is3D || this.isGrounded)) {
        import('@/engine/sound-synth').then(({ soundSynth }) => {
          if (soundSynth && soundSynth.playFootstepSound) soundSynth.playFootstepSound();
        });
      }

      // Throttle network broadcast
      const isAirborne = simulate3DPhysics && !this.isGrounded;
      const verticalPositionChanged = simulate3DPhysics && Math.abs(targetY - currentPos.y) > 1e-4;
      const groundStateChanged = simulate3DPhysics && wasGrounded !== this.isGrounded;
      const shouldBroadcast = isMoving || isAirborne || verticalPositionChanged || groundStateChanged;
      if (shouldBroadcast && now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
        this.lastMoveCommandTime = now;
        
        const multiStore = useMultiplayerStore.getState();
        const seq = multiStore.incrementMoveSeq();
        if (!is3D) multiStore.addPendingMove({
            seq,
            direction: newDirection as any,
            predictedPos: { x: targetX, y: targetY, z: targetZ }
        });

        const targetPos3D = new Vector3(targetX, targetY, targetZ);
        const dummyPlayerAABB = {
           intersectsPoint: (p: Vector3) => p.x === targetPos3D.x && p.z === targetPos3D.z,
           intersectsMinMax: () => false
        };
        
        this.portalTransit.checkIntersection(
          dummyPlayerAABB as any,
          dummyPlayerAABB as any,
          'dummy_portal',
          'nexus',
          new Vector3(0, 0, 0)
        );

        if (this.portalTransit.activeTransit) {
          this.portalTransit.broadcastMovement(targetPos3D, newDirection);
        } else if (is3D) {
          socketManager.emit('input' as any, {
            type: 'MOVE_3D',
            sequence: seq,
            x: targetX,
            y: targetY,
            z: targetZ,
            vx: velocityX,
            vy: velocityY,
            vz: velocityZ,
            direction,
            timestamp: now,
          });
        } else {
          socketManager.emit('player_move' as any, {
            x: targetX,
            y: targetY,
            direction: newDirection,
            seq
          });
        }
      }
    }
  }
}

export const localMovementSystem = new LocalMovementSystem();
