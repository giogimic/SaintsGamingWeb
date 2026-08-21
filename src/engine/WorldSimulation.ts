import { Point } from '@/web/components/the-lobby/store';
import { isSameBaseMap } from '@/shared/net/mapIds';
import { normalizeGatesToArray } from '@/shared/game/mapGates';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface WorldState {
  currentMapId: string;
  mapWidth: number;
  mapHeight: number;
  mapGrid: number[][];
  gates: any[];
  staticNpcs: any[];
  dynamicEntities: any[];
  logicTiles: Record<number, any>;
  playerPos: Point;
  isDevEditorOpen: boolean;
  connections?: {
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  };
}

export type MoveSimulationResult = 
  | { type: 'BLOCKED'; direction: Direction; reason: 'BOUNDS' | 'WALL' | 'NPC' }
  | { type: 'WARP'; gate: any }
  | { type: 'MOVED'; direction: Direction; targetX: number; targetY: number; stepAction?: string; stepPayload?: any };

export type InteractSimulationResult =
  | { type: 'NONE' }
  | { type: 'LOGIC_INTERACT'; action: string; payload: any; targetX: number; targetY: number }
  | { type: 'NPC_DIALOGUE'; npcId: string; npcName: string; text: string }
  | { type: 'SIGN_READ'; content: string };

export class WorldSimulation {
  
  public static calculateDirection(fromX: number, fromY: number, toX: number, toY: number): Direction {
    if (toX > fromX) return 'right';
    if (toX < fromX) return 'left';
    if (toY > fromY) return 'down';
    return 'up';
  }

  public static tryMove(state: WorldState, targetX: number, targetY: number): MoveSimulationResult {
    const { playerPos, mapWidth, mapHeight, mapGrid, logicTiles, isDevEditorOpen, staticNpcs, dynamicEntities, currentMapId } = state;

    // Prevent cross-map teleporting (unless in dev editor)
    const dist = Math.abs(targetX - playerPos.x) + Math.abs(targetY - playerPos.y);
    if (!isDevEditorOpen && dist > 1) {
      return { type: 'BLOCKED', direction: 'down', reason: 'BOUNDS' };
    }

    const dir = this.calculateDirection(playerPos.x, playerPos.y, targetX, targetY);

    // Bounds Check
    if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
      // Check connections for One-World map transitions
      if (state.connections) {
        if (targetY < 0 && state.connections.north) {
          return { type: 'WARP', gate: { targetMapId: state.connections.north, targetSpawn: { x: targetX, y: -1 } } }; // y: -1 means bottom edge
        }
        if (targetY >= mapHeight && state.connections.south) {
          return { type: 'WARP', gate: { targetMapId: state.connections.south, targetSpawn: { x: targetX, y: 0 } } };
        }
        if (targetX < 0 && state.connections.west) {
          return { type: 'WARP', gate: { targetMapId: state.connections.west, targetSpawn: { x: -1, y: targetY } } }; // x: -1 means right edge
        }
        if (targetX >= mapWidth && state.connections.east) {
          return { type: 'WARP', gate: { targetMapId: state.connections.east, targetSpawn: { x: 0, y: targetY } } };
        }
      }
      return { type: 'BLOCKED', direction: dir, reason: 'BOUNDS' };
    }

    // Warp Gate Check (array or legacy record shapes)
    const gates = normalizeGatesToArray(state.gates);
    const gate = gates.find((g) => g.position.x === targetX && g.position.y === targetY);
    if (gate?.targetMapId) {
      return { type: 'WARP', gate };
    }

    // Logic Grid Collision Check
    const targetTileId = mapGrid[targetY]?.[targetX];
    const logicTile = logicTiles[targetTileId];
    
    // If the perimeter tile has solid wall collision (default generated border), but the player
    // is moving towards an active adjacent Atlas connection, permit transition through the seam!
    const isConnectedSeam = 
      (targetY === 0 && dir === 'up' && state.connections?.north) ||
      (targetY === mapHeight - 1 && dir === 'down' && state.connections?.south) ||
      (targetX === 0 && dir === 'left' && state.connections?.west) ||
      (targetX === mapWidth - 1 && dir === 'right' && state.connections?.east);

