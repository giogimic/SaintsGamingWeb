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

export class LocalMovementSystem {
  private lastMoveCommandTime = 0;
  private readonly MOVE_THROTTLE_MS = 150; // Throttle socket emits
  
  // 3D Physics State
  private verticalVelocity = 0;
  private isGrounded = true;
  
  // Spirit Gate Physics Handoff
  private portalTransit = new PortalTransitSystem();

  public update(dt: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player movement input if we're exploring
    if (scene !== 'exploring') return;
    
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
    const is3D = activeMapData && (activeMapData.mapType === 'VOXEL' || activeMapData.mapType === 'FRACTAL' || activeMapData.mapType === 'HYBRID');

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

    if (isMoving) {
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
        
        // Convert to delta-time movement (dt is in milliseconds)
        const dtSec = dt / 1000.0;
        dx = moveX * speed * dtSec;
        dz = moveZ * speed * dtSec;

        // Jump
        if (inputManager.isAnyKeyPressed(KEYBINDS.JUMP) && this.isGrounded) {
          this.verticalVelocity = 12.0; // Jump force
          this.isGrounded = false;
        }

        // Gravity
        this.verticalVelocity -= 30.0 * dtSec; // Gravity acceleration
        dy = this.verticalVelocity * dtSec;
      } else {
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
        const activeMapData = useWorldStore.getState().activeMapData;
        const voxelWorld = activeMapData ? mapMesher.getVoxelWorld() : null;
        
        if (voxelWorld) {
          // Horizontal collision: Check terrain height at target vs current feet (y)
          const targetFloorY = voxelWorld.getTopSolidVoxelY(targetX, targetZ) + voxelWorld.originOffsetY;
          
          // Auto-step height is 0.6 blocks. If the target floor is higher than that, we are blocked.
          if (targetFloorY > currentPos.y + 0.6) {
             dx = 0;
             dz = 0;
             targetX = currentPos.x;
             targetZ = currentPos.z || 0;
          }

          // Vertical collision (Ground check)
          const currentFloorY = voxelWorld.getTopSolidVoxelY(targetX, targetZ) + voxelWorld.originOffsetY;
          if (targetY <= currentFloorY) {
            targetY = currentFloorY;
            this.isGrounded = true;
            this.verticalVelocity = 0;
          } else {
            this.isGrounded = false;
          }
        }
      } else {
        // 2D collision
        if (!this.isTileWalkable(targetX, targetY)) {
          if (playerStore.player.direction !== newDirection) {
              playerStore.setPlayerPosition(currentPos, newDirection as any, false);
              if (now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
                socketManager.emit('player_move' as any, { x: currentPos.x, y: currentPos.y, z: currentPos.z, direction: newDirection });
                this.lastMoveCommandTime = now;
              }
          }
          return;
        }
      }

      // Update local position smoothly
      playerStore.setPlayerPosition({ x: targetX, y: targetY, z: targetZ }, newDirection as any, true);

      // Throttle network broadcast
      if (now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
        this.lastMoveCommandTime = now;
        
        const multiStore = useMultiplayerStore.getState();
        const seq = multiStore.incrementMoveSeq();
        multiStore.addPendingMove({
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
        } else {
          socketManager.emit('player_move' as any, {
            x: targetX,
            y: targetY,
            z: targetZ,
            direction: newDirection,
            seq
          });
        }
      }
    } else if (!isMoving && playerStore.player.isMoving) {
      playerStore.setPlayerPosition(currentPos, undefined, false);
      socketManager.emit('player_move' as any, {
        x: currentPos.x,
        y: currentPos.y,
        z: currentPos.z,
        direction: playerStore.player.direction
      });
      this.lastMoveCommandTime = now;
    }
  }
}

export const localMovementSystem = new LocalMovementSystem();
