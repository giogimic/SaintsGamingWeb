'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BabylonEngine } from '@/engine/BabylonEngine';
import { useGameStore } from '../store';
import { useEditorStore } from '../editor/editor-store';
import { loadMap } from '../data/maps';
import type { GameMapData } from '../data/maps';
import { soundSynth } from '@/engine/sound-synth';
import { findPath } from '@/engine/pathfinding';
import { WorldSimulation } from '@/engine/WorldSimulation';
import { FloatingHealthBars } from './FloatingHealthBar';
import { LOBBY_TOUCH_INTERACT_EVENT, LOBBY_TOUCH_MOVE_EVENT } from '../MobileControls';


import CraftingOverlay from '../crafting-overlay';
import { isSameBaseMap, toBaseMapId } from '@/shared/net/mapIds';
import { resolveEntitySpriteUrl } from '@/shared/game/creatureCatalog';
import { isSingleFrameSpriteUrl, SINGLE_FRAME_SPRITE_CONFIG } from '@/engine/BabylonEngine';
import { normalizeGates } from '@/shared/game/logicComponents';
import {
  LOGIC_LAYER_IDX,
  isPaintableLogicId,
  resolvePaintTarget,
} from '@/shared/game/tilePaint';
import { rasterizeLine } from '@/shared/game/lineRaster';
import { paintWorldCell } from '@/shared/game/worldDocument';
import {
  STUDIO_MAP_CELLS_CHANGED_EVENT,
  STUDIO_MAP_HOT_RELOAD_EVENT,
  type StudioMapCellsChangedDetail,
  type StudioMapHotReloadDetail,
} from '@/shared/game/studioEvents';
import { getIsEditorMode } from '@/shared/game/studioSession';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { shouldKeepActiveMapData } from '@/shared/game/mapSwitch';
import {
  mapVisualFingerprint,
  resolveMapDimensions,
  shouldAcceptMapDoc,
  shouldRemeshMapDoc,
} from '@/shared/game/mapDocVisual';

