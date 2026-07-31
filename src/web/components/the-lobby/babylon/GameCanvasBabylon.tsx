'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BabylonEngine } from '@/engine/BabylonEngine';
import { resolveEncounter } from '@/game/CreatureDb';
import { useGameStore } from '../store';
import { loadMap } from '../data/maps';
import type { GameMapData } from '../data/maps';
import { soundSynth } from '@/engine/sound-synth';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Hand } from 'lucide-react';
import { findPath } from '@/engine/pathfinding';
import { WorldSimulation } from '@/engine/WorldSimulation';
import { FloatingHealthBars } from './FloatingHealthBar';

import QuestTrackerOverlay from '../quest-tracker-overlay';
import CraftingOverlay from '../crafting-overlay';

const CanvasHudBadge: React.FC<{ activeMapName?: string, currentMapId: string }> = ({ activeMapName, currentMapId }) => {
  const playerPos = useGameStore((state) => state.player.position);
  return (
    <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-violet-500/40 text-xs font-mono text-violet-200 flex items-center gap-2.5 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
      <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
      <span className="text-slate-400">Map:</span>
      <strong className="text-white">{activeMapName || currentMapId}</strong>
      <span className="text-slate-600">|</span>
      <span className="text-slate-400">Pos:</span>
      <strong className="text-amber-300">({playerPos?.x ?? 0}, {playerPos?.y ?? 0})</strong>
      <span className="text-slate-600">|</span>
      <span className="text-slate-500 hidden sm:inline">BGD / Click to Move</span>
    </div>
  );
};

interface GameCanvasBabylonProps {
  onCanvasReady?: (engine: BabylonEngine) => void;
  activeBrushTileId?: number;
  activeLayerIdx?: number;
  isDevEditorOpen?: boolean;
  onMapClick?: (r: number, c: number) => void;
}

