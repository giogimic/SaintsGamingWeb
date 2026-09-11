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

export class LocalMovementSystem {
  private lastMoveCommandTime = 0;
  private readonly MOVE_THROTTLE_MS = 150; // Throttle socket emits (grid-based movement pace)
  
  // Spirit Gate Physics Handoff
  private portalTransit = new PortalTransitSystem();

  public update(dt: number) {
    const scene = useSessionStore.getState().activeScene;
    
    // Only process player movement input if we're exploring
    if (scene !== 'exploring') return;
    
    this.processMovement();
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
      if (!voxelWorld) return true;
      
      return true;
    }
    
    return true;
  }

  private processMovement() {
    let dx = 0;
    let dy = 0;
    let newDirection = '';

    if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_UP)) {
      dy = -1;
      newDirection = 'up';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_DOWN)) {
      dy = 1;
      newDirection = 'down';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_LEFT)) {
      dx = -1;
      newDirection = 'left';
    } else if (inputManager.isAnyKeyPressed(KEYBINDS.MOVE_RIGHT)) {
      dx = 1;
      newDirection = 'right';
    }

    const isMoving = dx !== 0 || dy !== 0;
    const now = Date.now();
    const playerStore = usePlayerStore.getState();
    const currentPos = playerStore.player.position;

    if (isMoving && now - this.lastMoveCommandTime > this.MOVE_THROTTLE_MS) {
      
      const targetX = currentPos.x + dx;
      const targetY = currentPos.y + dy;

      if (!this.isTileWalkable(targetX, targetY)) {
        if (playerStore.player.direction !== newDirection) {
            playerStore.setPlayerPosition(currentPos, newDirection as any, false);
            socketManager.emit('player_move' as any, { x: currentPos.x, y: currentPos.y, direction: newDirection });
        }
        return;
      }

      this.lastMoveCommandTime = now;
      
      playerStore.setPlayerPosition({ x: targetX, y: targetY }, newDirection as any, true);

      const multiStore = useMultiplayerStore.getState();
      const seq = multiStore.incrementMoveSeq();
      multiStore.addPendingMove({
          seq,
          direction: newDirection as any,
          predictedPos: { x: targetX, y: targetY }
      });

      const targetPos3D = new Vector3(targetX, 0, targetY);
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
          direction: newDirection,
          seq
        });
      }
    } else if (!isMoving && playerStore.player.isMoving) {
      playerStore.setPlayerPosition(currentPos, undefined, false);
      socketManager.emit('player_move' as any, {
        x: currentPos.x,
        y: currentPos.y,
        direction: playerStore.player.direction
      });
    }
  }
}

export const localMovementSystem = new LocalMovementSystem();
