'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BabylonEngine } from '@/engine/BabylonEngine';
import { resolveEncounter } from '@/game/CreatureDb';
import { useGameStore } from '../store';
import { loadMap } from '../data/maps';
import type { GameMapData } from '../data/maps';
import { soundSynth } from '@/engine/sound-synth';
import { findPath } from '@/engine/pathfinding';
import { WorldSimulation } from '@/engine/WorldSimulation';
import { FloatingHealthBars } from './FloatingHealthBar';
import { LOBBY_TOUCH_INTERACT_EVENT, LOBBY_TOUCH_MOVE_EVENT } from '../MobileControls';

import QuestTrackerOverlay from '../quest-tracker-overlay';
import CraftingOverlay from '../crafting-overlay';
import { isSameBaseMap, toBaseMapId } from '@/shared/net/mapIds';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { isSingleFrameSpriteUrl, SINGLE_FRAME_SPRITE_CONFIG } from '@/engine/BabylonEngine';
import { normalizeGates } from '@/shared/game/logicComponents';
import { useEditorStore } from '../editor/editor-store';
import {
  LOGIC_LAYER_IDX,
  isPaintableLogicId,
  paintCell,
  resolvePaintTarget,
} from '@/shared/game/tilePaint';

const CanvasHudBadge: React.FC<{ activeMapName?: string, currentMapId: string }> = ({ activeMapName, currentMapId }) => {
  const playerPos = useGameStore((state) => state.player.position);
  return (
    <div className="lobby-panel absolute top-4 left-4 z-10 flex items-center gap-2.5 rounded-lg px-3 py-1.5 font-mono text-xs text-lobby-mist">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lobby-soul shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
      <span className="text-lobby-ash">Map:</span>
      <strong className="text-lobby-mist">{activeMapName || currentMapId}</strong>
      <span className="text-lobby-ash/60">|</span>
      <span className="text-lobby-ash">Pos:</span>
      <strong className="text-lobby-film">({playerPos?.x ?? 0}, {playerPos?.y ?? 0})</strong>
      <span className="text-lobby-ash/60">|</span>
      <span className="hidden text-lobby-fog sm:inline">BGD / Click to Move</span>
    </div>
  );
};

interface GameCanvasBabylonProps {
  onCanvasReady?: (engine: BabylonEngine) => void;
  activeBrushTileId?: number;
  activeLayerIdx?: number;
  isDevEditorOpen?: boolean;
  /** Bible 17 — skip encounters/combat step actions while Studio create tools are open. */
  suppressGameplay?: boolean;
  onMapClick?: (r: number, c: number) => void;
}