export const GameCanvasBabylon: React.FC<GameCanvasBabylonProps> = ({
  onCanvasReady,
  activeBrushTileId = 1,
  activeLayerIdx = -1,
  isDevEditorOpen = false,
  onMapClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);
  const gainSkillXp = useGameStore((state) => state.gainSkillXp);
  const combatTarget = useGameStore((state) => state.combatTarget);

  // Entity interpolation buffer: socketId -> { fromX, fromY, toX, toY, startTime, duration }
  const interpBufferRef = useRef<Record<string, { fromX: number; fromY: number; toX: number; toY: number; startTime: number; duration: number }>>({});
  const autoWalkPathRef = useRef<{x: number, y: number}[]>([]);
  const autoWalkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isEngineReady, setIsEngineReady] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Async map state — engine only mounts AFTER map data is ready
  const [mapData, setMapData] = useState<GameMapData | null>(null);

  const clearAutoWalk = useCallback(() => {
    if (autoWalkIntervalRef.current) {
      clearInterval(autoWalkIntervalRef.current);
      autoWalkIntervalRef.current = null;
      const state = useGameStore.getState();
      if (state.player.isMoving) {
        state.setPlayerPosition(state.player.position, state.player.direction, false);
      }
    }
    autoWalkPathRef.current = [];
  }, []);

  useEffect(() => {
    setIsEngineReady(false);
    
    // Phase 9: If activeMapData is pushed via Socket.io hot-reload, use it instantly!
    if (activeMapData) {
      setMapData(activeMapData);
      // Brief delay to allow React to flush to DOM before remounting Engine
      setTimeout(() => setIsEngineReady(true), 50);
      return;
    }
    
    setMapData(null); // Reset on map change so engine remounts cleanly
    loadMap(currentMapId).then((data) => {
      setMapData(data);
    }).catch(() => {
      // Fallback map if API fails
      setMapData({
        id: currentMapId,
        name: 'Tamer Grounds',
        grid: Array(24).fill(0).map((_, r) =>
          Array(24).fill(0).map((_, c) =>
            (r === 0 || r === 23 || c === 0 || c === 23) ? 1 : (r % 5 === 0 && c % 5 === 0) ? 2 : 0
          )
        ),
        gates: {},
        npcs: [],
      });
    });
  }, [currentMapId, activeMapData]);

  // Derive dimensions — use loaded map data or safe defaults
  const activeMap = mapData as any;
  const mapWidth = activeMap?.grid?.[0]?.length || 24;
  const mapHeight = activeMap?.grid?.length || 24;

  // Unified Movement Execution Engine
  const tryMovePlayerTo = (targetX: number, targetY: number) => {
    if (!activeMap) return;
    
    const store = useGameStore.getState();
    if (store.isMapTransitioning) return;
    
    const currentPos = store.player?.position;
    if (!currentPos) return;

    const worldState = {
      currentMapId,
      mapWidth,
      mapHeight,
      mapGrid: activeMap.grid,
      gates: activeMap.gates || [],
      staticNpcs: activeMap.npcs || [],
      dynamicEntities: store.mapEntities || [],
      logicTiles: store.logicTiles,
      playerPos: currentPos,
      isDevEditorOpen
    };

    const result = WorldSimulation.tryMove(worldState, targetX, targetY);

    if (result.type === 'BLOCKED') {
      // Phase 2: Client Prediction (Turn in place)
      setPlayerPosition(currentPos, result.direction, false);
      const seq = store.incrementMoveSeq();
      store.addPendingMove({ seq, direction: result.direction, predictedPos: currentPos });
      emitSocketEvent?.('input', { type: "MOVE", direction: result.direction, sequence: seq, timestamp: Date.now() });
      return;
    }

    if (result.type === 'WARP') {
      const gate = result.gate;
      if (isDevEditorOpen) {
        useGameStore.setState({ currentMapId: gate.targetMapId });
        setPlayerPosition(gate.targetSpawn || { x: 6, y: 2 });
        showToast(`Warped to ${gate.targetMapId}`);
      } else {
        if (store.isMapTransitioning) return;
        store.setIsMapTransitioning(true);
        setTimeout(() => {
          useGameStore.setState({ currentMapId: gate.targetMapId });
          setPlayerPosition(gate.targetSpawn || { x: 6, y: 2 });
          setTimeout(() => {
            useGameStore.getState().setIsMapTransitioning(false);
            showToast(`Warped to ${gate.targetMapId}`);
          }, 100);
        }, 300);
      }
      return;
    }

    if (result.type === 'MOVED') {
      const dir = result.direction;
      if (isDevEditorOpen) {
        setPlayerPosition({ x: targetX, y: targetY }, dir, false);
      } else {
        // Phase 2: Client Prediction Enabled (instant local movement)
        setPlayerPosition({ x: targetX, y: targetY }, dir, true);
      }

      const seq = store.incrementMoveSeq();
      store.addPendingMove({ seq, direction: dir, predictedPos: { x: targetX, y: targetY } });
      emitSocketEvent?.('input', { type: "MOVE", direction: dir, sequence: seq, timestamp: Date.now() });

      // Handle Step Actions
      if (result.stepAction) {
        const payload = result.stepPayload || {};
        switch (result.stepAction) {
          case 'ENCOUNTER':
            emitSocketEvent?.('encounter_check', { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case 'OPEN_SHOP':
            showToast('Welcome to the Shop!');
            useGameStore.getState().setGameMode('SHOP');
            break;
          case 'CLINIC_HEAL':
            const state = useGameStore.getState();
            state.hydratePlayer({ ...state.player, hp: state.player.maxHp || 99 });
            showToast('Your team has been fully healed!');
            break;
          case 'FISHING':
            soundSynth.playEncounterSound?.();
            gainSkillXp('fishing', payload.xp || 20);
            showToast(`Fishing... caught something! (+${payload.xp || 20} Fishing XP)`);
            break;
          case 'OPEN_CRAFTING':
            showToast('Crafting Station accessed!');
            useGameStore.getState().setGameMode('CRAFTING');
            break;
          case 'OPEN_BASE':
            showToast('Base Terminal online!');
            useGameStore.getState().setGameMode('BASE');
            break;
        }
      }
    }
  };

  const tryMoveDirection = (dx: number, dy: number) => {
    const currentPlayer = useGameStore.getState().player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;
    tryMovePlayerTo(curX + dx, curY + dy);
  };

  // Interact / Talk Handler
  const handleInteract = () => {
    const store = useGameStore.getState();
    const currentPlayer = store.player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;
    const dir = currentPlayer.direction || 'down';

    const worldState = {
      currentMapId,
      mapWidth,
      mapHeight,
      mapGrid: activeMap?.grid || [],
      gates: activeMap?.gates || [],
      staticNpcs: activeMap?.npcs || [],
      dynamicEntities: store.mapEntities || [],
      logicTiles: store.logicTiles,
      playerPos: { x: curX, y: curY },
      isDevEditorOpen
    };

    const result = WorldSimulation.tryInteract(worldState, dir);

    if (result.type === 'RESOURCE_HARVEST') {
      if (result.action === 'OPEN_CRAFTING') {
        useGameStore.setState({ gameMode: 'CRAFTING' });
        return;
      }

      if (result.action === 'HARVEST_WOOD') {
        soundSynth.playWoodcuttingSound();
      } else if (result.action === 'HARVEST_ORE') {
        soundSynth.playMiningSound();
      }
      
      // Phase 5: Server Authority for Gathering
      store.emitSocketEvent?.('gather_interact', {
        mapId: currentMapId,
        targetX: result.targetX,
        targetY: result.targetY
      });
      return;
    }

    if (result.type === 'NPC_DIALOGUE') {
      useGameStore.setState({
        activeDialog: {
          npcId: result.npcId,
          npcName: result.npcName,
          text: result.text
        },
        gameMode: 'DIALOG'
      });
      return;
    }
    
    if (result.type === 'NONE') {
      showToast('Nothing to interact with here.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key)) {
            clearAutoWalk();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAutoWalk]);

  useEffect(() => {
    const handleCombatUpdate = (e: Event) => {
      if (!engineRef.current) return;
      const data = (e as CustomEvent).detail;
      if (data.type === 'ATTACK_RESULT') {
        engineRef.current.spawnProjectile(data.attackerId, data.targetId, data.abilityId);
        
        // Also show floating damage text via Babylon Engine
        if (!data.isMiss && data.damage > 0) {
          engineRef.current.renderDamageText(data.targetId, data.damage, data.isCrit);
        } else if (data.isMiss) {
          engineRef.current.renderDamageText(data.targetId, "MISS", false);
        }
      }
    };

    // Phase 7: Node Depletion Visuals
    // We store the original tiles so we can restore them when the node respawns
    const depletedOriginals = new Map<string, { l1: number, l2: number }>();

    const handleNodeDepleted = (e: Event) => {
      const data = (e as CustomEvent).detail;
      const { x, y } = data;
      if (engineRef.current && mapData) {
        // Save original tiles from Object layers (usually layer 1 or 2)
        const l1 = mapData.tileLayers?.[1]?.grid?.[y]?.[x] || 0;
        const l2 = mapData.tileLayers?.[2]?.grid?.[y]?.[x] || 0;
        depletedOriginals.set(`${x}_${y}`, { l1, l2 });

        // Clear the tiles visually
        if (l1) engineRef.current.updateSingleTile(y, x, 0, 1, mapData.tilesets);
        if (l2) engineRef.current.updateSingleTile(y, x, 0, 2, mapData.tilesets);

        // Optionally place a stump tile (e.g. ID 15) on layer 1
        // engineRef.current.updateSingleTile(y, x, 15, 1, mapData.tilesets);
      }
    };

    const handleNodeRespawned = (e: Event) => {
      const data = (e as CustomEvent).detail;
      const { x, y } = data;
      if (engineRef.current && mapData) {
        // Restore original tiles
        const orig = depletedOriginals.get(`${x}_${y}`);
        if (orig) {
          if (orig.l1) engineRef.current.updateSingleTile(y, x, orig.l1, 1, mapData.tilesets);
          if (orig.l2) engineRef.current.updateSingleTile(y, x, orig.l2, 2, mapData.tilesets);
          depletedOriginals.delete(`${x}_${y}`);
        }
      }
    };

    window.addEventListener('combat_update_event', handleCombatUpdate);
    window.addEventListener('node_depleted_event', handleNodeDepleted);
    window.addEventListener('node_respawned_event', handleNodeRespawned);
    return () => {
      window.removeEventListener('combat_update_event', handleCombatUpdate);
      window.removeEventListener('node_depleted_event', handleNodeDepleted);
      window.removeEventListener('node_respawned_event', handleNodeRespawned);
    };
  }, [mapData]); // Added mapData to dependencies since it's used in the new listeners

  useEffect(() => {
    if (engineRef.current) {
      if (activeLayerIdx === -2) {
        engineRef.current.enableLogicGridOverlay(activeMap?.grid || []);
      } else {
        engineRef.current.disableLogicGridOverlay();
      }
    }
  }, [activeLayerIdx, activeMap]);

  useEffect(() => {
    // Wait until map data is fully loaded from the API before mounting engine
    if (!canvasRef.current || !mapData) return;

    // Initialize 2.5D Babylon Engine
    const babylonEngine = new BabylonEngine(canvasRef.current);
    engineRef.current = babylonEngine;
    setIsEngineReady(true);

    if (onCanvasReady) {
      onCanvasReady(babylonEngine);
    }

      babylonEngine.onEntityClick = (entityId) => {
        const state = useGameStore.getState();
        let targetName = 'Unknown Target';
        
        if (entityId.startsWith('loot_')) {
          const sprite = babylonEngine.getEntityMesh(entityId);
          if (sprite) {
            const mapId = state.currentMapId;
            const x = Math.round(sprite.position.x + (activeMap?.width || 0) / 2);
            const y = Math.round((activeMap?.height || 0) / 2 - sprite.position.z);
            state.emitSocketEvent?.('pickup_loot', { mapId, x, y });
          }
          return;
        }

        if (entityId.startsWith('npc_')) {
        const trueId = entityId.replace('npc_', '');
        const npc = activeMap.npcs?.find((n: any) => n.id === trueId);
        targetName = npc?.name || `NPC ${trueId}`;
      } else if (state.otherPlayers?.[entityId]) {
        targetName = state.otherPlayers[entityId].name;
      }

      state.setCombatTarget({
        entityId,
        name: targetName,
        hp: 100, // TODO: Sync from server
        maxHp: 100,
        behavior: 'CALM'
      });
    };

    // Load actual map grid and NPCs with fully resolved async data
    babylonEngine.loadTilemap({
      id: currentMapId,
      width: mapWidth,
      height: mapHeight,
      tileSize: 1, // 1 BJS world unit per tile
      tiles: activeMap.grid,
      tileLayers: activeMap.tileLayers,
      tilesets: activeMap.tilesets,
      npcs: activeMap.npcs
    });

    // Snap camera to player's starting position immediately (no lerp on first frame)
    const initPlayer = useGameStore.getState().player;
    if (initPlayer?.position) {
      const initX = (initPlayer.position.x ?? 6) - mapWidth / 2;
      const initZ = mapHeight / 2 - (initPlayer.position.y ?? 2);
      babylonEngine.snapCameraTo(initX, initZ);
    }

    // Start 60FPS Render Loop
    babylonEngine.startRenderLoop(() => {
      const freshPlayer = useGameStore.getState().player;
      if (freshPlayer && freshPlayer.position) {
        const px = freshPlayer.position.x ?? 6;
        const py = freshPlayer.position.y ?? 2;
        const worldX = px - mapWidth / 2;
        const worldZ = mapHeight / 2 - py;

        babylonEngine.updateEntity({
          id: 'player_main',
          name: freshPlayer.name || 'Hero',
          x: worldX,
          y: worldZ,
          // Fix: /assets/sprites/ does not exist. Sprites are in /assets/npcs/ or full path from Creature
          spriteUrl: freshPlayer.spriteId
            ? (freshPlayer.spriteId.startsWith('/') ? freshPlayer.spriteId : `/game-assets/npc/${freshPlayer.spriteId}.png`)
            : undefined,
          isPlayer: true,
          direction: freshPlayer.direction,
          isMoving: freshPlayer.isMoving,
          chatMessage: useGameStore.getState().localChat || undefined,
          spriteConfig: freshPlayer.spriteConfig
        });

        // Camera smoothly tracks player mesh (for fluid interpolation)
        const playerMesh = babylonEngine.getEntityMesh('player_main');
        if (playerMesh) {
          babylonEngine.setCameraPosition(playerMesh.position.x, playerMesh.position.z, 0.08);
        } else {
          babylonEngine.setCameraPosition(worldX, worldZ, 0.08);
        }
      }

      // Render connected multiplayer players
      const freshOtherPlayers = useGameStore.getState().otherPlayers;
      if (freshOtherPlayers) {
        Object.entries(freshOtherPlayers).forEach(([socketId, other]) => {
          const targetX = other.x || 6;
          const targetY = other.y || 2;
          
          const ox = targetX - mapWidth / 2;
          const oz = mapHeight / 2 - targetY;
          
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Tamer',
            x: ox,
            y: oz,
            spriteUrl: other.spriteId
              ? (other.spriteId.startsWith('/') ? other.spriteId : `/game-assets/npc/${other.spriteId}.png`)
              : undefined,
            isPlayer: true,
            direction: other.direction,
            isMoving: other.isMoving,
            chatMessage: other.chatMessage,
            spriteConfig: (other as any).spriteConfig
          });
        });
      }

      // Render dynamic map entities (NPCs / Animals) from the global store
      const mapEntities = useGameStore.getState().mapEntities;
      if (mapEntities) {
        mapEntities.forEach((ent) => {
          if (ent.mapId === currentMapId || !ent.mapId) {
            const ex = ent.position.x - mapWidth / 2;
            const ez = mapHeight / 2 - ent.position.y;
            babylonEngine.updateEntity({
              id: ent.id,
              name: ent.name || '',
              x: ex,
              y: ez,
              spriteUrl: ent.spriteKey ? (ent.spriteKey.includes('/') ? ent.spriteKey : `/assets/sprites/${ent.spriteKey}.png`) : undefined,
              isPlayer: false,
              spriteConfig: ent.spriteConfig
            });
          }
        });
      }
    });

    return () => {
      babylonEngine.dispose();
      engineRef.current = null;
    };
  // Re-run when mapData resolves or currentMapId changes
  }, [currentMapId, mapData]);

  // Handle Combat Target Selection Ring
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateSelectionRing(combatTarget?.entityId ?? null);
  }, [combatTarget]);

  // Handle Combat Projectile & HP Events
  useEffect(() => {
    const handleCombatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      const engine = engineRef.current;
      if (engine && data.attackerId && data.targetId) {
        // Fire projectile
        engine.renderProjectile(data.attackerId, data.targetId, 'fireball', 500); // 500ms cast/travel time
        
        // Show damage text slightly delayed to match projectile impact
        setTimeout(() => {
          engine.renderDamageText(data.targetId, data.damage, data.isCrit);
        }, 500);
      }
    };

    const handleHpUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      const engine = engineRef.current;
      if (engine && data.entityId) {
        engine.renderHealthBar(data.entityId, data.hpPercent);
      }
    };

    const handleLootDropped = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      const engine = engineRef.current;
      if (engine && data.id) {
        // Render a loot bag as a temporary entity (assuming we have an item sprite)
        engine.updateEntity({
          id: data.id,
          name: 'Loot',
          x: data.x - (activeMap?.width || 0) / 2,
          y: (activeMap?.height || 0) / 2 - data.y,
          spriteUrl: '/assets/sprites/16x16-rpg-items.png',
          isPlayer: false,
          spriteConfig: {
            columns: 1,
            rows: 1,
            idleFrame: 0,
            walkCycle: [0],
            walkSpeed: 0,
            directions: { down: 0, up: 0, left: 0, right: 0 }
          }
        });
      }
    };

    const handleLootDespawned = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      const engine = engineRef.current;
      if (engine && data.id) {
        engine.removeEntity(data.id);
      }
    };

    window.addEventListener('combat_update_event', handleCombatUpdate);
    window.addEventListener('creature_hp_update_event', handleHpUpdate);
    window.addEventListener('loot_dropped_event', handleLootDropped);
    window.addEventListener('loot_despawned_event', handleLootDespawned);
    
    return () => {
      window.removeEventListener('combat_update_event', handleCombatUpdate);
      window.removeEventListener('creature_hp_update_event', handleHpUpdate);
      window.removeEventListener('loot_dropped_event', handleLootDropped);
      window.removeEventListener('loot_despawned_event', handleLootDespawned);
    };
  }, [activeMap]);


  // Handle Live Dev Editor Tile Picking & Click-to-Move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isDevEditorOpen) {
      engine.enableTilePicking((r, c, clickedLayerIdx) => {
        if (activeLayerIdx === -2) {
          // Painting Logic directly on the activeMap.grid
          if (activeMap?.grid?.[r]) {
            activeMap.grid[r][c] = activeBrushTileId;
            engine.updateLogicTile(r, c, activeBrushTileId);
          }
          return;
        }

        if (onMapClick) onMapClick(r, c);

        const targetLayerIdx = activeLayerIdx !== -1 ? activeLayerIdx : (clickedLayerIdx || -1);
        
        // Always try to use the rich tileset array if present
        if (targetLayerIdx !== -1 && activeMap?.tileLayers?.[targetLayerIdx]) {
          engine.updateSingleTile(r, c, activeBrushTileId, targetLayerIdx, activeMap.tilesets);
          activeMap.tileLayers[targetLayerIdx].grid[r][c] = activeBrushTileId;
        } else {
          // Fallback to legacy single grid
          engine.updateSingleTile(r, c, activeBrushTileId);
          if (activeMap?.grid?.[r]) {
            activeMap.grid[r][c] = activeBrushTileId;
          }
        }
      });
    } else {
      // Click-to-move in exploration mode with Pathfinding
      engine.enableTilePicking((r, c) => {
        const currentPos = useGameStore.getState().player?.position;
        if (!currentPos) return;

        const dist = Math.abs(c - currentPos.x) + Math.abs(r - currentPos.y);
        
        if (dist === 1) {
           clearAutoWalk();
           tryMovePlayerTo(c, r);
        } else {
           const isWalkable = (x: number, y: number) => {
             const logicTiles = useGameStore.getState().logicTiles;
             const tileId = activeMap.grid[y]?.[x];
             if (logicTiles[tileId]?.isSolid) return false;
             
             const dynamicEntities = useGameStore.getState().mapEntities || [];
             const isStaticNpc = activeMap.npcs?.some((npc: any) => npc.x === x && npc.y === y);
             const isDynamicNpc = dynamicEntities.some((e) => Math.round(e.position.x) === x && Math.round(e.position.y) === y && (e.mapId === currentMapId || !e.mapId));
             if (isStaticNpc || isDynamicNpc) return false;

             return true;
           };

           const path = findPath(currentPos.x, currentPos.y, c, r, mapWidth, mapHeight, isWalkable);
           if (path.length > 0) {
             clearAutoWalk();
             autoWalkPathRef.current = path;
             
             // Take first step immediately
             const nextStep = autoWalkPathRef.current.shift()!;
             tryMovePlayerTo(nextStep.x, nextStep.y);
             
             // Start interval for remaining steps
             autoWalkIntervalRef.current = setInterval(() => {
               if (autoWalkPathRef.current.length === 0) {
                 clearAutoWalk();
                 return;
               }
               const step = autoWalkPathRef.current.shift()!;
               tryMovePlayerTo(step.x, step.y);
             }, 250);
           }
        }
      });
    }
  }, [isDevEditorOpen, activeBrushTileId, mapData, activeLayerIdx]);

  // Handle Keyboard WASD & Arrow Key Movement
  useEffect(() => {
    const keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false };
    let lastMoveTime = 0;
    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key as keyof typeof keys] = true;
        clearAutoWalk(); // Cancel any click-to-move pathfinding
      } else if (key === 'e' || key === ' ') {
        handleInteract();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key as keyof typeof keys] = false;
      }
    };

    const gameLoop = () => {
      const state = useGameStore.getState();
      
      let dx = 0;
      let dy = 0;

      if (keys.w || keys.arrowup) dy = -1;
      else if (keys.s || keys.arrowdown) dy = 1;
      else if (keys.a || keys.arrowleft) dx = -1;
      else if (keys.d || keys.arrowright) dx = 1;

      const now = performance.now();
      const isTryingToMove = dx !== 0 || dy !== 0;

      // 250ms movement cooldown matching BabylonEngine's 4.0 tiles/sec interpolation
      if (isTryingToMove && state.gameMode === 'EXPLORING' && (now - lastMoveTime) >= 250) {
        lastMoveTime = now;
        const pos = state.player.position;
        if (pos) {
          const nextX = pos.x + dx;
          const nextY = pos.y + dy;
          tryMovePlayerTo(nextX, nextY);
        }
      } else if (!isTryingToMove && state.player.isMoving && (now - lastMoveTime) >= 250 && !autoWalkIntervalRef.current) {
        // Stop moving animation if no keys are pressed and we finished the last move tween
        useGameStore.getState().setPlayerPosition(state.player.position, state.player.direction, false);
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mapWidth, mapHeight, mapData]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050508] overflow-hidden select-none">
      {/* Loading screen while async map data is fetching */}
      {!mapData && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050508]">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin mb-4" />
          <p className="text-violet-300 font-mono text-sm animate-pulse">Loading {currentMapId.replace(/_/g, ' ')}...</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-full outline-none touch-none ${isDevEditorOpen ? 'cursor-crosshair' : 'cursor-default'}`}
        tabIndex={0}
        onClick={(e) => (e.currentTarget as HTMLCanvasElement).focus()}
      />
      
      {/* Quest Tracker */}
      {!isDevEditorOpen && <QuestTrackerOverlay />}

      {/* Crafting Menu */}
      <CraftingOverlay />

      {isEngineReady && engineRef.current && (
        <FloatingHealthBars engine={engineRef.current} />
      )}
      
      <CanvasHudBadge activeMapName={activeMap?.name} currentMapId={currentMapId} />
      
      <QuestTrackerOverlay />

      {/* On-Screen Touch / Mouse Control D-Pad & Talk Action Button */}
      {isTouchDevice && (
        <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center gap-2 pointer-events-auto">
          <button
          onClick={handleInteract}
          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-full shadow-xl border border-amber-400/50 flex items-center gap-1.5 active:scale-95 transition-all font-mono"
        >
          <MessageSquare className="w-4 h-4" />
          <span>TALK / INTERACT (E)</span>
        </button>

        <div className="relative w-32 h-32 bg-black/60 backdrop-blur rounded-full border border-white/10 p-2 flex items-center justify-center shadow-2xl">
          {/* D-Pad Buttons */}
          <button
            onClick={() => tryMoveDirection(0, -1)}
            className="absolute top-1 p-2.5 bg-cyan-950/80 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/40 rounded-t-lg active:scale-90 transition-transform"
            title="Move Up (W)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => tryMoveDirection(-1, 0)}
            className="absolute left-1 p-2.5 bg-cyan-950/80 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/40 rounded-l-lg active:scale-90 transition-transform"
            title="Move Left (A)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => tryMoveDirection(1, 0)}
            className="absolute right-1 p-2.5 bg-cyan-950/80 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/40 rounded-r-lg active:scale-90 transition-transform"
            title="Move Right (D)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => tryMoveDirection(0, 1)}
            className="absolute bottom-1 p-2.5 bg-cyan-950/80 hover:bg-cyan-800 text-cyan-300 border border-cyan-500/40 rounded-b-lg active:scale-90 transition-transform"
            title="Move Down (S)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Hand className="w-3 h-3 text-cyan-400" />
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvasBabylon;
