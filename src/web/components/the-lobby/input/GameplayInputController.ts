import { useGameStore } from '../store';
import { useEditorStore } from '../editor/editor-store';
import { loadMap } from '@/shared/game/maps';
import { soundSynth } from '@/engine/sound-synth';
import { WorldSimulation } from '@/engine/WorldSimulation';
import { normalizeGates } from '@/shared/game/logicComponents';
import { toBaseMapId } from '@/shared/net/mapIds';
import { getIsEditorMode } from '@/shared/game/studioSession';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { startMapTransition } from '@/shared/game/lobbyWorldJoin';

export class GameplayInputController {
  private engineRef: any; // Reference to BabylonEngine if needed

  constructor(engineRef?: any) {
    this.engineRef = engineRef;
  }

  public setEngineRef(ref: any) {
    this.engineRef = ref;
  }

  public tryMoveDirection(dx: number, dy: number, isSprinting: boolean, isJumping: boolean) {
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;
    
    const currentPlayer = state.player;
    if (!currentPlayer || !currentPlayer.position) return;
    
    const curX = currentPlayer.position.x;
    const curY = currentPlayer.position.y;

    if (currentPlayer.isExhausted) {
      isSprinting = false;
      isJumping = false;
    }

    let moveDx = dx;
    let moveDy = dy;

    // Apply camera rotation mapping here if needed (for First Person / Third Person profiles)
    const settings = state.clientSettings;
    if (settings && this.engineRef && this.engineRef.renderer) {
      const profile = settings.camera?.profile;
      if (profile === 'firstperson' || profile === 'dynamic') {
         // Resolve relative to camera yaw
         const yaw = this.engineRef.renderer.cameraYaw || 0;
         // Rotate input vector by yaw
         const cosY = Math.cos(yaw);
         const sinY = Math.sin(yaw);
         
         // Z is inverted in Babylon for standard 2D mapping (Y is Z)
         const mappedX = dx * cosY - dy * sinY;
         const mappedY = dx * sinY + dy * cosY;
         
         // Convert back to grid stepping (we round or accumulate depending on movement type)
         // For a grid based game, if WASD is pressed, we might just snap to nearest cardinal
         if (Math.abs(mappedX) > Math.abs(mappedY)) {
           moveDx = mappedX > 0 ? 1 : -1;
           moveDy = 0;
         } else if (Math.abs(mappedY) > 0) {
           moveDx = 0;
           moveDy = mappedY > 0 ? 1 : -1;
         }
      }
    }

    if (isSprinting) {
      moveDx *= 2;
      moveDy *= 2;
    }

    this.tryMovePlayerTo(curX + moveDx, curY + moveDy, { isSprinting, isJumping });
  }