export const GameCanvasBabylon: React.FC<GameCanvasBabylonProps> = ({
  onCanvasReady,
  activeBrushTileId = 1,
  activeLayerIdx = -1,
  isDevEditorOpen = false,
  suppressGameplay = false,
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
  const [isEngineReady, setIsEngineReady] = useState(false);
  const tryMoveDirectionRef = useRef<(dx: number, dy: number) => void>(() => {});
  const handleInteractRef = useRef<() => void>(() => {});

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

  // Studio paints by mutating `mapData` in place, and Save Map reads
  // `activeMapData` from the store. When this component loaded the map itself
  // the two were different objects, so every stroke was silently dropped on
  // save. Publish the loaded map so both sides share one reference.
  useEffect(() => {
    if (!isDevEditorOpen || !mapData) return;
    if (useGameStore.getState().activeMapData) return;
    useGameStore.getState().setActiveMapData(mapData);
  }, [isDevEditorOpen, mapData]);

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
      gates: normalizeGates(activeMap.gates),
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
      const spawn = gate.targetSpawn || { x: 6, y: 2 };
      const finishWarp = () => {
        useGameStore.setState({ currentMapId: gate.targetMapId });
        setPlayerPosition(spawn);
        // Re-join server map room so other players / chat stay in sync after warps
        const p = useGameStore.getState().player;
        emitSocketEvent?.('join_map', {
          accountId: p.accountId,
          mapId: toBaseMapId(gate.targetMapId),
          x: spawn.x,
          y: spawn.y,
          name: p.name || 'Player',
          spriteId: p.spriteId || 'adventurer',
        });
        showToast(`Warped to ${gate.targetMapId}`);
      };
      if (isDevEditorOpen) {
        finishWarp();
      } else {
        if (store.isMapTransitioning) return;
        store.setIsMapTransitioning(true);
        setTimeout(() => {
          finishWarp();
          setTimeout(() => {
            useGameStore.getState().setIsMapTransitioning(false);
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

      // Handle Step Actions (suppressed during Studio create tools — bible 17)
      if (result.stepAction && !suppressGameplay) {
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
  tryMoveDirectionRef.current = tryMoveDirection;

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
      gates: normalizeGates(activeMap?.gates),
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
      const rawId = String(result.npcId || '');
      const dialogueNpcId =
        rawId.includes('vance') || rawId.includes('warden')
          ? 'npc_warden_vance'
          : rawId;
      // Server-authoritative dialogue (Vance grants / quest report)
      store.emitSocketEvent?.('npc_interact', {
        mapId: currentMapId,
        targetId: dialogueNpcId,
      });
      return;
    }
    
    if (result.type === 'NONE') {
      showToast('Nothing to interact with here.');
    }
  };
  handleInteractRef.current = handleInteract;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key)) {
            clearAutoWalk();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearAutoWalk]);

  // MobileControls → same movement / interact pipeline as keyboard
  useEffect(() => {
    const onMove = (e: Event) => {
      const { dx, dy } = (e as CustomEvent<{ dx: number; dy: number }>).detail || {};
      if (typeof dx === 'number' && typeof dy === 'number') {
        tryMoveDirectionRef.current(dx, dy);
      }
    };
    const onInteract = () => handleInteractRef.current();
    window.addEventListener(LOBBY_TOUCH_MOVE_EVENT, onMove);
    window.addEventListener(LOBBY_TOUCH_INTERACT_EVENT, onInteract);
    return () => {
      window.removeEventListener(LOBBY_TOUCH_MOVE_EVENT, onMove);
      window.removeEventListener(LOBBY_TOUCH_INTERACT_EVENT, onInteract);
    };
  }, []);

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

    const handleTileChanged = (e: Event) => {
      const data = (e as CustomEvent).detail || {};
      const x = data.x;
      const y = data.y;
      const tileId = typeof data.tileId === 'number' ? data.tileId : 0;
      if (typeof x !== 'number' || typeof y !== 'number') return;

      setMapData((prev) => {
        if (!prev?.grid?.[y]) return prev;
        const nextGrid = prev.grid.map((row, rowIdx) =>
          rowIdx === y ? row.map((cell, colIdx) => (colIdx === x ? tileId : cell)) : row
        );
        return { ...prev, grid: nextGrid };
      });

      if (engineRef.current?.setLogicTile) {
        engineRef.current.setLogicTile(y, x, tileId);
      } else if (engineRef.current) {
        engineRef.current.clearTileProps?.(y, x);
        engineRef.current.updateSingleTile(y, x, tileId, -1);
      }
    };

    const handleNodeDepletedFallback = (e: Event) => {
      const data = (e as CustomEvent).detail || {};
      const { x, y } = data;
      // DEMO_SANDBOX has no rich tile layers — hide prop meshes on deplete
      if (typeof x === 'number' && typeof y === 'number' && engineRef.current?.clearTileProps) {
        engineRef.current.clearTileProps(y, x);
      }
    };

    window.addEventListener('combat_update_event', handleCombatUpdate);
    window.addEventListener('node_depleted_event', handleNodeDepleted);
    window.addEventListener('node_depleted_event', handleNodeDepletedFallback);
    window.addEventListener('node_respawned_event', handleNodeRespawned);
    window.addEventListener('lobby_tile_changed', handleTileChanged);
    return () => {
      window.removeEventListener('combat_update_event', handleCombatUpdate);
      window.removeEventListener('node_depleted_event', handleNodeDepleted);
      window.removeEventListener('node_depleted_event', handleNodeDepletedFallback);
      window.removeEventListener('node_respawned_event', handleNodeRespawned);
      window.removeEventListener('lobby_tile_changed', handleTileChanged);
    };
  }, [mapData]); // Added mapData to dependencies since it's used in the new listeners

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
        const mapEnt = state.mapEntities.find((e) => e.id === entityId);
        const trueId = entityId.replace(/^npc_/, '').replace(/_\d{10,}$/, '');
        const npc = activeMap.npcs?.find(
          (n: any) => n.id === trueId || n.id === `npc_${trueId}` || n.id === entityId
        );
        targetName =
          mapEnt?.name ||
          npc?.name ||
          (trueId.includes('vance') ? 'Warden Vance' : `NPC ${trueId}`);
        // Prefer server-provided dialogueKey; fall back to stable npc_<template> id.
        const dialogueNpcId =
          mapEnt?.dialogueKey ||
          (trueId.includes('vance') || entityId.includes('vance')
            ? 'npc_warden_vance'
            : `npc_${trueId}`);
        state.emitSocketEvent?.('npc_interact', {
          mapId: state.currentMapId || state.instanceId,
          targetId: dialogueNpcId,
        });
        state.setGameMode('DIALOG');
        return;
      } else if (entityId.startsWith('creature_')) {
        const mapEnt = state.mapEntities.find((e) => e.id === entityId);
        targetName = mapEnt?.name || 'Wild Creature';
        state.setCombatTarget({
          entityId,
          name: targetName,
          hp: 80,
          maxHp: 80,
          behavior: 'HOSTILE',
        });
        return;
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

    // Load map grid only — NPCs/wilds come from socket mapEntities (avoids
    // duplicate meshes + broken /assets/sprites/ paths inside loadTilemap).
    babylonEngine.loadTilemap({
      id: currentMapId,
      width: mapWidth,
      height: mapHeight,
      tileSize: 1, // 1 BJS world unit per tile
      tiles: activeMap.grid,
      tileLayers: activeMap.tileLayers,
      tilesets: activeMap.tilesets,
      npcs: [],
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
          spriteUrl: resolveEntitySpriteUrl(freshPlayer.spriteId, {
            kind: 'player',
            fallback: '/game-assets/npc/adventurer.png',
          }),
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
        const activeSockets = new Set(Object.keys(freshOtherPlayers));
        
        // Cleanup stale multiplayer meshes
        babylonEngine._renderedSockets.forEach((id: string) => {
          if (!activeSockets.has(id)) {
            babylonEngine.removeEntity(`multiplayer_${id}`);
            babylonEngine._renderedSockets.delete(id);
          }
        });

        Object.entries(freshOtherPlayers).forEach(([socketId, other]) => {
          babylonEngine._renderedSockets.add(socketId);
          const targetX = other.x || 6;
          const targetY = other.y || 2;
          
          const ox = targetX - mapWidth / 2;
          const oz = mapHeight / 2 - targetY;
          
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Tamer',
            x: ox,
            y: oz,
            spriteUrl: resolveEntitySpriteUrl(other.spriteId, {
              kind: 'player',
              fallback: '/game-assets/npc/adventurer.png',
            }),
            isPlayer: true,
            direction: other.direction,
            isMoving: other.isMoving,
            chatMessage: other.chatMessage,
            spriteConfig: (other as any).spriteConfig
          });
        });
      }

      // Render map entities: socket mapEntities + static map NPCs as fallback
      // (socket snapshot can miss if join races; map JSON still has placements).
      const mapEntities = useGameStore.getState().mapEntities || [];
      const staticNpcs = (activeMap?.npcs || []).map((npc: any) => ({
        id: `mapnpc_${npc.id}`,
        type: 'NPC' as const,
        spriteKey: npc.sprite || 'adventurer',
        position: { x: npc.x, y: npc.y },
        mapId: currentMapId,
        name: npc.name || npc.id,
      }));
      // Prefer socket entities. Skip static NPCs already covered by socket at same
      // tile OR same display name (socket ids are npc_<template>_<ts>).
      const socketTiles = new Set(
        mapEntities
          .filter((e) => e.type === 'NPC')
          .map((e) => `${Math.round(e.position.x)},${Math.round(e.position.y)}`)
      );
      const socketNames = new Set(
        mapEntities
          .filter((e) => e.type === 'NPC' && e.name)
          .map((e) => String(e.name).toLowerCase())
      );
      const merged = [
        ...mapEntities,
        ...staticNpcs.filter((n: { position: { x: number; y: number }; name?: string }) => {
          const tile = `${Math.round(n.position.x)},${Math.round(n.position.y)}`;
          const name = String(n.name || '').toLowerCase();
          return !socketTiles.has(tile) && !(name && socketNames.has(name));
        }),
      ];

      const activeEntities = new Set<string>();
      merged.forEach((ent) => {
        if (!ent.mapId || ent.mapId === currentMapId || isSameBaseMap(ent.mapId, currentMapId)) {
          activeEntities.add(ent.id);
          const ex = ent.position.x - mapWidth / 2;
          const ez = mapHeight / 2 - ent.position.y;
          const kind =
            ent.type === 'NPC'
              ? 'npc'
              : ent.type === 'ANIMAL'
                ? 'animal'
                : 'monster';
          const spriteUrl = resolveEntitySpriteUrl(ent.spriteKey, { kind });
          babylonEngine.updateEntity({
            id: ent.id,
            name: ent.name || '',
            x: ex,
            y: ez,
            spriteUrl,
            isPlayer: false,
            isNpc: ent.type === 'NPC',
            isCreature: ent.type === 'MONSTER' || ent.type === 'ANIMAL',
            spriteConfig:
              (ent as any).spriteConfig ||
              (isSingleFrameSpriteUrl(spriteUrl) ? SINGLE_FRAME_SPRITE_CONFIG : undefined),
          });
        }
      });

      // Cleanup stale map entities
      babylonEngine._renderedEntities.forEach((id: string) => {
        if (!activeEntities.has(id)) {
          babylonEngine.removeEntity(id);
          babylonEngine._renderedEntities.delete(id);
        }
      });
      activeEntities.forEach((id) => babylonEngine._renderedEntities.add(id));
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
          spriteUrl: '/game-assets/npc/adventurer.png',
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


  // Logic (−1) overlay. Declared after the engine-mount effect on purpose:
  // React runs every cleanup for a commit before any setup, so an earlier
  // declaration saw `engineRef.current === null` on a mapData change and the
  // overlay was never rebuilt — logic clicks then registered with no visible
  // result for the rest of the session.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (activeLayerIdx === LOGIC_LAYER_IDX) {
      engine.enableLogicGridOverlay(activeMap?.grid || []);
    } else {
      engine.disableLogicGridOverlay();
    }
  }, [activeLayerIdx, mapData, activeMap]);

  // Handle Live Dev Editor Tile Picking & Click-to-Move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isDevEditorOpen) {
      engine.enableTilePicking((r, c) => {
        const target = resolvePaintTarget(activeMap, activeLayerIdx);
        if (target.kind === 'unavailable') {
          showToast(target.reason);
          return;
        }

        if (target.kind === 'logic') {
          const logicId = useEditorStore.getState().activeLogicTileId;
          const logicTiles = useGameStore.getState().logicTiles;
          if (!isPaintableLogicId(logicTiles, logicId)) {
            showToast(`Logic tile #${logicId} is not registered — pick a tag in Logic Tags first.`);
            return;
          }
          const logicWrite = paintCell(activeMap, target, r, c, logicId);
          if (!logicWrite.ok) {
            showToast(logicWrite.reason);
            return;
          }
          if (onMapClick) onMapClick(r, c);
          // A missing overlay means the engine was rebuilt under us; rebuild and retry.
          if (!engine.updateLogicTile(r, c, logicId)) {
            engine.enableLogicGridOverlay(activeMap?.grid || []);
            engine.updateLogicTile(r, c, logicId);
          }
          return;
        }

        const visualWrite = paintCell(activeMap, target, r, c, activeBrushTileId);
        if (!visualWrite.ok) {
          showToast(visualWrite.reason);
          return;
        }
        if (onMapClick) onMapClick(r, c);
        engine.updateSingleTile(r, c, activeBrushTileId, target.layerIdx, activeMap.tilesets);
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
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-lobby-soul/30 border-t-lobby-film" />
          <p className="animate-pulse font-mono text-sm text-lobby-fog">
            Loading {currentMapId.replace(/_/g, ' ')}...
          </p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className={`w-full h-full outline-none touch-none ${isDevEditorOpen ? 'cursor-crosshair' : 'cursor-default'}`}
        tabIndex={0}
        onClick={(e) => (e.currentTarget as HTMLCanvasElement).focus()}
      />
      
      {/* Quest Tracker (single instance) */}
      {!isDevEditorOpen && <QuestTrackerOverlay />}

      {/* Crafting Menu */}
      <CraftingOverlay />

      {isEngineReady && engineRef.current && (
        <FloatingHealthBars engine={engineRef.current} />
      )}
      
      <CanvasHudBadge activeMapName={activeMap?.name} currentMapId={currentMapId} />
    </div>
  );
};

export default GameCanvasBabylon;
