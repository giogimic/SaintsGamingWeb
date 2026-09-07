'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaytestRuntime } from './PlaytestRuntime';
import { BabylonEngine, isSingleFrameSpriteUrl, SINGLE_FRAME_SPRITE_CONFIG } from '@/engine/BabylonEngine';
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
import { resolveEntitySpriteUrl, getAssetAnimationProfile } from '@/shared/game/creatureCatalog';
import { normalizeGates, upsertWarpGate, type StudioWarpGate } from '@/shared/game/logicComponents';
import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { invalidateMapCache } from '@/shared/game/mapCache';
import {
  evaluateEntityTarget,
  evaluateTileTarget,
  type WorldTarget,
} from '@/shared/game/worldTarget';
import { isInBrushShape, generateSplatScatterPoints } from '@/shared/game/brushGeometry';
import { isPointInGeometry } from '@/shared/game/geometry/continuousGeometry';
import {
  LOGIC_LAYER_IDX,
  REGION_LAYER_IDX,
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
import { ToolDispatcher } from '../editor/interaction/tools/ToolDispatcher';
import { joinWorld, startMapTransition } from '@/shared/game/lobbyWorldJoin';
import {
  mapVisualFingerprint,
  resolveMapDimensions,
  shouldAcceptMapDoc,
  shouldRemeshMapDoc,
} from '@/shared/game/mapDocVisual';
import {
  packVoxel,
  VoxelShape,
  VoxelOrientation,
  VoxelPhysics,
  VoxelLogic,
  VOXEL_MAT_GRASS,
} from '@/shared/game/voxel/VoxelWord';

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
  isolatedMapId?: string | null;
  isolatedMapData?: any | null;
  isActive?: boolean;
}