  public tryMovePlayerTo(targetX: number, targetY: number, intentOptions?: { isSprinting?: boolean, isJumping?: boolean }) {
    const isDevEditorOpen = useEditorStore.getState().isCreationMode;
    if (isDevEditorOpen) return;
    
    const store = useGameStore.getState();
    const activeMap = store.activeMapData;
    if (!activeMap) return;
    
    if (store.isMapTransitioning || store.worldSessionState === 'transitioning') return;
    
    const currentPos = store.player?.position;
    if (!currentPos) return;

    const currentMapId = store.currentMapId;
    const mapWidth = activeMap.width || activeMap.grid?.[0]?.length || 30;
    const mapHeight = activeMap.height || activeMap.grid?.length || 30;

    const worldState = {
      currentMapId,
      mapWidth,
      mapHeight,
      mapGrid: activeMap.grid,
      gates: normalizeGates(activeMap.gates),
      staticNpcs: activeMap.entities || [],
      dynamicEntities: store.mapEntities || [],
      logicTiles: store.logicTiles,
      playerPos: currentPos,
      isDevEditorOpen,
      connections: activeMap.connections,
      nodeConnections: activeMap.nodeConnections,
      voxelWorld: this.engineRef?.voxelWorld,
    };

    const result = WorldSimulation.tryMove(worldState, targetX, targetY, intentOptions);

    if (result.type === 'BLOCKED') {
      if (isDevEditorOpen && result.reason === 'WALL') {
        store.showToast('Blocked by wall collision (Logic Tag)');
      }
      store.setPlayerPosition(currentPos, result.direction, false);
      const seq = store.incrementMoveSeq();
      store.addPendingMove({ seq, direction: result.direction, predictedPos: currentPos });
      store.emitSocketEvent?.('input', { type: "MOVE_3D", direction: result.direction, sequence: seq, timestamp: Date.now(), x: currentPos.x, y: currentPos.y, z: 17, vx: 0, vy: 0, vz: 0 });
      store.emitSocketEvent?.('player_move', { x: currentPos.x, y: currentPos.y, direction: result.direction, moving: false, seq });
      return;
    }

    if (intentOptions?.isJumping) {
      store.modifyStamina(-10);
    } else if (intentOptions?.isSprinting) {
      store.modifyStamina(-5);
    }

    if (result.type === 'WARP') {
      const gate = result.gate;
      let spawnX = targetX;
      let spawnY = targetY;

      if (gate.isEdgeConnection) {
        if (gate.edgeDirection === 'north') {
          spawnX = targetX; spawnY = -1;
        } else if (gate.edgeDirection === 'south') {
          spawnX = targetX; spawnY = 0;
        } else if (gate.edgeDirection === 'west') {
          spawnX = -1; spawnY = targetY;
        } else if (gate.edgeDirection === 'east') {
          spawnX = 0; spawnY = targetY;
        }
      } else {
        const destSpawn = gate.targetSpawn || gate.spawnPoint;
        if (destSpawn && typeof destSpawn.x === 'number' && typeof destSpawn.y === 'number') {
          const gatePosX = gate.position?.x ?? targetX;
          const gatePosY = gate.position?.y ?? targetY;
          spawnX = destSpawn.x + (targetX - gatePosX);
          spawnY = destSpawn.y + (targetY - gatePosY);
        } else {
          spawnX = targetX; spawnY = targetY;
        }
      }

      const spawn = { x: spawnX, y: spawnY };
      const targetBase = toBaseMapId(gate.targetMapId);
      
      const finishWarp = () => {
        const liveStore = useGameStore.getState();
        liveStore.setWorldOriginOffset(0, 0);

        let loadedGrid: number[][] | undefined = undefined;
        const targetNodeId = (gate as any).targetNodeId;
        
        loadMap(gate.targetMapId, 0, targetNodeId)
          .then((data) => {
            const loaded = ensureMapHasStudioTilesets(data);
            loadedGrid = loaded.grid;
            useGameStore.setState({
              currentMapId: gate.targetMapId,
              activeAtlasNodeId: targetNodeId || loaded.atlasNodeId || null,
              activeMapData: loaded,
            });
          })
          .catch(() => {
            useGameStore.setState({
              currentMapId: gate.targetMapId,
              activeAtlasNodeId: targetNodeId || null,
              activeMapData: null,
            });
          })
          .finally(() => {
            const finalW = loadedGrid?.[0]?.length || 20;
            const finalH = loadedGrid?.length || 20;
            if (spawn.x === -1) spawn.x = finalW - 1;
            if (spawn.y === -1) spawn.y = finalH - 1;
            spawn.x = Math.max(0, Math.min(finalW - 1, spawn.x));
            spawn.y = Math.max(0, Math.min(finalH - 1, spawn.y));

            liveStore.setPlayerPosition(spawn);

            if (this.engineRef?.renderer) {
              const snapX = spawn.x - finalW / 2;
              const snapZ = finalH / 2 - spawn.y;
              this.engineRef.renderer.snapCameraTo(snapX, snapZ);
            }

            const p = liveStore.player;
            const inStudio = getIsEditorMode();
            const creation = useEditorStore.getState().isCreationMode;
            
            if (liveStore.emitSocketEvent && p.accountId) {
              startMapTransition({
                socket: { connected: true, emit: liveStore.emitSocketEvent } as any,
                accountId: p.accountId,
                contract: {
                  mapId: targetBase,
                  lobby: !inStudio,
                  isPrivate: inStudio && creation,
                  pie: inStudio && !creation,
                },
                position: { x: spawn.x, y: spawn.y },
                name: p.name || 'Player',
                assetProfileId: p.assetProfileId || 'adventurer',
                currentInstanceId: liveStore.instanceId,
                worldJoinSeq: liveStore.worldJoinSeq,
                onSetWorldSessionState: liveStore.setWorldSessionState,
                onIncrementWorldJoinSeq: liveStore.incrementWorldJoinSeq,
                setIsMapTransitioning: liveStore.setIsMapTransitioning,
                onClearPeers: () => liveStore.setOtherPlayers({}),
                force: true,
                transitionTimeoutMs: 600,
              });
            }
            
            liveStore.setIsMapTransitioning(false);
            liveStore.setWorldSessionState('joined');
            liveStore.showToast(`Crossed into ${gate.targetMapId.replace(/_/g, ' ')}`);
          });
      };
      
      finishWarp();
      return;
    }

    if (result.type === 'MOVED') {
      const dir = result.direction;
      if (isDevEditorOpen) {
        store.setPlayerPosition({ x: targetX, y: targetY }, dir, false);
      } else {
        store.setPlayerPosition({ x: targetX, y: targetY }, dir, true);
      }

      const seq = store.incrementMoveSeq();
      store.addPendingMove({ seq, direction: dir, predictedPos: { x: targetX, y: targetY } });
      
      let vx = 0; let vy = 0;
      if (dir === 'up') vy = -1;
      else if (dir === 'down') vy = 1;
      else if (dir === 'left') vx = -1;
      else if (dir === 'right') vx = 1;

      store.emitSocketEvent?.('input', { type: "MOVE_3D", direction: dir, sequence: seq, timestamp: Date.now(), x: targetX, y: targetY, z: 17, vx, vy, vz: 0 });
      store.emitSocketEvent?.('player_move', { x: targetX, y: targetY, direction: dir, moving: true, seq });

      const suppressGameplay = useEditorStore.getState().isCreationMode;
      if (result.stepAction && !suppressGameplay) {
        switch (result.stepAction) {
          case 'ENCOUNTER':
            store.emitSocketEvent?.('encounter_check', { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case 'OPEN_SHOP':
            store.showToast('Welcome to the Shop!');
            store.setGameMode('SHOP');
            break;
          case 'CLINIC_HEAL':
            store.emitSocketEvent?.('clinic_heal', { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case 'FISHING':
            store.emitSocketEvent?.('fish_attempt', { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case 'BANK':
            store.showToast('Bank Terminal accessed!');
            store.setGameMode('BANK');
            break;
          case 'OPEN_CRAFTING':
            store.showToast('Crafting Station accessed!');
            store.setGameMode('CRAFTING');
            break;
          case 'OPEN_BASE':
            store.showToast('Base Terminal online!');
            store.setGameMode('BASE');
            break;
        }
      }
    }
  }

  public handleInteract() {
    const isDevEditorOpen = useEditorStore.getState().isCreationMode;
    if (isDevEditorOpen) return;
    
    const store = useGameStore.getState();
    const activeMap = store.activeMapData;
    const currentPlayer = store.player;
    if (!activeMap || !currentPlayer || !currentPlayer.position) return;

    const curX = currentPlayer.position.x;
    const curY = currentPlayer.position.y;
    const dir = currentPlayer.direction || 'down';

    const currentMapId = store.currentMapId;
    const mapWidth = activeMap.width || activeMap.grid?.[0]?.length || 30;
    const mapHeight = activeMap.height || activeMap.grid?.length || 30;

    const worldState = {
      currentMapId,
      mapWidth,
      mapHeight,
      mapGrid: activeMap.grid || [],
      gates: normalizeGates(activeMap.gates),
      staticNpcs: activeMap.entities || [],
      dynamicEntities: store.mapEntities || [],
      logicTiles: store.logicTiles,
      playerPos: { x: curX, y: curY },
      isDevEditorOpen
    };

    const result = WorldSimulation.tryInteract(worldState, dir);

    if (result.type === 'LOGIC_INTERACT') {
      if (result.action === 'BANK') {
        store.showToast('Bank Terminal accessed!');
        store.setGameMode('BANK');
        return;
      }
      if (result.action === 'OPEN_CRAFTING') {
        store.showToast('Opened Crafting Station');
        store.setGameMode('CRAFTING');
        return;
      }
      if (result.action === 'OPEN_SHOP') {
        store.showToast('Opened Shop');
        return;
      }
      if (result.action === 'HEAL') {
        store.showToast('Healed at Shrine');
        return;
      }
      if (result.action === 'OPEN_BANK') {
        store.showToast('Opened Bank');
        return;
      }

      if (result.action === 'HARVEST_WOOD') {
        if (soundSynth && soundSynth.playWoodcuttingSound) soundSynth.playWoodcuttingSound();
        store.showToast('Harvested Wood');
      } else if (result.action === 'HARVEST_ORE') {
        if (soundSynth && soundSynth.playMiningSound) soundSynth.playMiningSound();
        store.showToast('Harvested Ore');
      }
      
      store.emitSocketEvent?.('gather_interact', {
        mapId: currentMapId,
        targetX: result.targetX,
        targetY: result.targetY
      });
      return;
    }

    if (result.type === 'NPC_DIALOGUE') {
      const rawId = String(result.npcId || '');
      const dialogueNpcId = rawId.includes('vance') || rawId.includes('marshal') ? 'npc_marshal_vance' : rawId;
      store.emitSocketEvent?.('npc_interact', { mapId: currentMapId, targetId: dialogueNpcId });
      return;
    }
    
    if (result.type === 'NONE') {
      store.showToast('Nothing to interact with here.');
    }
  }
}

export const globalGameplayInputController = new GameplayInputController();