    if (logicTile?.isSolid && !isConnectedSeam) {
      return { type: 'BLOCKED', direction: dir, reason: 'WALL' };
    }

    // NPC Collision Check
    const isStaticNpc = staticNpcs?.some((npc: any) => npc.x === targetX && npc.y === targetY);
    const isDynamicNpc = (dynamicEntities || []).some((e) => 
      Math.round(e.position.x) === targetX && 
      Math.round(e.position.y) === targetY && 
      (!e.mapId || e.mapId === currentMapId || isSameBaseMap(e.mapId, currentMapId))
    );
    
    if (isStaticNpc || isDynamicNpc) {
      return { type: 'BLOCKED', direction: dir, reason: 'NPC' };
    }

    // Valid Move
    let stepAction: string | undefined = undefined;
    let stepPayload: any = undefined;

    if (logicTile?.onStepAction) {
      stepAction = logicTile.onStepAction;
      try {
        stepPayload = logicTile.onStepPayload ? JSON.parse(logicTile.onStepPayload) : {};
      } catch (e) {
        stepPayload = {};
      }

      // If the logic tile is an explicit warp/gate action (e.g. WARP, GATE_NORTH, DUNGEON_GATE, etc.)
      if (stepAction && (stepAction === 'WARP' || stepAction.endsWith('_GATE') || stepAction.startsWith('WARP_'))) {
        const targetMapId = stepPayload.targetMapId || stepPayload.targetMap;
        if (targetMapId) {
          const targetSpawn = stepPayload.targetSpawn || stepPayload.spawnPoint || { x: Number(stepPayload.spawnX) || 6, y: Number(stepPayload.spawnY) || 2 };
          return {
            type: 'WARP',
            gate: {
              targetMapId,
              targetSpawn,
              spawnPoint: targetSpawn,
              category: stepPayload.category || stepAction
            }
          };
        }
      }
    }

    return { 
      type: 'MOVED', 
      direction: dir, 
      targetX, 
      targetY, 
      stepAction, 
      stepPayload 
    };
  }

  public static tryInteract(state: WorldState, playerDir: Direction): InteractSimulationResult {
    const { playerPos, mapGrid, logicTiles, staticNpcs, dynamicEntities, currentMapId } = state;
    
    let faceX = playerPos.x;
    let faceY = playerPos.y;
    
    if (playerDir === 'up') faceY -= 1;
    else if (playerDir === 'down') faceY += 1;
    else if (playerDir === 'left') faceX -= 1;
    else if (playerDir === 'right') faceX += 1;

    // Check Map Logic Tiles (Resources / Signs)
    const currentTileId = mapGrid[faceY]?.[faceX];
    const logicTile = logicTiles[currentTileId];

    if (logicTile?.interactable && logicTile?.onInteractAction) {
      let payload = {};
      try {
        payload = logicTile.onInteractPayload ? JSON.parse(logicTile.onInteractPayload) : {};
      } catch (e) {}
      return { type: 'LOGIC_INTERACT', action: logicTile.onInteractAction, payload, targetX: faceX, targetY: faceY };
    }

    // Check NPCs
    const nearbyStaticNpc = staticNpcs?.find((npc: any) => npc.x === faceX && npc.y === faceY);
    
    let nearbyNpc = nearbyStaticNpc;
    if (!nearbyNpc) {
      const ent = (dynamicEntities || []).find((e) => 
        Math.round(e.position.x) === faceX && 
        Math.round(e.position.y) === faceY && 
        (e.type === 'NPC' || String(e.id || '').includes('npc') || String(e.id || '').includes('vance')) &&
        (!e.mapId || e.mapId === currentMapId || isSameBaseMap(e.mapId, currentMapId))
      );
      if (ent) {
        nearbyNpc = {
          id: ent.id,
          name: ent.name || 'NPC',
          dialogueKey: ent.dialogueKey || 'Hello, traveler.'
        };
      }
    }

    if (nearbyNpc) {
      return { 
        type: 'NPC_DIALOGUE', 
        npcId: nearbyNpc.id, 
        npcName: nearbyNpc.name || 'Stranger',
        text: nearbyNpc.dialogueKey || 'Greetings, Saint! Welcome to the grounds.'
      };
    }

    return { type: 'NONE' };
  }
}