export const TileCanvasBabylon: React.FC<GameCanvasBabylonProps> = ({
  onCanvasReady,
  activeBrushTileId = 17,
  activeLayerIdx = -1,
  isDevEditorOpen = false,
  suppressGameplay = false,
  onMapClick,
  isolatedMapId,
  isolatedMapData
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<BabylonEngine | null>(null);
  const _currentMapId = useGameStore((state) => state.currentMapId);
  const _activeMapData = useGameStore((state) => state.activeMapData);
  
  const currentMapId = isolatedMapId || _currentMapId;
  const activeMapData = isolatedMapData || _activeMapData;
  
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);
  const gainSkillXp = useGameStore((state) => state.gainSkillXp);
  const combatTarget = useGameStore((state) => state.combatTarget);
  const focusedTarget = useGameStore((state) => state.focusedTarget);
  const brushMode = useEditorStore((state) => state.brushMode);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const brushShape = useEditorStore((state) => state.brushShape);
  const brushRotation = useEditorStore((state) => state.brushRotation);
  const stampScale = useEditorStore((state) => state.stampScale);
  const selectionMode = useEditorStore((state) => state.selectionMode);
  const activeBrushPattern = useEditorStore((state) => state.activeBrushPattern);
  const prefabStampMode = useEditorStore((state) => state.prefabStampMode);
  const activeLayerType = useEditorStore((state) => state.activeLayerType);
  const isStudioFreeCam = useEditorStore((state) => state.isStudioFreeCam);
  const voxelPlaneLockEnabled = useEditorStore((state) => state.voxelPlaneLockEnabled);
  const voxelTargetPlaneY = useEditorStore((state) => state.voxelTargetPlaneY);
  const voxelPlaneMask = useEditorStore((state) => state.voxelPlaneMask);
  const voxelBuildUpMode = useEditorStore((state) => state.voxelBuildUpMode);
  const activeVoxelBrushAxis = useEditorStore((state) => state.activeVoxelBrushAxis);
  const activeVoxelShape = useEditorStore((state) => state.activeVoxelShape);
  const activeVoxelOrientation = useEditorStore((state) => state.activeVoxelOrientation);
  const activeVoxelMaterialId = useEditorStore((state) => state.activeVoxelMaterialId);
  const showGizmo = useEditorStore((state) => state.showGizmo);
  
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const isSpaceHeldRef = useRef(false);
  isSpaceHeldRef.current = isSpaceHeld;
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const isShiftHeldRef = useRef(false);
  isShiftHeldRef.current = isShiftHeld;
  const toolDispatcherRef = useRef<ToolDispatcher>(new ToolDispatcher());

  useEffect(() => {
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isDevEditorOpen) return;
    const handleToggleLayerDim = () => {
      if (engineRef.current) {
        const store = useEditorStore.getState();
        const active = engineRef.current.toggleLayerIsolation(store.activeLayerIdx);
        showToast(active ? `Layer Isolation Active (Layer ${store.activeLayerIdx})` : 'Layer Isolation Off');
      }
    };
    const handlePointerUp = () => {
      if (freeformStrokeBeforeRef.current) {
        const currentFreeform = useGameStore.getState().activeMapData?.freeformLayers || [];
        useEditorStore.getState().pushFreeformOp(freeformStrokeBeforeRef.current, currentFreeform);
        freeformStrokeBeforeRef.current = null;
      }
    };
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('studio_toggle_layer_dim', handleToggleLayerDim);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('studio_toggle_layer_dim', handleToggleLayerDim);
    };
  }, [isDevEditorOpen, showToast]);

  const interpBufferRef = useRef<Record<string, { fromX: number; fromY: number; toX: number; toY: number; startTime: number; duration: number }>>({});
  const autoWalkPathRef = useRef<{x: number, y: number}[]>([]);
  const freeformStrokeBeforeRef = useRef<any[] | null>(null);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const playerAnimationProfileRef = useRef<string | null>(null);
  const lastassetProfileIdRef = useRef<string | null>(null);
  const multiplayerAnimationProfilesRef = useRef<Map<string, string | null>>(new Map());
  const entityAnimationProfilesRef = useRef<Map<string, string | null>>(new Map());
  const tryMoveDirectionRef = useRef<(dx: number, dy: number) => void>(() => {});
  const handleInteractRef = useRef<() => void>(() => {});
  const editorToolsRef = useRef(isDevEditorOpen);
  editorToolsRef.current = isDevEditorOpen;

  // Authoritative map state from the global game store
  const mapData = activeMapData as GameMapData | null;
  const mapDataRef = useRef<GameMapData | null>(null);
  mapDataRef.current = mapData;

  // Fetch animationProfile when player assetProfileId changes
  const playerassetProfileId = useGameStore((s) => s.player?.assetProfileId);
  useEffect(() => {
    if (playerassetProfileId && playerassetProfileId !== lastassetProfileIdRef.current) {
      lastassetProfileIdRef.current = playerassetProfileId;
      
      // Fetch animationProfile from asset metadata
      getAssetAnimationProfile(playerassetProfileId).then((profile) => {
        playerAnimationProfileRef.current = profile;
      });
    }
  }, [playerassetProfileId]);
  /** Last doc whose tile geometry was pushed into Babylon (identity + fingerprint). */
  const lastLoadedMapDataRef = useRef<GameMapData | null>(null);
  const lastVisualFingerprintRef = useRef<string>('');
  /** Bumped after every loadTilemap so author overlays re-attach (load clears them). */
  const [mapMeshEpoch, setMapMeshEpoch] = useState(0);

  const clearAutoWalk = useCallback(() => {
    autoWalkPathRef.current = [];
    const state = useGameStore.getState();
    if (state.player.isMoving) {
      state.setPlayerPosition(state.player.position, state.player.direction, false);
    }
    engineRef.current?.clearDestinationIndicator();
  }, []);

  // Ensure current map is loaded into store when map ID changes
  useEffect(() => {
    const store = useGameStore.getState();
    if (store.activeMapData && shouldKeepActiveMapData(store.activeMapData, currentMapId)) {
      setIsEngineReady(true);
      return;
    }

    setIsEngineReady(false);
    let isCancelled = false;
    loadMap(currentMapId)
      .then((data) => {
        if (isCancelled) return;
        const ensured = ensureMapHasStudioTilesets(data);
        useGameStore.getState().setActiveMapData(ensured);
        setIsEngineReady(true);
      })
      .catch(() => {
        if (isCancelled) return;
        const fallback = ensureMapHasStudioTilesets({
          id: currentMapId,
          name: currentMapId.replace(/_/g, ' '),
          width: 30,
          height: 30,
          grid: Array(30).fill(0).map(() => Array(30).fill(0)),
          tileLayers: [],
          tilesets: [],
          gates: {},
          npcs: [],
          encounters: [],
        });
        useGameStore.getState().setActiveMapData(fallback);
        setIsEngineReady(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentMapId]);

  // Derive dimensions — tileLayers first (see resolveMapDimensions), then grid / meta.
  const activeMap = mapData as GameMapData | null;
  const { width: mapWidth, height: mapHeight } = resolveMapDimensions(activeMap || undefined);

  // Unified Movement Execution Engine
  babylonEngine.renderer.startRenderLoop(() => {
      // (Live MMO rendering is now handled by PlaytestRuntime via onBeforeRenderObservable)
    });

    return () => {
      babylonEngine.dispose();
      engineRef.current = null;
      lastLoadedMapDataRef.current = null;
      lastVisualFingerprintRef.current = '';
      if (typeof window !== 'undefined' && (window as any).__babylonEngine === babylonEngine) {
        (window as any).__babylonEngine = null;
      }
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
      tileLayers: mapData.mapType === 'VOXEL' ? [] : mapData.tileLayers,
      tilesets: mapData.tilesets,
      npcs: [],
      chunks: mapData.chunks,
      connections: mapData.connections,
      freeformLayers: mapData.freeformLayers,
      voxelDoc: mapData.mapType === 'TILE' ? null : mapData.voxelDoc,
      blockSizePx: mapData.blockSizePx,
      mapType: mapData.mapType,
    });
    setMapMeshEpoch((n) => n + 1);
    if (editorToolsRef.current) {
      engineRef.current.renderer.fitMapInView();
    }
  }, [mapData, currentMapId]);

  // Handle Combat & Focus Target Selection Ring
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const targetId =
      combatTarget?.entityId ||
      (focusedTarget && focusedTarget.kind !== 'tile'
        ? (focusedTarget as any).id || (focusedTarget as any).entityId
        : null);
    engine.updateSelectionRing(targetId ?? null);
  }, [combatTarget?.entityId, focusedTarget]);

  // Studio Center Camera Event Listener
  useEffect(() => {
    const handleCenterCamera = (e: Event) => {
      const customEv = e as CustomEvent<{ r: number; c: number }>;
      const { r, c } = customEv.detail || {};
      if (typeof r === 'number' && typeof c === 'number' && engineRef.current) {
        engineRef.current.input.panEditorCameraToTile(r, c);
      }
    };
    
    const handleGizmoDragEnd = (e: Event) => {
      const customEv = e as CustomEvent<{ minWX: number; minWY: number; minWZ: number; maxWX: number; maxWY: number; maxWZ: number }>;
      const { minWX, minWY, minWZ, maxWX, maxWY, maxWZ } = customEv.detail || {};
      if (typeof minWX === 'number' && typeof maxWX === 'number') {
        useEditorStore.getState().setSelectionStart({ r: minWZ, c: minWX });
        useEditorStore.getState().setSelectionEnd({ r: maxWZ, c: maxWX });
      }
    };

    window.addEventListener('studio_center_camera', handleCenterCamera);
    window.addEventListener('studio_voxel_selection_gizmo_drag_end', handleGizmoDragEnd);
    return () => {
      window.removeEventListener('studio_center_camera', handleCenterCamera);
      window.removeEventListener('studio_voxel_selection_gizmo_drag_end', handleGizmoDragEnd);
    };
  }, []);

  // Handle Combat Projectile & HP Events
  useEffect(() => {
    const handleCombatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const data = customEvent.detail;
      const engine = engineRef.current;
      if (engine && data.attackerId && data.targetId) {
        const store = useGameStore.getState();
        
        // Map backend IDs (like accountIds) to Babylon mesh IDs
        const resolveEngineId = (id: string) => {
          if (!id) return id;
          if (store.player && store.player.accountId === id) return 'player_main';
          if (id === 'player_main') return id;
          
          for (const socketId of Object.keys(store.otherPlayers || {})) {
            if (store.otherPlayers[socketId]?.accountId === id) {
              return `multiplayer_${socketId}`;
            }
          }
          
          if (store.mapEntities?.some((e) => e.id === id)) return id;
          if (store.activeMapData?.npcs?.some((n: any) => n.id === id)) return `mapnpc_${id}`;
          
          return id;
        };

        const engineAttackerId = resolveEngineId(data.attackerId);
        const engineTargetId = resolveEngineId(data.targetId);

        // Fire projectile
        engine.renderProjectile(engineAttackerId, engineTargetId, 'fireball', 500); // 500ms cast/travel time
        
        // Show damage text slightly delayed to match projectile impact
        setTimeout(() => {
          engine.renderDamageText(engineTargetId, data.damage, data.isCrit);
          if (data.isCrit) {
            soundSynth?.playCriticalHit?.();
          } else if (data.damage > 0) {
            soundSynth?.playCombatHit?.();
          }
          
          // Update HP in store (which will then flow to Babylon Engine via mapData subscription)
          if (data.attackerHp !== undefined) {
            store.updateEntityHp(data.attackerId, data.attackerHp);
          }
          if (data.targetHp !== undefined) {
            store.updateEntityHp(data.targetId, data.targetHp);
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

    if (activeLayerIdx === REGION_LAYER_IDX) {
      engine.enableRegionGridOverlay(activeMap?.regions || []);
    } else {
      engine.disableRegionGridOverlay();
    }
  }, [activeLayerIdx, mapData, activeMap]);

  // Sync live dev editor brush, voxel constraints, and view settings without tearing down picking listeners
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setBrushRadius(brushRadius);
    engine.setBrushShape(brushShape);
    engine.setBrushRotation(brushRotation);
    engine.setStampScale(stampScale || 1);
    engine.setActiveBrushTileId(activeBrushTileId);
    engine.setActiveBrushPattern(activeBrushPattern);
    engine.setPrefabStampMode(prefabStampMode);
    engine.setActiveLayerIdx(activeLayerIdx);
    engine.setActiveLayerType(activeLayerType);
    engine.setBrushMode(brushMode);
    engine.renderer.setFreeCam(isStudioFreeCam);
    engine.voxel.setVoxelConstraints({
      planeLockEnabled: voxelPlaneLockEnabled,
      targetPlaneY: voxelTargetPlaneY,
      planeMask: voxelPlaneMask,
      buildUpMode: voxelBuildUpMode,
      brushAxis: activeVoxelBrushAxis,
      brushRadius,
      brushShape,
      previewWord: packVoxel(
        activeVoxelMaterialId ?? VOXEL_MAT_GRASS,
        (activeVoxelShape as any) ?? VoxelShape.FULL_CUBE,
        (activeVoxelOrientation as any) ?? VoxelOrientation.NORTH,
        0,
        VoxelPhysics.SOLID_OBSTACLE,
        VoxelLogic.NONE
      ),
    });
    engine.setSelectionGizmoVisibility(showGizmo);
    engine.refreshBrushPreview();
  }, [
    brushRadius,
    brushShape,
    brushRotation,
    stampScale,
    activeBrushTileId,
    activeBrushPattern,
    prefabStampMode,
    activeLayerIdx,
    activeLayerType,
    brushMode,
    isStudioFreeCam,
    voxelPlaneLockEnabled,
    voxelTargetPlaneY,
    voxelPlaneMask,
    voxelBuildUpMode,
    activeVoxelBrushAxis,
    activeVoxelShape,
    activeVoxelOrientation,
    activeVoxelMaterialId,
    showGizmo,
    isStudioFreeCam,
  ]);

  // Handle Live Dev Editor Tile Picking & Click-to-Move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !activeMap) return;
    const map = activeMap;

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
        cleanupPan = engine.input.startEditorKeyboardPan() || (() => {});
        engine.input.enableTilePicking((r, c, _, eventType, point, voxelTarget) => {
          const map = useGameStore.getState().activeMapData || activeMap;
          const store = useEditorStore.getState();
          const { brushMode, setSelectionStart, setSelectionEnd, activePrefabId, activeLayerIdx: curLayerIdx } = store;

          if (brushMode === 'pan') {
            return;
          }

          if (brushMode === 'eyedropper') {
            const rawEv = typeof window !== 'undefined' ? ((window.event as MouseEvent) || null) : null;
            const validEventType = eventType || 'down';
            const toolContext = { engine, mapData: map, showToast };
            const toolEvent = {
              eventType: validEventType,
              button: rawEv?.button ?? 0,
              tilePos: { r, c },
              worldPos: { x: point?.x ?? c + 0.5, y: 0, z: point?.z ?? r + 0.5 },
              voxelTarget,
              rawEvent: rawEv || ({} as any),
              isShift: Boolean(rawEv?.shiftKey),
              isCtrl: Boolean(rawEv?.ctrlKey || rawEv?.metaKey),
              isAlt: Boolean(rawEv?.altKey),
              isSpace: isSpaceHeldRef.current,
            };
            toolDispatcherRef.current.setActiveTool('eyedropper', toolContext);
            if (validEventType === 'down') {
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            }
            return;
          }

          if (brushMode === 'select') {
            const isShift = (window.event as MouseEvent)?.shiftKey;
            const isAlt = (window.event as MouseEvent)?.altKey;
            const isCtrl = (window.event as MouseEvent)?.ctrlKey || (window.event as MouseEvent)?.metaKey;
            const selMode = store.selectionMode || 'box';
            const mode = isAlt || isCtrl ? 'subtract' : isShift ? 'add' : 'normal';

            if (selMode === 'magic-wand') {
              if (eventType === 'down') {
                const layerIdx = store.activeLayerIdx;
                const targetGrid = layerIdx === -1 ? map?.grid : map?.tileLayers?.[layerIdx]?.grid;
                if (!targetGrid) return;
                const gh = targetGrid.length;
                const gw = targetGrid[0]?.length || 0;
                if (r < 0 || r >= gh || c < 0 || c >= gw) return;
                const targetVal = targetGrid[r][c];

                // 4-way BFS flood fill
                const visited = new Set<string>();
                const queue: Array<{ r: number; c: number }> = [{ r, c }];
                visited.add(`${r},${c}`);
                const selectedList: Array<{ r: number; c: number }> = [];

                while (queue.length > 0) {
                  const cur = queue.shift()!;
                  selectedList.push(cur);
                  const neighbors = [
                    { r: cur.r - 1, c: cur.c },
                    { r: cur.r + 1, c: cur.c },
                    { r: cur.r, c: cur.c - 1 },
                    { r: cur.r, c: cur.c + 1 },
                  ];
                  for (const nb of neighbors) {
                    if (nb.r >= 0 && nb.r < gh && nb.c >= 0 && nb.c < gw) {
                      const k = `${nb.r},${nb.c}`;
                      if (!visited.has(k) && targetGrid[nb.r][nb.c] === targetVal) {
                        visited.add(k);
                        queue.push(nb);
                      }
                    }
                  }
                }

                if (mode === 'subtract') {
                  const remaining = { ...(store.selectedCells || {}) };
                  selectedList.forEach((pt) => {
                    delete remaining[`${pt.r},${pt.c}`];
                  });
                  store.setSelectedCells(remaining);
                  engine.setMultiSelectionPreview(remaining);
                } else if (mode === 'add') {
                  const combined = { ...(store.selectedCells || {}) };
                  selectedList.forEach((pt) => {
                    combined[`${pt.r},${pt.c}`] = true;
                  });
                  store.setSelectedCells(combined);
                  engine.setMultiSelectionPreview(combined);
                } else {
                  const mapCells: Record<string, boolean> = {};
                  selectedList.forEach((pt) => {
                    mapCells[`${pt.r},${pt.c}`] = true;
                  });
                  store.setSelectedCells(mapCells);
                  engine.setMultiSelectionPreview(mapCells);
                }
                showToast(`Magic Wand selected ${selectedList.length} connected tiles`);
              }
              return;
            }

            const toolContext = {
              engine,
              mapData: map,
              showToast,
            };
            const rawEv = typeof window !== 'undefined' ? ((window.event as MouseEvent) || null) : null;
            const validEventType = eventType || 'down';
            const toolEvent = {
              eventType: validEventType,
              button: rawEv?.button ?? 0,
              tilePos: { r, c },
              worldPos: { x: point?.x ?? c + 0.5, y: 0, z: point?.z ?? r + 0.5 },
              voxelTarget,
              rawEvent: rawEv || ({} as any),
              isShift: Boolean(isShift),
              isCtrl: Boolean(isCtrl),
              isAlt: Boolean(isAlt),
              isSpace: isSpaceHeldRef.current,
            };
            toolDispatcherRef.current.setActiveTool('select', toolContext);
            if (validEventType === 'down') {
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            } else if (validEventType === 'move') {
              toolDispatcherRef.current.dispatchPointerMove(toolEvent, toolContext);
            } else if (validEventType === 'up') {
              toolDispatcherRef.current.dispatchPointerUp(toolEvent, toolContext);
            }
            return;
          }

          if (brushMode === 'paste' || store.isPasting) {
            const rawEv = typeof window !== 'undefined' ? ((window.event as MouseEvent) || null) : null;
            const validEventType = eventType || 'down';
            const toolContext = { engine, mapData: map, showToast };
            const toolEvent = {
              eventType: validEventType,
              button: rawEv?.button ?? 0,
              tilePos: { r, c },
              worldPos: { x: point?.x ?? c + 0.5, y: 0, z: point?.z ?? r + 0.5 },
              voxelTarget,
              rawEvent: rawEv || ({} as any),
              isShift: Boolean(rawEv?.shiftKey),
              isCtrl: Boolean(rawEv?.ctrlKey || rawEv?.metaKey),
              isAlt: Boolean(rawEv?.altKey),
              isSpace: isSpaceHeldRef.current,
            };
            toolDispatcherRef.current.setActiveTool('paste', toolContext);
            if (validEventType === 'down') {
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            }
            return;
          }

          if (brushMode === 'prefab') {
            const rawEv = typeof window !== 'undefined' ? ((window.event as MouseEvent) || null) : null;
            const validEventType = eventType || 'down';
            const toolContext = { engine, mapData: map, showToast };
            const toolEvent = {
              eventType: validEventType,
              button: rawEv?.button ?? 0,
              tilePos: { r, c },
              worldPos: { x: point?.x ?? c + 0.5, y: 0, z: point?.z ?? r + 0.5 },
              voxelTarget,
              rawEvent: rawEv || ({} as any),
              isShift: Boolean(rawEv?.shiftKey),
              isCtrl: Boolean(rawEv?.ctrlKey || rawEv?.metaKey),
              isAlt: Boolean(rawEv?.altKey),
              isSpace: isSpaceHeldRef.current,
            };
            toolDispatcherRef.current.setActiveTool('prefab', toolContext);
            if (validEventType === 'down') {
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            }
            return;
          }

          // Handling Entity Placement from Entity Library
          if (store.pendingEntityPlacement) {
            const validEventType = eventType || 'down';
            if (validEventType === 'down') {
              const pending = store.pendingEntityPlacement;
              const destX = c;
              const destY = r;
              
              const newId = `${pending.kind}_${Date.now()}`;
              
              const newEntity = {
                id: newId,
                name: pending.kind === 'npc' ? 'New NPC' : 'New Entity',
                x: destX,
                y: destY,
                kind: pending.kind,
                assetProfileId: pending.assetProfileId
              };
              
              const updatedMap = { ...map, npcs: [...(map.npcs || []), newEntity] };
              
              useGameStore.setState({ activeMapData: updatedMap });
              store.markMapDirty();
              store.setPendingEntityPlacement(null);
              
              // Select the new entity and open the NPC editor
              setTimeout(() => {
                store.openPanel('npc');
                window.dispatchEvent(new CustomEvent('studio_npc_selected', { detail: { id: newId } }));
              }, 100);
              
              showToast(`Placed ${pending.kind} at [${destX}, ${destY}]. Configure properties in panel.`);
            }
            return;
          }

          // Handling Destination Point Placement for Two-Ended Gate Pairing
          if (store.pendingGateConnection) {
            const pending = store.pendingGateConnection;
            const destX = c;
            const destY = r;
            const destMapId = map.id || pending.targetMapId;

            // 1. Create destination gate (placed on currently open destination map)
            const destGate: StudioWarpGate = {
              id: `gate_${destX}_${destY}`,
              position: { x: destX, y: destY },
              width: pending.originSize.w,
              height: pending.originSize.h,
              targetMapId: pending.originMapId,
              spawnPoint: { x: pending.originPosition.x, y: pending.originPosition.y },
              targetGateId: pending.originGateId,
              category: pending.category,
              name: pending.name ? `${pending.name} (Return)` : undefined,
              bidirectional: pending.bidirectional,
            };

            const nextDestGates = upsertWarpGate(map.gates, destGate);
            const updatedDestMap = { ...map, gates: nextDestGates };

            // Save destination map directly to server
            try {
              fetch(`/api/maps/${encodeURIComponent(toBaseMapId(destMapId))}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stripEditorOverlaysFromMapPayload({
                  name: updatedDestMap.name || destMapId,
                  gameId: updatedDestMap.gameId,
                  grid: updatedDestMap.grid,
                  gates: nextDestGates,
                  npcs: updatedDestMap.npcs || [],
                  encounterPool: updatedDestMap.encounterPool || [],
                  tileLayers: updatedDestMap.tileLayers || [],
                  tilesets: updatedDestMap.tilesets || [],
                })),
              }).catch((e) => console.error('Failed to save destination gate:', e));
              invalidateMapCache(toBaseMapId(destMapId));
            } catch (e) {
              console.error(e);
            }

            // 2. Clear pending state and return user to origin map
            store.setPendingGateConnection(null);
            showToast(`Linking to ${pending.originMapId}...`);

            loadMap(pending.originMapId).then((rawOrigin) => {
              const loadedOrigin = ensureMapHasStudioTilesets(rawOrigin);
              const originGate: StudioWarpGate = {
                id: pending.originGateId,
                position: pending.originPosition,
                width: pending.originSize.w,
                height: pending.originSize.h,
                targetMapId: destMapId,
                spawnPoint: { x: destX, y: destY },
                targetGateId: destGate.id,
                category: pending.category,
                name: pending.name,
                bidirectional: pending.bidirectional,
              };

              const nextOriginGates = upsertWarpGate(loadedOrigin.gates, originGate);
              const updatedOrigin = { ...loadedOrigin, gates: nextOriginGates };

              useGameStore.setState({ currentMapId: pending.originMapId, activeMapData: updatedOrigin });
              useEditorStore.getState().openMapInTab(pending.originMapId);
              useEditorStore.getState().markMapDirty();
              useEditorStore.getState().setShowWarpOverlays(true);
              window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: updatedOrigin } }));

              // Also persist origin map save
              fetch(`/api/maps/${encodeURIComponent(toBaseMapId(pending.originMapId))}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stripEditorOverlaysFromMapPayload({
                  name: updatedOrigin.name || pending.originMapId,
                  gameId: updatedOrigin.gameId,
                  grid: updatedOrigin.grid,
                  gates: nextOriginGates,
                  npcs: updatedOrigin.npcs || [],
                  encounterPool: updatedOrigin.encounterPool || [],
                  tileLayers: updatedOrigin.tileLayers || [],
                  tilesets: updatedOrigin.tilesets || [],
                })),
              }).catch((e) => console.error('Failed to save origin gate:', e));
              invalidateMapCache(toBaseMapId(pending.originMapId));

              showToast(`✦ Connected ${pending.originMapId} ↔ ${destMapId} at [${destX}, ${destY}]!`);
            }).catch((err) => {
              console.error('Failed to reload origin map:', err);
              showToast(`Connected gates, but failed to return to ${pending.originMapId}: ${err?.message}`);
            });

            return;
          }

          if (brushMode === 'gate') {
            useEditorStore.getState().setClickedTile({ r, c });
            useEditorStore.getState().setShowWarpOverlays(true);
            if (onMapClick) onMapClick(r, c);
            showToast(`Warp Gate selected at [${r}, ${c}]. Configure in Properties or World Builder.`);
            return;
          }

          const liveMap = useGameStore.getState().activeMapData || map;

          const rawEv = typeof window !== 'undefined' ? ((window.event as MouseEvent) || null) : null;
          const validEventType = eventType || 'down';
          const toolContext = { engine, mapData: liveMap, showToast };
          const toolEvent = {
            eventType: validEventType,
            button: rawEv?.button ?? 0,
            tilePos: { r, c },
            worldPos: { x: point?.x ?? c + 0.5, y: 0, z: point?.z ?? r + 0.5 },
            voxelTarget,
            rawEvent: rawEv || ({} as any),
            isShift: Boolean(rawEv?.shiftKey),
            isCtrl: Boolean(rawEv?.ctrlKey || rawEv?.metaKey),
            isAlt: Boolean(rawEv?.altKey),
            isSpace: isSpaceHeldRef.current,
          };

          if (brushMode === 'fill') {
            if (validEventType === 'down') {
              toolDispatcherRef.current.setActiveTool('fill', toolContext);
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            }
            return;
          }

          if (brushMode === 'paint' || brushMode === 'erase' || brushMode === 'shape' || brushMode === 'extrude' || brushMode === 'smooth') {
            const toolId = brushMode === 'erase' ? 'eraser' : brushMode === 'shape' ? 'shape' : brushMode === 'extrude' ? 'extrude' : brushMode === 'smooth' ? 'smooth' : 'brush';
            toolDispatcherRef.current.setActiveTool(toolId, toolContext);
            if (validEventType === 'down') {
              toolDispatcherRef.current.dispatchPointerDown(toolEvent, toolContext);
            } else if (validEventType === 'move') {
              toolDispatcherRef.current.dispatchPointerMove(toolEvent, toolContext);
            } else if (validEventType === 'up') {
              toolDispatcherRef.current.dispatchPointerUp(toolEvent, toolContext);
            }
            return;
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
          onTileHover: (r, c, voxelTarget) => {
            const store = useEditorStore.getState();
            store.setHoveredTile({ r, c });
            if (voxelTarget) {
              store.setHoveredVoxel(voxelTarget.voxelCoord);
            } else {
              store.setHoveredVoxel(null);
            }
            if ((store.brushMode === 'paste' || store.isPasting) && store.tileClipboard) {
              engine.setActionPreview(store.tileClipboard, r, c);
            } else if (store.brushMode === 'prefab' && store.activePrefabId) {
              const prefab = store.prefabs.find((p) => p.id === store.activePrefabId);
              if (prefab) {
                engine.setActionPreview(prefab, r, c);
              }
            } else if (store.brushMode === 'select') {
              if (store.selectionStart && !store.selectionEnd) {
                engine.setSelectionPreview(store.selectionStart.r, store.selectionStart.c, r, c);
              }
            } else {
              engine.clearActionPreview();
            }
          },
          onTileLeave: () => {
            const store = useEditorStore.getState();
            store.setHoveredTile(null);
            store.setHoveredVoxel(null);
            engine.clearActionPreview();
            engine.voxel.clearVoxelCursor();
          },
        });
    } else {
      // Spatial Interaction & Targeting in exploration mode
      engine.input.enableTilePicking(
        (r, c, _layerIdx, eventType, point) => {
          if (eventType && eventType !== 'down') return;
          const currentPos = useGameStore.getState().player?.position;
          if (!currentPos) return;

          const picked = engine.input.pickWorldTarget();
          const dynamicEntities = useGameStore.getState().mapEntities || [];
          const logicTiles = useGameStore.getState().logicTiles;

          if (picked && picked.kind === 'entity' && picked.entityId) {
            let entityObj = dynamicEntities.find((e) => e.id === picked.entityId);
            if (!entityObj && map.npcs) {
              const staticNpc = map.npcs.find((n: any) => `npc_${n.id}` === picked.entityId || n.id === picked.entityId);
              if (staticNpc) {
                entityObj = {
                  id: picked.entityId,
                  name: staticNpc.name || staticNpc.id,
                  type: 'NPC',
                  position: { x: staticNpc.x, y: staticNpc.y },
                  components: {
                    identity: { id: picked.entityId, name: staticNpc.name || staticNpc.id },
                    dialogue: { dialogueKey: staticNpc.dialogueKey || 'default' },
                    interact: { enabled: true },
                  },
                } as any;
              }
            }

            if (entityObj) {
              const worldTarget = evaluateEntityTarget({
                entity: entityObj as any,
                playerPos: currentPos,
              });

              useGameStore.getState().setFocusedTarget(worldTarget);
              engine.setGroundTargetRing(worldTarget, worldTarget.kind === 'creature' ? 'combat' : 'focus');

              if (worldTarget.interactable && worldTarget.primaryAction) {
                soundSynth?.playUiClick?.();
                if (worldTarget.primaryAction.type === 'TALK') {
                  const payload = worldTarget.primaryAction.payload;
                  window.dispatchEvent(
                    new CustomEvent('open_dialogue', {
                      detail: {
                        speaker: worldTarget.name,
                        text: `Greetings, traveler! I am ${worldTarget.name}.`,
                        dialogueKey: payload?.dialogueKey,
                      },
                    })
                  );
                }
                return;
              }
            }
          }

          // Otherwise, ground click / navigation
          const isWalkable = (x: number, y: number) => {
            const tileId = map.grid[y]?.[x];
            if (logicTiles[tileId]?.isSolid) return false;
            if (engine.voxel.voxelWorld) {
              const wz = mapHeight - 1 - y;
              let targetWY = 15;
              for (let wy = engine.voxel.voxelWorld?.totalHeightBlocks - 1; wy >= 0; wy--) {
                const w = engine.voxel.voxelWorld?.getVoxel(x, wy, wz);
                if (w && (w & 0xfff) !== 0) {
                  targetWY = wy;
                  break;
                }
              }
              const overheadWord = engine.voxel.voxelWorld?.getVoxel(x, targetWY + 1, wz);
              const overheadPhys = (overheadWord >>> 24) & 0xf;
              if (overheadWord && (overheadPhys === 1 || overheadPhys === 5)) return false;

              const groundWord = engine.voxel.voxelWorld?.getVoxel(x, targetWY, wz);
              if (!groundWord || (groundWord & 0xfff) === 0) return false;
              const groundPhys = (groundWord >>> 24) & 0xf;
              if (groundPhys === 5) return false; // Hazard
            }
            const isStaticNpc = map.npcs?.some((npc: any) => npc.x === x && npc.y === y);
            const isDynamicNpc = dynamicEntities.some(
              (e) => Math.round(e.position.x) === x && Math.round(e.position.y) === y && (e.mapId === currentMapId || !e.mapId)
            );
            return !isStaticNpc && !isDynamicNpc;
          };

          const targetIsSolid = !isWalkable(c, r);
          engine.setDestinationIndicator(c, r, !targetIsSolid);

          if (targetIsSolid) {
            soundSynth?.playUiClick?.();
            return;
          }

          const dist = Math.abs(c - currentPos.x) + Math.abs(r - currentPos.y);
          if (dist === 1) {
            clearAutoWalk();
            tryMovePlayerTo(c, r);
          } else {
            const path = findPath(currentPos.x, currentPos.y, c, r, mapWidth, mapHeight, isWalkable);
            if (path.length > 0) {
              clearAutoWalk();
              autoWalkPathRef.current = path;
              const nextStep = autoWalkPathRef.current.shift()!;
              tryMovePlayerTo(nextStep.x, nextStep.y);
            }
          }
        },
        {
          onTileHover: (r, c) => {
            const currentPos = useGameStore.getState().player?.position;
            if (!currentPos) return;

            const picked = engine.input.pickWorldTarget();
            const dynamicEntities = useGameStore.getState().mapEntities || [];
            const logicTiles = useGameStore.getState().logicTiles;

            if (picked && picked.kind === 'entity' && picked.entityId) {
              let entityObj = dynamicEntities.find((e) => e.id === picked.entityId);
              if (!entityObj && map.npcs) {
                const staticNpc = map.npcs.find((n: any) => `npc_${n.id}` === picked.entityId || n.id === picked.entityId);
                if (staticNpc) {
                  entityObj = {
                    id: picked.entityId,
                    name: staticNpc.name || staticNpc.id,
                    type: 'NPC',
                    position: { x: staticNpc.x, y: staticNpc.y },
                    components: {
                      identity: { id: picked.entityId, name: staticNpc.name || staticNpc.id },
                      dialogue: { dialogueKey: staticNpc.dialogueKey || 'default' },
                      interact: { enabled: true },
                    },
                  } as any;
                }
              }

              if (entityObj) {
                const target = evaluateEntityTarget({
                  entity: entityObj as any,
                  playerPos: currentPos,
                });
                useGameStore.getState().setHoveredTarget(target);
                engine.setGroundTargetRing(target, target.kind === 'creature' ? 'combat' : 'hover');
                engine.clearDestinationIndicator();
                return;
              }
            }

            // Tile hover
            const tileId = map.grid[r]?.[c];
            const isSolid = Boolean(logicTiles[tileId]?.isSolid);
            const normalizedGates = normalizeGates(map.gates);
            const gate = normalizedGates.find((g) => g.position.x === c && g.position.y === r);
            const tileTarget = evaluateTileTarget({
              r,
              c,
              playerPos: currentPos,
              isSolid,
              warpGate: gate,
            });

            useGameStore.getState().setHoveredTarget(tileTarget);
            engine.setDestinationIndicator(c, r, !isSolid);

            const focused = useGameStore.getState().focusedTarget;
            if (focused) {
              engine.setGroundTargetRing(focused, focused.kind === 'creature' ? 'combat' : 'focus');
            } else {
              engine.setGroundTargetRing(null);
            }
          },
          onTileLeave: () => {
            useGameStore.getState().setHoveredTarget(null);
            engine.clearDestinationIndicator();
            const focused = useGameStore.getState().focusedTarget;
            if (focused) {
              engine.setGroundTargetRing(focused, focused.kind === 'creature' ? 'combat' : 'focus');
            } else {
              engine.setGroundTargetRing(null);
            }
          },
        }
      );
    }

    return () => {
      engine.input.disableTilePicking();
      cleanupPan();
    };
  }, [isDevEditorOpen, currentMapId]);

  // Contextual interaction key listener ('E' or 'Space')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.code === 'KeyE' || e.code === 'Space') {
        const state = useGameStore.getState();
        const target = state.focusedTarget || state.hoveredTarget;
        if (target && target.interactable && target.primaryAction && target.primaryAction.enabled) {
          e.preventDefault();
          soundSynth?.playUiClick?.();
          const action = target.primaryAction;
          if (action.type === 'TALK') {
            window.dispatchEvent(
              new CustomEvent('open_dialogue', {
                detail: {
                  speaker: target.name,
                  text: `Greetings! How may I assist you today?`,
                  dialogueKey: action.payload?.dialogueKey,
                },
              })
            );
          } else if (action.type === 'WARP') {
            const gate = action.payload?.warpGate as any;
            if (gate?.targetMapId) {
              const curPos = state.player?.position || { x: 12, y: 12 };
              const destSpawn = gate.targetSpawn || gate.spawnPoint || { x: gate.targetX ?? curPos.x, y: gate.targetY ?? curPos.y };
              state.changeMap(gate.targetMapId, destSpawn);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

     // Sync brush radius and modes separately so we don't re-bind tile picking on every brush size/mode change
    useEffect(() => {
      const engine = engineRef.current;
      if (!engine) return;
      const unsub = useEditorStore.subscribe((state, prevState) => {
        if (state.brushRadius !== prevState.brushRadius) {
          engine.setBrushRadius(state.brushRadius);
          engine.refreshBrushPreview();
        }
        if (state.brushShape !== prevState.brushShape) {
          engine.setBrushShape(state.brushShape);
          engine.refreshBrushPreview();
        }
        if (state.brushRotation !== prevState.brushRotation) {
          engine.setBrushRotation(state.brushRotation);
          engine.refreshBrushPreview();
        }
        if (state.stampScale !== prevState.stampScale) {
          engine.setStampScale(state.stampScale || 1);
          engine.refreshBrushPreview();
        }
        if (state.activeBrushTileId !== prevState.activeBrushTileId) {
          engine.setActiveBrushTileId(state.activeBrushTileId);
          engine.refreshBrushPreview();
        }
        if (state.activeBrushPattern !== prevState.activeBrushPattern) {
          engine.setActiveBrushPattern(state.activeBrushPattern);
          engine.refreshBrushPreview();
        }
        if (state.prefabStampMode !== prevState.prefabStampMode) {
          engine.setPrefabStampMode(state.prefabStampMode);
          engine.refreshBrushPreview();
        }
        if (state.activeLayerIdx !== prevState.activeLayerIdx) {
          engine.setActiveLayerIdx(state.activeLayerIdx);
          engine.refreshBrushPreview();
        }
        if (state.isStudioFreeCam !== prevState.isStudioFreeCam) {
          engine.renderer.setFreeCam(state.isStudioFreeCam);
        }
        if (state.brushMode !== prevState.brushMode) {
          engine.setBrushMode(state.brushMode);
          if (state.brushMode === 'select') {
            engine.clearBrushPreview();
          } else {
            engine.clearSelectionPreview();
          }
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
        } else if (cell.layerIdx === REGION_LAYER_IDX) {
          if (!engine.updateRegionTile(cell.r, cell.c, cell.value)) {
            engine.enableRegionGridOverlay(map.regions || []);
            engine.updateRegionTile(cell.r, cell.c, cell.value);
          }
        } else {
          engine.updateSingleTile(cell.r, cell.c, cell.value, cell.layerIdx, map.tilesets);
        }
      }
    };

    const onVoxelsChanged = (e: Event) => {
      const engine = engineRef.current;
      const map = useGameStore.getState().activeMapData;
      if (!engine?.voxel?.voxelWorld || !map) return;
      const detail = (e as CustomEvent<{ voxels: Array<{ wx: number; wy: number; wz: number; word: number }> }>).detail;
      if (!detail?.voxels?.length) return;
      for (const v of detail.voxels) {
        engine.voxel.voxelWorld?.setVoxel(v.wx, v.wy, v.wz, v.word);
      }
      engine.voxel.meshDirtyVoxelChunks?.();
      const doc = engine.voxel.voxelWorld?.serializeToDoc();
      useGameStore.getState().setActiveMapData({ ...map, voxelDoc: doc });
    };
    window.addEventListener(STUDIO_MAP_CELLS_CHANGED_EVENT, onCellsChanged);
    window.addEventListener('studio_voxels_changed', onVoxelsChanged);
    return () => {
      window.removeEventListener(STUDIO_MAP_CELLS_CHANGED_EVENT, onCellsChanged);
      window.removeEventListener('studio_voxels_changed', onVoxelsChanged);
    };
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
        // Check if freeformLayers changed — if so, skip fast-path and do full loadTilemap
        const hasFreeform = Array.isArray(map.freeformLayers) && map.freeformLayers.length > 0;
        const prevHadFreeform = Array.isArray(prev?.freeformLayers) && (prev.freeformLayers as any[]).length > 0;
        const freeformChanged = hasFreeform || prevHadFreeform;

        if (!freeformChanged) {
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
          if (activeLayerIdx === LOGIC_LAYER_IDX && Array.isArray(map.grid)) {
            engine.enableLogicGridOverlay?.(map.grid);
          } else {
            engine.disableLogicGridOverlay?.();
          }
          useGameStore.getState().setActiveMapData(map);
          mapDataRef.current = map;
          return;
        }
        // freeformLayers changed — fall through to full loadTilemap below
      }

      engine.loadTilemap({
        id: currentMapId,
        width,
        height,
        tileSize: 1,
        tiles: map.grid,
        tileLayers: map.mapType === 'VOXEL' ? [] : map.tileLayers,
        freeformLayers: map.freeformLayers,
        tilesets: map.tilesets,
        npcs: [],
        chunks: map.chunks,
        voxelDoc: map.mapType === 'TILE' ? null : map.voxelDoc,
        blockSizePx: map.blockSizePx,
      });
      // loadTilemap clears author overlays — re-seed pins/sprites.
      setMapMeshEpoch((n) => n + 1);
      useGameStore.getState().setActiveMapData(map);
      mapDataRef.current = map;
    };
    window.addEventListener(STUDIO_MAP_HOT_RELOAD_EVENT, onHotReload);
    return () => window.removeEventListener(STUDIO_MAP_HOT_RELOAD_EVENT, onHotReload);
  }, [currentMapId]);

  // Editor camera: detach follow, enable middle-mouse / Space+drag pan
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !isEngineReady) return;
    engine.renderer.setEditorCameraMode(isDevEditorOpen);
    // Avatar-free authoring: hide local player while tools are open
    engine.setEntityVisible('player_main', !isDevEditorOpen);
    return () => {
      engine.renderer.setEditorCameraMode(false);
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

      // Fetch animationProfile if not cached (non-blocking)
      const npcId = `mapnpc_${npc.id}`;
      if (!entityAnimationProfilesRef.current.has(npcId) && npc.sprite) {
        entityAnimationProfilesRef.current.set(npcId, null);
        getAssetAnimationProfile(npc.sprite).then((profile) => {
          if (profile) entityAnimationProfilesRef.current.set(npcId, profile);
        });
      }

      engine.updateEntity({
        id: npcId,
        name: npc.name || npc.id,
        x: npc.x - liveW / 2,
        y: liveH / 2 - npc.y,
        spriteUrl,
        animationProfile: entityAnimationProfilesRef.current.get(npcId) as any,
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

  // Studio Brush / Splat / Stamp Rotation Event Listener
  useEffect(() => {
    const handleRotateBrush = (e: Event) => {
      const custom = e as CustomEvent<{ step: number }>;
      const step = custom.detail?.step || 90;
      const current = useEditorStore.getState().brushRotation || 0;
      const next = ((current + step) % 360 + 360) % 360;
      useEditorStore.getState().setBrushRotation(next);
      soundSynth?.playUiClick?.();
    };

    window.addEventListener('studio_rotate_brush', handleRotateBrush);
    return () => window.removeEventListener('studio_rotate_brush', handleRotateBrush);
  }, []);

  // Keyboard WASD / interact / auto-walk loop — playtest only (editor runtime keeps sim dormant)
  useEffect(() => {
    if (isDevEditorOpen) return;

    const keys = { w: false, a: false, s: false, d: false, arrowup: false, arrowdown: false, arrowleft: false, arrowright: false };
    let lastBlockedTime = 0;
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

      const isTryingToMove = dx !== 0 || dy !== 0;
      const hasAutoWalk = autoWalkPathRef.current.length > 0;
      const now = performance.now();

      if (state.gameMode === 'EXPLORING') {
        const engine = engineRef.current;
        const playerMesh = engine?.getEntityMesh('player_main');
        const stateMeta = playerMesh?.metadata;
        const dist =
          playerMesh && stateMeta
            ? Math.hypot(
                playerMesh.position.x - (stateMeta.targetPos?.x ?? 0),
                playerMesh.position.z - (stateMeta.targetPos?.z ?? 0)
              )
            : 0;

        // Player is at or very close to current target waypoint (or mesh not initialized yet)
        const isReadyForNextStep = !state.player.isMoving || dist <= 0.08;

        if (isTryingToMove) {
          if (isReadyForNextStep) {
            const pos = state.player.position;
            if (pos) {
              if (now - lastBlockedTime >= 120) {
                lastBlockedTime = now;
                tryMovePlayerTo(pos.x + dx, pos.y + dy);
              }
            }
          }
        } else if (hasAutoWalk) {
          if (isReadyForNextStep) {
            const nextStep = autoWalkPathRef.current.shift();
            if (nextStep) {
              tryMovePlayerTo(nextStep.x, nextStep.y);
            }
            if (autoWalkPathRef.current.length === 0) {
              engine?.clearDestinationIndicator();
            }
          }
        } else if (state.player.isMoving && dist <= 0.01) {
          useGameStore.getState().setPlayerPosition(state.player.position, state.player.direction, false);
        }
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
  }, [isDevEditorOpen, mapWidth, mapHeight, mapData, clearAutoWalk]);

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
    <div className={`absolute inset-0 w-full h-full overflow-hidden select-none ${isDevEditorOpen ? 'bg-transparent' : 'bg-[#050508]'}`}>
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
          const picked = engineRef.current.input.pickTileAtScreenCoord(screenX, screenY);
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
      

      {isEngineReady && engineRef.current && !isDevEditorOpen && (
        <PlaytestRuntime engine={engineRef.current} mapData={isolatedMapData || activeMap} isActive={true} />
      )}
      {isEngineReady && engineRef.current && (
        <FloatingHealthBars engine={engineRef.current} />
      )}
      

    </div>
  );
};

export default TileCanvasBabylon;