/** Lobby multiplayer shard base — keep in sync with server DEMO_MAP_ID. */
const LOBBY_MULTIPLAYER_MAP = 'DEMO_SANDBOX';



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
  activeBrushTileId = 17,
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
  const brushMode = useEditorStore((state) => state.brushMode);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  isSpaceHeldRef.current = isSpaceHeld;
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const isShiftHeldRef = useRef(false);
  isShiftHeldRef.current = isShiftHeld;

  useEffect(() => {
    if (!isDevEditorOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        setIsSpaceHeld(true);
      }
      if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
        setIsShiftHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsShiftHeld(false);
      }
    };
    const handleToggleLayerDim = () => {
      if (engineRef.current) {
        const store = useEditorStore.getState();
        const active = engineRef.current.toggleLayerIsolation(store.activeLayerIdx);
        showToast(active ? `Layer Isolation Active (Layer ${store.activeLayerIdx})` : 'Layer Isolation Off');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('studio_toggle_layer_dim', handleToggleLayerDim);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('studio_toggle_layer_dim', handleToggleLayerDim);
    };
  }, [isDevEditorOpen, showToast]);

  // Entity interpolation buffer: socketId -> { fromX, fromY, toX, toY, startTime, duration }
  const interpBufferRef = useRef<Record<string, { fromX: number; fromY: number; toX: number; toY: number; startTime: number; duration: number }>>({});
  const autoWalkPathRef = useRef<{x: number, y: number}[]>([]);
  const autoWalkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const tryMoveDirectionRef = useRef<(dx: number, dy: number) => void>(() => {});
  const handleInteractRef = useRef<() => void>(() => {});
  const editorToolsRef = useRef(isDevEditorOpen);
  editorToolsRef.current = isDevEditorOpen;

  // Async map state — engine only mounts AFTER map data is ready
  const [mapData, setMapData] = useState<GameMapData | null>(null);
  const mapDataRef = useRef<GameMapData | null>(null);
  mapDataRef.current = mapData;
  /** Last doc whose tile geometry was pushed into Babylon (identity + fingerprint). */
  const lastLoadedMapDataRef = useRef<GameMapData | null>(null);
  const lastVisualFingerprintRef = useRef<string>('');
  /** Bumped after every loadTilemap so author overlays re-attach (load clears them). */
  const [mapMeshEpoch, setMapMeshEpoch] = useState(0);

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
    // Prefer live Studio / socket document only when it matches currentMapId.
    // Gate warps that flip the id without clearing activeMapData used to keep DEMO.
    if (activeMapData && shouldKeepActiveMapData(activeMapData, currentMapId)) {
      setMapData((prev) => {
        // Same object — no-op (avoids Babylon remount / remesh).
        if (prev === activeMapData) return prev;
        if (prev && shouldKeepActiveMapData(prev, currentMapId)) {
          // Stable ref unless next is a real visual/DB upgrade (never NPC-only churn).
          if (!shouldAcceptMapDoc(prev, activeMapData as GameMapData)) {
            return prev;
          }
        }
        return ensureMapHasStudioTilesets(activeMapData as GameMapData);
      });
      setIsEngineReady(true);
      return;
    }

    // Keep prior mapData while fetching the same base map — setMapData(null)
    // disposed Babylon with no replacement and hid peer sprites mid-join.
    setIsEngineReady(false);
    setMapData((prev) => {
      if (prev && shouldKeepActiveMapData(prev, currentMapId)) {
        return prev;
      }
      return null;
    });
    loadMap(currentMapId).then((data) => {
      const ensured = ensureMapHasStudioTilesets(data);
      setMapData((prev) => {
        if (prev && shouldKeepActiveMapData(prev, currentMapId) && !shouldAcceptMapDoc(prev, ensured)) {
          return prev;
        }
        return ensured;
      });
      const store = useGameStore.getState();
      if (!shouldKeepActiveMapData(store.activeMapData, currentMapId)) {
        store.setActiveMapData(ensured);
      }
      setIsEngineReady(true);
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
      setIsEngineReady(true);
    });
  }, [currentMapId, activeMapData]);

  // Studio paints by mutating `mapData` in place, and Save Map reads
  // `activeMapData` from the store. When this component loaded the map itself
  // the two were different objects, so every stroke was silently dropped on
  // save. Publish the loaded map so both sides share one reference — and replace
  // proxy shells still sitting in the store.
  useEffect(() => {
    if (!isDevEditorOpen || !mapData) return;
    const store = useGameStore.getState();
    const cur = store.activeMapData as GameMapData | null;
    if (cur === mapData) return;
    if (cur && shouldKeepActiveMapData(cur, currentMapId) && !shouldAcceptMapDoc(cur, mapData)) {
      return;
    }
    store.setActiveMapData(mapData);
  }, [isDevEditorOpen, mapData, currentMapId]);

  // Derive dimensions — tileLayers first (see resolveMapDimensions), then grid / meta.
  const activeMap = mapData as GameMapData | null;
  const { width: mapWidth, height: mapHeight } = resolveMapDimensions(activeMap || undefined);

  // Unified Movement Execution Engine
  const tryMovePlayerTo = (targetX: number, targetY: number) => {
    // Editor runtime: gameplay input dormant (engine-editor foundation).
    if (isDevEditorOpen) return;
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
      isDevEditorOpen,
      connections: activeMap.connections
    };

    const result = WorldSimulation.tryMove(worldState, targetX, targetY);

    if (result.type === 'BLOCKED') {
      if (isDevEditorOpen && result.reason === 'WALL') {
        // Prevent toast spam by checking a ref or just letting the toast queue handle it.
        // We'll rely on the toast queue to coalesce rapid identical messages (built in Game UI P0).
        store.showToast('Blocked by wall collision (Logic Tag)');
      }
      
      // Phase 2: Client Prediction (Turn in place)
      setPlayerPosition(currentPos, result.direction, false);
      const seq = store.incrementMoveSeq();
      store.addPendingMove({ seq, direction: result.direction, predictedPos: currentPos });
      emitSocketEvent?.('input', { type: "MOVE", direction: result.direction, sequence: seq, timestamp: Date.now() });
      emitSocketEvent?.('player_move', { x: currentPos.x, y: currentPos.y, direction: result.direction, moving: false, seq });
      return;
    }

    if (result.type === 'WARP') {
      const gate = result.gate;
      const spawn = { ...(gate.targetSpawn || { x: 6, y: 2 }) };
      const targetBase = toBaseMapId(gate.targetMapId);
      const finishWarp = () => {
        let loadedGrid: number[][] | undefined = undefined;
        // Load destination document before flipping ids — never leave stale
        // activeMapData mounted (World Builder warp already does this pair).
        void loadMap(gate.targetMapId)
          .then((data) => {
            const loaded = ensureMapHasStudioTilesets(data);
            loadedGrid = loaded.grid;
            useGameStore.setState({
              currentMapId: gate.targetMapId,
              activeMapData: loaded,
            });
          })
          .catch(() => {
            // Clears activeMapData so the canvas effect loads fresh.
            useGameStore.getState().setCurrentMapId(gate.targetMapId);
          })
          .finally(() => {
            const finalW = loadedGrid?.[0]?.length || 20;
            const finalH = loadedGrid?.length || 20;
            if (spawn.x === -1) {
              spawn.x = finalW - 1;
            }
            if (spawn.y === -1) {
              spawn.y = finalH - 1;
            }
            // Clamp spawn safely within destination bounds
            spawn.x = Math.max(0, Math.min(finalW - 1, spawn.x));
            spawn.y = Math.max(0, Math.min(finalH - 1, spawn.y));

            setPlayerPosition(spawn);
            const p = useGameStore.getState().player;
            const inStudio = getIsEditorMode();
            const creation = useEditorStore.getState().isCreationMode;
            emitSocketEvent?.('join_map', {
              accountId: p.accountId,
              mapId: targetBase,
              lobby: !inStudio,
              // Studio must stay on private / PIE — never leak into public DEMO_chN.
              isPrivate: inStudio && creation,
              pie: inStudio && !creation,
              x: spawn.x,
              y: spawn.y,
              name: p.name || 'Player',
              spriteId: p.spriteId || 'adventurer',
            });
            showToast(`Warped to ${gate.targetMapId.replace(/_/g, ' ')}`);
          });
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
      emitSocketEvent?.('player_move', { x: targetX, y: targetY, direction: dir, moving: true, seq });

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
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;
    const currentPlayer = state.player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;
    tryMovePlayerTo(curX + dx, curY + dy);
  };
  tryMoveDirectionRef.current = tryMoveDirection;

  // Interact / Talk Handler
  const handleInteract = () => {
    if (isDevEditorOpen) return;
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

    if (result.type === 'LOGIC_INTERACT') {
      if (result.action === 'OPEN_CRAFTING') {
        showToast('Opened Crafting Station (Playtest Preview)');
        useGameStore.setState({ gameMode: 'CRAFTING' });
        return;
      }
      if (result.action === 'OPEN_SHOP') {
        showToast('Opened Shop (Playtest Preview)');
        return;
      }
      if (result.action === 'HEAL') {
        showToast('Healed at Shrine (Playtest Preview)');
        return;
      }
      if (result.action === 'OPEN_BANK') {
        showToast('Opened Bank (Playtest Preview)');
        return;
      }

      if (result.action === 'HARVEST_WOOD') {
        soundSynth.playWoodcuttingSound();
        showToast('Harvested Wood');
      } else if (result.action === 'HARVEST_ORE') {
        soundSynth.playMiningSound();
        showToast('Harvested Ore');
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

  // MobileControls → same movement / interact pipeline as keyboard (playtest only)
  useEffect(() => {
    if (isDevEditorOpen) return;
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
  }, [isDevEditorOpen]);

  useEffect(() => {
    const handleCombatUpdate = (e: Event) => {
      if (!engineRef.current) return;
      const data = (e as CustomEvent).detail;
      if (data.type === 'ATTACK_RESULT') {
        engineRef.current.spawnProjectile(data.attackerId, data.targetId, data.abilityId);
        
        // Also show floating damage text via Babylon Engine
        if (!data.isMiss && data.damage > 0) {
          engineRef.current.renderDamageText(data.targetId, data.damage, data.isCrit);
          if (data.isCrit) {
            soundSynth?.playCriticalHit?.();
          } else {
            soundSynth?.playCombatHit?.();
          }
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

  // Stable key so setActiveMapData new-object refreshes do not dispose Babylon
  // (that wiped player_main + NPCs and left only grass).
  const engineMapKey = mapData
    ? toBaseMapId(String((mapData as { id?: string }).id || currentMapId || ''))
    : '';

  useEffect(() => {
    // Wait until map data is fully loaded from the API before mounting engine
    if (!canvasRef.current || !mapData || !engineMapKey) {
      console.log('[GameCanvasBabylon] Effect aborted', {
        hasCanvas: !!canvasRef.current,
        hasMapData: !!mapData,
        engineMapKey
      });
      return;
    }

    console.log('[GameCanvasBabylon] Initializing engine for map:', engineMapKey);

    // Initialize 2.5D Babylon Engine
    const babylonEngine = new BabylonEngine(canvasRef.current);
    engineRef.current = babylonEngine;
    if (typeof window !== 'undefined') {
      (window as any).__babylonEngine = babylonEngine;
    }
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
        // Prefer live store/doc — mount-time `activeMap` can be null to TS and stale at click.
        const liveMap =
          (state.activeMapData as GameMapData | null) || mapDataRef.current || activeMap;
        const npc = liveMap?.npcs?.find(
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
      } else if (entityId.startsWith('creature_') || entityId.startsWith('mob_') || entityId.startsWith('wild_')) {
        const mapEnt = state.mapEntities.find((e) => e.id === entityId);
        targetName = mapEnt?.name || 'Wild Creature';
        state.setCombatTarget({
          entityId,
          name: targetName,
          hp: (mapEnt as any)?.hp || 80,
          maxHp: (mapEnt as any)?.maxHp || 80,
          behavior: 'HOSTILE',
        });
        return;
      } else if (entityId.startsWith('multiplayer_') || state.otherPlayers?.[entityId]) {
        const rawSocketId = entityId.startsWith('multiplayer_') ? entityId.replace(/^multiplayer_/, '') : entityId;
        const peer = state.otherPlayers?.[rawSocketId] || state.otherPlayers?.[entityId];
        targetName = peer?.name || 'Saint';
        state.setCombatTarget({
          entityId: rawSocketId,
          name: targetName,
          hp: 100,
          maxHp: 100,
          behavior: 'CALM',
        });
        return;
      }

      state.setCombatTarget({
        entityId,
        name: targetName,
        hp: 100,
        maxHp: 100,
        behavior: 'CALM'
      });
    };

    // Load map grid only — NPCs/wilds come from socket mapEntities (avoids
    // duplicate meshes + broken /assets/sprites/ paths inside loadTilemap).
    console.log('[GameCanvasBabylon] Calling loadTilemap with', {
      id: currentMapId,
      width: mapWidth,
      height: mapHeight,
      layerCount: mapData.tileLayers?.length
    });
    
    lastLoadedMapDataRef.current = mapData;
    lastVisualFingerprintRef.current = mapVisualFingerprint(mapData);
    babylonEngine.loadTilemap({
      id: currentMapId,
      width: mapWidth,
      height: mapHeight,
      tileSize: 1, // 1 BJS world unit per tile
      tiles: mapData.grid || [],
      tileLayers: mapData.tileLayers,
      tilesets: mapData.tilesets,
      npcs: [],
    });
    setMapMeshEpoch((n) => n + 1);

    // Editor: frame the whole map (author spawn often sits outside short maps).
    // Playtest/lobby: snap to the player.
    if (editorToolsRef.current) {
      babylonEngine.fitMapInView();
    } else {
      const initPlayer = useGameStore.getState().player;
      if (initPlayer?.position) {
        const initX = (initPlayer.position.x ?? 6) - mapWidth / 2;
        const initZ = mapHeight / 2 - (initPlayer.position.y ?? 2);
        babylonEngine.snapCameraTo(initX, initZ);
      }
    }

    // Start 60FPS Render Loop
    babylonEngine.startRenderLoop(() => {
      // Prefer live engine dims — closure mapWidth/Height go stale across hot remesh
      // without a full remount.
      const liveW = babylonEngine.getMapWidth() || mapWidth;
      const liveH = babylonEngine.getMapHeight() || mapHeight;
      const freshPlayer = useGameStore.getState().player;
      if (freshPlayer && freshPlayer.position) {
        const px = freshPlayer.position.x ?? 6;
        const py = freshPlayer.position.y ?? 2;
        const worldX = px - liveW / 2;
        const worldZ = liveH / 2 - py;

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
        // Keep avatar hidden while editor tools are active (avatar-free viewport)
        babylonEngine.setEntityVisible('player_main', !editorToolsRef.current);

        // Camera: follow player in Playtest only; Editor uses free pan/zoom
        if (!editorToolsRef.current) {
          const playerMesh = babylonEngine.getEntityMesh('player_main');
          if (playerMesh) {
            babylonEngine.setCameraPosition(playerMesh.position.x, playerMesh.position.z, 0.08);
          } else {
            babylonEngine.setCameraPosition(worldX, worldZ, 0.08);
          }
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
          // Prefer ?? so tile (0,0) is not remapped to demo defaults.
          const targetX = other.x ?? 6;
          const targetY = other.y ?? 2;
          
          const ox = targetX - liveW / 2;
          const oz = liveH / 2 - targetY;
          
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Saint',
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
      // Read live store doc — mount closure activeMap.npcs goes stale when we
      // keep the Babylon engine across setActiveMapData refreshes.
      const mapEntities = useGameStore.getState().mapEntities || [];
      const liveMapDoc =
        (useGameStore.getState().activeMapData as {
          npcs?: Array<{ id: string; name?: string; x: number; y: number; sprite?: string }>;
        } | null) || activeMap;
      const staticNpcs = (liveMapDoc?.npcs || []).map((npc: any) => ({
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
          const ex = ent.position.x - liveW / 2;
          const ez = liveH / 2 - ent.position.y;
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
      lastLoadedMapDataRef.current = null;
      lastVisualFingerprintRef.current = '';
    };
  // Remount only when the base map seat changes — not on every mapData object identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mapData read when engineMapKey flips
  }, [engineMapKey]);

  // Handle Map Document Hydration (Studio + first paint)
  // Engine remounts only on engineMapKey. When a proxy-shell mounts first and the
  // DB doc arrives later (same base id), remesh tiles in place — do NOT remesh on
  // lobby NPC / object-identity churn (fingerprint ignores npcs).
  useEffect(() => {
    if (!engineRef.current || !mapData) return;
    // Paint mutates in place — same identity, skip.
    if (lastLoadedMapDataRef.current === mapData) return;
    if (!shouldRemeshMapDoc(lastLoadedMapDataRef.current, mapData)) {
      // Adopt the newer ref without rebuilding meshes (e.g. metadata-only).
      lastLoadedMapDataRef.current = mapData;
      lastVisualFingerprintRef.current = mapVisualFingerprint(mapData);
      return;
    }

    lastLoadedMapDataRef.current = mapData;
    lastVisualFingerprintRef.current = mapVisualFingerprint(mapData);
    const dims = resolveMapDimensions(mapData);
    // NPCs stay empty — socket mapEntities + store activeMapData drive sprites.
    engineRef.current.loadTilemap({
      id: currentMapId,
      width: dims.width,
      height: dims.height,
      tileSize: 1,
      tiles: mapData.grid,
      tileLayers: mapData.tileLayers,
      tilesets: mapData.tilesets,
      npcs: [],
    });
    setMapMeshEpoch((n) => n + 1);
    if (editorToolsRef.current) {
      engineRef.current.fitMapInView();
    }
  }, [mapData, currentMapId]);

  // Handle Combat Target Selection Ring
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateSelectionRing(combatTarget?.entityId ?? null);
  }, [combatTarget]);

  // Studio Center Camera Event Listener
  useEffect(() => {
    const handleCenterCamera = (e: Event) => {
      const customEv = e as CustomEvent<{ r: number; c: number }>;
      const { r, c } = customEv.detail || {};
      if (typeof r === 'number' && typeof c === 'number' && engineRef.current) {
        engineRef.current.panEditorCameraToTile(r, c);
      }
    };
    window.addEventListener('studio_center_camera', handleCenterCamera);
    return () => window.removeEventListener('studio_center_camera', handleCenterCamera);
  }, []);

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
          if (data.isCrit) {
            soundSynth?.playCriticalHit?.();
          } else if (data.damage > 0) {
            soundSynth?.playCombatHit?.();
          }
        }, 500);
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
    window.addEventListener('loot_dropped_event', handleLootDropped);
    window.addEventListener('loot_despawned_event', handleLootDespawned);
    
    return () => {
      window.removeEventListener('combat_update_event', handleCombatUpdate);
      window.removeEventListener('loot_dropped_event', handleLootDropped);
      window.removeEventListener('loot_despawned_event', handleLootDespawned);
      if (typeof window !== 'undefined' && (window as any).__babylonEngine === engineRef.current) {
        (window as any).__babylonEngine = null;
      }
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
    if (!engine || !activeMap) return;
    const map = activeMap;

    // Sync brush radius
    engine.setBrushRadius(useEditorStore.getState().brushRadius);

    const worldSync = {
      ensureActiveMap: (next: any) => {
        const store = useGameStore.getState();
        // Keep store on the same object so Save Map sees in-place paint without remounting.
        if (store.activeMapData !== next) {
          store.setActiveMapData(next);
        }
      },
      markDirty: () => useEditorStore.getState().markMapDirty(),
    };

      let cleanupPan = () => {};

      if (isDevEditorOpen) {
        cleanupPan = engine.startEditorKeyboardPan() || (() => {});
        engine.enableTilePicking((r, c, _, eventType) => {
          const store = useEditorStore.getState();
          const { brushMode, setSelectionStart, setSelectionEnd, activePrefabId } = store;

          if (brushMode === 'pan') {
            return;
          }

          if (brushMode === 'eyedropper') {
            if (eventType !== 'down') return;
            if (activeLayerIdx === LOGIC_LAYER_IDX) {
              const tagId = map.grid?.[r]?.[c] ?? 0;
              store.setActiveLogicTileId(tagId);
              const meta = useGameStore.getState().logicTiles?.[tagId];
              showToast(`Sampled Logic Tag: ${meta?.name || `#${tagId}`}`);
            } else {
              const gid = map.tileLayers?.[activeLayerIdx]?.grid?.[r]?.[c] ?? 0;
              store.setActiveBrushTileId(gid);
              showToast(`Sampled Visual Tile: GID ${gid}`);
            }
            store.setBrushMode('paint');
            return;
          }

          if (brushMode === 'select') {
            if (eventType === 'down') {
              setSelectionStart({ r, c });
              setSelectionEnd({ r, c });
              engine.setSelectionPreview(r, c, r, c);
            } else if (eventType === 'move') {
              setSelectionEnd({ r, c });
              if (store.selectionStart) {
                engine.setSelectionPreview(store.selectionStart.r, store.selectionStart.c, r, c);
              }
            }
            return;
          }

          if (brushMode === 'paste' || store.isPasting) {
            if (eventType !== 'down') return;
            const res = store.pasteClipboard(map, engine, r, c, store.pasteMode);
            if (res.ok) {
              showToast(`Pasted ${res.count} tiles (${store.pasteMode})`);
              store.cancelPaste();
            } else {
              showToast(res.error || 'Paste failed.');
            }
            return;
          }

          if (brushMode === 'prefab') {
            if (eventType !== 'down') return;
            const prefab = store.prefabs.find((p) => p.id === activePrefabId);
            if (!prefab) {
              showToast('Select a prefab from the Prefab Builder first.');
              return;
            }

            const ops: any[] = [];
            // Paste Visual Data
            prefab.visualData?.forEach((v: any) => {
              const tr = r + v.r;
              const tc = c + v.c;
              if (tr < 0 || tr >= mapHeight || tc < 0 || tc >= mapWidth) return;
              const targetLayer = v.layerOffset; // Keep original layer
              const painted = paintWorldCell(map, targetLayer, tr, tc, v.tileId, worldSync);
              if (!('error' in painted)) {
                ops.push(painted.cell);
                engine.updateSingleTile(tr, tc, v.tileId, targetLayer, map.tilesets);
              }
            });

            // Paste Logic Data
            prefab.logicData?.forEach((l: any) => {
              const tr = r + l.r;
              const tc = c + l.c;
              if (tr < 0 || tr >= mapHeight || tc < 0 || tc >= mapWidth) return;
              const painted = paintWorldCell(map, LOGIC_LAYER_IDX, tr, tc, l.tileId, worldSync);
              if (!('error' in painted)) {
                ops.push(painted.cell);
                if (!engine.updateLogicTile(tr, tc, l.tileId)) {
                  engine.enableLogicGridOverlay(map.grid || []);
                  engine.updateLogicTile(tr, tc, l.tileId);
                }
              }
            });

            if (ops.length > 0) {
              store.pushPaintOp(ops);
              store.markMapDirty();
            }
            return;
          }

          if (brushMode === 'gate') {
            useEditorStore.getState().setClickedTile({ r, c });
            useEditorStore.getState().setShowWarpOverlays(true);
            if (onMapClick) onMapClick(r, c);
            showToast(`Warp Gate selected at [${r}, ${c}]. Configure in Properties or World Builder.`);
            return;
          }

          const target = resolvePaintTarget(map, activeLayerIdx);
          if (target.kind === 'unavailable') {
            showToast(target.reason);
            return;
          }

          if (onMapClick) onMapClick(r, c);

          // Shift+Click straight line rasterization (Phase 5C)
          const isShiftLine = isShiftHeldRef.current && eventType === 'down' && Boolean(store.lastPaintedTile);
          const coordsToPaint = isShiftLine && store.lastPaintedTile
            ? rasterizeLine(store.lastPaintedTile.r, store.lastPaintedTile.c, r, c)
            : [{ r, c }];

          useEditorStore.getState().setLastPaintedTile({ r, c });

          // In erase mode, write 0 (clear tile)
          const paintValue = brushMode === 'erase' ? 0 : (target.kind === 'logic' ? store.activeLogicTileId : activeBrushTileId);

          if (target.kind === 'logic') {
            const logicId = paintValue;
            const logicTiles = useGameStore.getState().logicTiles;
            if (logicId > 0 && !isPaintableLogicId(logicTiles, logicId)) {
              showToast(`Logic tile #${logicId} is not registered — pick a tag in Logic Tags first.`);
              return;
            }
            const paintedOps: any[] = [];
            for (const pt of coordsToPaint) {
              const painted = paintWorldCell(map, LOGIC_LAYER_IDX, pt.r, pt.c, logicId, worldSync);
              if (!('error' in painted)) {
                paintedOps.push(painted.cell);
                // A missing overlay means the engine was rebuilt under us; rebuild and retry.
                if (!engine.updateLogicTile(pt.r, pt.c, logicId)) {
                  engine.enableLogicGridOverlay(map.grid || []);
                  engine.updateLogicTile(pt.r, pt.c, logicId);
                }
              }
            }
            if (paintedOps.length > 0) {
              useEditorStore.getState().pushPaintOp(paintedOps);
            }
            return;
          }

          if (target.kind === 'visual' && paintValue > 0) {
            const isValidGid = map.tilesets?.some((ts: any) => ts.firstgid <= paintValue);
            if (!isValidGid) {
              showToast(`Warning: Brush GID ${paintValue} is not in any tileset.`);
            }
          }

          const paintedOps: any[] = [];
          for (const pt of coordsToPaint) {
            const painted = paintWorldCell(
              map,
              target.layerIdx,
              pt.r,
              pt.c,
              paintValue,
              worldSync
            );
            if (!('error' in painted)) {
              paintedOps.push(painted.cell);
              engine.updateSingleTile(pt.r, pt.c, paintValue, target.layerIdx, map.tilesets);
            }
          }
          if (paintedOps.length > 0) {
            useEditorStore.getState().pushPaintOp(paintedOps);
          }
        }, {
          drag: true,
          isPanActive: () => useEditorStore.getState().brushMode === 'pan' || isSpaceHeldRef.current,
          onPanStateChange: (panning) => setIsPanDragging(panning),
          onDragStart: () => {
            useEditorStore.getState().startPaintTransaction();
          },
          onDragEnd: () => {
            useEditorStore.getState().commitPaintTransaction();
          },
          onTileHover: (r, c) => {
            const store = useEditorStore.getState();
            store.setHoveredTile({ r, c });
            if ((store.brushMode === 'paste' || store.isPasting) && store.tileClipboard) {
              const clip = store.tileClipboard;
              engine.setSelectionPreview(r, c, r + clip.height - 1, c + clip.width - 1);
            } else if (store.brushMode === 'prefab' && store.activePrefabId) {
              const prefab = store.prefabs.find((p) => p.id === store.activePrefabId);
              if (prefab) {
                engine.setSelectionPreview(r, c, r + prefab.height - 1, c + prefab.width - 1);
              }
            } else if (store.brushMode === 'select') {
              if (store.selectionStart && !store.selectionEnd) {
                engine.setSelectionPreview(store.selectionStart.r, store.selectionStart.c, r, c);
              }
            }
          },
          onTileLeave: () => {
            useEditorStore.getState().setHoveredTile(null);
          },
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
             const tileId = map.grid[y]?.[x];
             if (logicTiles[tileId]?.isSolid) return false;
             
             const dynamicEntities = useGameStore.getState().mapEntities || [];
             const isStaticNpc = map.npcs?.some((npc: any) => npc.x === x && npc.y === y);
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

    return () => {
      engine.disableTilePicking();
      cleanupPan();
    };
  }, [isDevEditorOpen, activeBrushTileId, mapData, activeLayerIdx]);

    // Sync brush radius separately so we don't re-bind tile picking on every brush size change
    useEffect(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const unsub = useEditorStore.subscribe((state, prevState) => {
        engine.setBrushRadius(state.brushRadius);
        if (state.brushMode !== 'select' && prevState.brushMode === 'select') {
          engine.clearSelectionPreview();
        }
      });
      return unsub;
    }, []);

  // Undo/redo mesh sync from editor op stack
  useEffect(() => {
    const onCellsChanged = (e: Event) => {
      const engine = engineRef.current;
      const map = useGameStore.getState().activeMapData;
      if (!engine || !map) return;
      const detail = (e as CustomEvent<StudioMapCellsChangedDetail>).detail;
      if (!detail?.cells?.length) return;
      for (const cell of detail.cells) {
        if (cell.layerIdx === LOGIC_LAYER_IDX) {
          if (!engine.updateLogicTile(cell.r, cell.c, cell.value)) {
            engine.enableLogicGridOverlay(map.grid || []);
            engine.updateLogicTile(cell.r, cell.c, cell.value);
          }
        } else {
          engine.updateSingleTile(cell.r, cell.c, cell.value, cell.layerIdx, map.tilesets);
        }
      }
    };
    window.addEventListener(STUDIO_MAP_CELLS_CHANGED_EVENT, onCellsChanged);
    return () => window.removeEventListener(STUDIO_MAP_CELLS_CHANGED_EVENT, onCellsChanged);
  }, []);

  // Server map_reloaded — prefer incremental tile patches when dims unchanged
  // (avoids full remesh wiping peer meshes / paint overlays).
  useEffect(() => {
    const onHotReload = (e: Event) => {
      const engine = engineRef.current;
      const map = useGameStore.getState().activeMapData as GameMapData | null;
      if (!engine || !map?.grid) return;
      const detail = (e as CustomEvent<StudioMapHotReloadDetail>).detail;
      if (detail?.mapId && !isSameBaseMap(detail.mapId, currentMapId)) return;

      const width = map.grid[0]?.length || 24;
      const height = map.grid.length || 24;
      const prev = mapDataRef.current;
      const sameDims =
        !!prev?.grid &&
        prev.grid.length === height &&
        (prev.grid[0]?.length || 0) === width;

      if (sameDims && Array.isArray(map.tileLayers) && map.tileLayers.length > 0) {
        for (let li = 0; li < map.tileLayers.length; li++) {
          const layer = map.tileLayers[li] as any;
          const cells = layer?.grid || layer?.data || layer;
          if (!Array.isArray(cells)) continue;
          for (let r = 0; r < height; r++) {
            const row = cells[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < width; c++) {
              const gid = Number(row[c] || 0);
              engine.updateSingleTile(r, c, gid, li, map.tilesets);
            }
          }
        }
        if (Array.isArray(map.grid)) {
          engine.enableLogicGridOverlay?.(map.grid);
        }
        setMapData(map);
        mapDataRef.current = map;
        return;
      }

      engine.loadTilemap({
        id: currentMapId,
        width,
        height,
        tileSize: 1,
        tiles: map.grid,
        tileLayers: map.tileLayers,
        tilesets: map.tilesets,
        npcs: [],
      });
      // loadTilemap clears author overlays — re-seed pins/sprites.
      setMapMeshEpoch((n) => n + 1);
      setMapData(map);
      mapDataRef.current = map;
    };
    window.addEventListener(STUDIO_MAP_HOT_RELOAD_EVENT, onHotReload);
    return () => window.removeEventListener(STUDIO_MAP_HOT_RELOAD_EVENT, onHotReload);
  }, [currentMapId]);

  // Editor camera: detach follow, enable middle-mouse / Space+drag pan
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isEngineReady) return;
    engine.setEditorCameraMode(isDevEditorOpen);
    // Avatar-free authoring: hide local player while tools are open
    engine.setEntityVisible('player_main', !isDevEditorOpen);
    return () => {
      engine.setEditorCameraMode(false);
      engine.setEntityVisible('player_main', true);
    };
  }, [isDevEditorOpen, isEngineReady]);

  const showWarpOverlays = useEditorStore((s) => s.showWarpOverlays);
  const showSpawnOverlays = useEditorStore((s) => s.showSpawnOverlays);

  // Editor-only warp / NPC / spawn-pin markers (never serialized).
  // Re-run after mapMeshEpoch — loadTilemap clears author overlays.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isEngineReady) return;
    if (!isDevEditorOpen) {
      engine.clearAuthorOverlays();
      return;
    }
    const map = useGameStore.getState().activeMapData || activeMap;
    const gates = normalizeGates(map?.gates);
    const allNpcs = map?.npcs || [];
    const justNpcs = allNpcs.filter((n: any) => n.entityType !== 'spawner');
    const spawners = allNpcs.filter((n: any) => n.entityType === 'spawner');

    engine.setAuthorOverlays({
      gates: showWarpOverlays ? gates : [],
      spawnSourceGates: showSpawnOverlays ? gates : [],
      // Always show map NPC pins in Studio when Spawns is on (map JSON placements).
      npcs: showSpawnOverlays ? justNpcs : [],
      monsterSpawners: showSpawnOverlays ? spawners : [],
      showGateSpawns: showSpawnOverlays,
    });

    // Also seed entity sprites from the map doc — Studio private shards often
    // have an empty socket mapEntities snapshot, so the render-loop fallback
    // must not wait on a later store tick after remesh wiped overlays only.
    const liveW = engine.getMapWidth() || mapWidth;
    const liveH = engine.getMapHeight() || mapHeight;
    for (const npc of justNpcs) {
      if (!Number.isFinite(npc.x) || !Number.isFinite(npc.y)) continue;
      const spriteUrl = resolveEntitySpriteUrl(npc.sprite || 'adventurer', {
        kind: 'npc',
      });
      engine.updateEntity({
        id: `mapnpc_${npc.id}`,
        name: npc.name || npc.id,
        x: npc.x - liveW / 2,
        y: liveH / 2 - npc.y,
        spriteUrl,
        isPlayer: false,
        isNpc: true,
        spriteConfig: isSingleFrameSpriteUrl(spriteUrl)
          ? SINGLE_FRAME_SPRITE_CONFIG
          : undefined,
      });
    }
  }, [
    isDevEditorOpen,
    isEngineReady,
    showWarpOverlays,
    showSpawnOverlays,
    activeMap,
    activeMapData,
    mapMeshEpoch,
    mapWidth,
    mapHeight,
  ]);

  // Keyboard WASD / interact — playtest only (editor runtime keeps sim dormant)
  useEffect(() => {
    if (isDevEditorOpen) return;

    const keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false };
    let lastMoveTime = 0;
    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      
      const key = e.key.toLowerCase();
      if (key in keys) {
        keys[key as keyof typeof keys] = true;
        clearAutoWalk();
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

      if (isTryingToMove && state.gameMode === 'EXPLORING' && (now - lastMoveTime) >= 250) {
        lastMoveTime = now;
        const pos = state.player.position;
        if (pos) {
          tryMovePlayerTo(pos.x + dx, pos.y + dy);
        }
      } else if (!isTryingToMove && state.player.isMoving && (now - lastMoveTime) >= 250 && !autoWalkIntervalRef.current) {
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
  }, [isDevEditorOpen, mapWidth, mapHeight, mapData]);

  let canvasCursor = 'cursor-default';
  if (isDevEditorOpen) {
    if (isPanDragging) {
      canvasCursor = 'cursor-grabbing';
    } else if (brushMode === 'pan' || isSpaceHeld) {
      canvasCursor = 'cursor-grab';
    } else {
      canvasCursor = 'cursor-crosshair';
    }
  }

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
        className={`w-full h-full outline-none touch-none ${canvasCursor}`}
        tabIndex={0}
        onClick={(e) => (e.currentTarget as HTMLCanvasElement).focus()}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (!canvasRef.current || !engineRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          const picked = engineRef.current.pickTileAtScreenCoord(screenX, screenY);
          if (!picked) return;

          try {
            const raw = e.dataTransfer.getData('application/json');
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === 'STUDIO_SPRITE_DROP') {
              useEditorStore.getState().setClickedTile({ r: picked.r, c: picked.c });
              window.dispatchEvent(
                new CustomEvent('studio_sprite_picked', {
                  detail: { key: data.key, source: data.source },
                })
              );
              window.dispatchEvent(
                new CustomEvent('studio_sprite_dropped', {
                  detail: {
                    key: data.key,
                    source: data.source,
                    r: picked.r,
                    c: picked.c,
                  },
                })
              );
              showToast(`Sprite "${data.key}" targeted at [${picked.r}, ${picked.c}]`);
            } else if (data.type === 'STUDIO_TILE_DROP') {
              const gid = typeof data.gid === 'number' ? data.gid : activeBrushTileId;
              useEditorStore.getState().setActiveBrushTileId(gid);
              if (typeof data.layerIdx === 'number') {
                useEditorStore.getState().setActiveLayerIdx(data.layerIdx);
              }
              if (onMapClick) {
                onMapClick(picked.r, picked.c);
              }
              showToast(`Painted tile GID ${gid} at [${picked.r}, ${picked.c}]`);
            }
          } catch {}
        }}
      />
      
      {/* Quest Tracker (single instance) */}


      {/* Crafting Menu */}
      <CraftingOverlay />

      {isEngineReady && engineRef.current && (
        <FloatingHealthBars engine={engineRef.current} />
      )}
      

    </div>
  );
};

export default GameCanvasBabylon;
