import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  BabylonEngine,
  isSingleFrameSpriteUrl,
  SINGLE_FRAME_SPRITE_CONFIG,
} from "@/engine/BabylonEngine";
import { useGameStore } from "../store";
import { useEditorStore } from "../editor/editor-store";
import { soundSynth } from "@/engine/sound-synth";
import { findPath } from "@/engine/pathfinding";
import { WorldSimulation } from "@/engine/WorldSimulation";
import { FloatingHealthBars } from "./FloatingHealthBar";
import CraftingOverlay from "../crafting-overlay";
import { isSameBaseMap, toBaseMapId } from "@/shared/net/mapIds";
import { loadMap } from '@/shared/game/maps';
import { ensureMapHasStudioTilesets } from "@/shared/game/studioTilesetBootstrap";
import { startMapTransition, joinWorld } from "@/shared/game/lobbyWorldJoin";
import {
  resolveEntitySpriteUrl,
  getAssetAnimationProfile,
} from "@/shared/game/creatureCatalog";
import { normalizeGates } from "@/shared/game/logicComponents";
import type { GameMapData } from '@/shared/game/maps';
import { LOBBY_TOUCH_INTERACT_EVENT, LOBBY_TOUCH_MOVE_EVENT } from "../MobileControls";
import {
  evaluateEntityTarget,
  evaluateTileTarget,
  type WorldTarget,
} from "@/shared/game/worldTarget";

export interface PlaytestRuntimeProps {
  engine: BabylonEngine;
  mapData: GameMapData | null;
  isActive: boolean;
}

export const PlaytestRuntime: React.FC<PlaytestRuntimeProps> = ({
  engine,
  mapData,
  isActive,
}) => {
  const currentMapId = mapData?.id || "DEMO_SANDBOX";
  const activeMap = mapData as GameMapData | null;
  const mapWidth = activeMap?.width || 30;
  const mapHeight = activeMap?.height || 30;

  const isDevEditorOpen = !isActive;

  const playerAnimationProfileRef = useRef<any>(null);
  const multiplayerAnimationProfilesRef = useRef<Map<string, any>>(new Map());
  const entityAnimationProfilesRef = useRef<Map<string, any>>(new Map());
  const autoWalkPathRef = useRef<{ x: number; y: number }[]>([]);

  const { showToast, setPlayerPosition, emitSocketEvent, gainSkillXp } = useGameStore((state) => ({
    showToast: state.showToast,
    setPlayerPosition: state.setPlayerPosition,
    emitSocketEvent: state.emitSocketEvent,
    gainSkillXp: state.gainSkillXp,
  }));
  const engineRef = { current: engine };
  const suppressGameplay = false;
  const getIsEditorMode = () => useEditorStore.getState().isStudioFreeCam;
  const isShiftHeldRef = useRef(false);
  const isSpaceHeldRef = useRef(false);
  const tryMoveDirectionRef = useRef<any>(null);
  const handleInteractRef = useRef<any>(null);
  const clearAutoWalk = useCallback(() => { autoWalkPathRef.current = []; }, []);
  const map = activeMap as any;
  const editorToolsRef = useRef<any>(null);

  const tryMovePlayerTo = (
    targetX: number,
    targetY: number,
    intentOptions?: { isSprinting?: boolean; isJumping?: boolean },
  ) => {
    // Editor runtime: gameplay input dormant (engine-editor foundation).
    if (isDevEditorOpen) return;
    if (!activeMap) return;

    const store = useGameStore.getState();
    if (store.isMapTransitioning || store.worldSessionState === "transitioning")
      return;

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
      connections: activeMap.connections,
      nodeConnections: activeMap.nodeConnections,
      voxelWorld: (engineRef.current as any)?.voxel?.voxelWorld || (engineRef.current as any)?.voxelWorld,
    };

    const result = WorldSimulation.tryMove(
      worldState,
      targetX,
      targetY,
      intentOptions,
    );

    if (result.type === "BLOCKED") {
      if (isDevEditorOpen && result.reason === "WALL") {
        // Prevent toast spam by checking a ref or just letting the toast queue handle it.
        // We'll rely on the toast queue to coalesce rapid identical messages (built in Game UI P0).
        store.showToast("Blocked by wall collision (Logic Tag)");
      }

      // Phase 2: Client Prediction (Turn in place)
      setPlayerPosition(currentPos, result.direction, false);
      const seq = store.incrementMoveSeq();
      store.addPendingMove({
        seq,
        direction: result.direction,
        predictedPos: currentPos,
      });
      emitSocketEvent?.("input", {
        type: "MOVE",
        direction: result.direction,
        sequence: seq,
        timestamp: Date.now(),
      });
      emitSocketEvent?.("player_move", {
        x: currentPos.x,
        y: currentPos.y,
        direction: result.direction,
        moving: false,
        seq,
      });
      return;
    }

    // Drain stamina on successful move
    if (intentOptions?.isJumping) {
      store.modifyStamina(-10);
    } else if (intentOptions?.isSprinting) {
      store.modifyStamina(-5);
    }

    if (result.type === "WARP") {
      const gate = result.gate;
      let spawnX = targetX;
      let spawnY = targetY;

      if (gate.isEdgeConnection) {
        if (gate.edgeDirection === "north") {
          spawnX = targetX;
          spawnY = -1; // becomes finalH - 1 on destination
        } else if (gate.edgeDirection === "south") {
          spawnX = targetX;
          spawnY = 0; // top row on destination
        } else if (gate.edgeDirection === "west") {
          spawnX = -1; // becomes finalW - 1 on destination
          spawnY = targetY;
        } else if (gate.edgeDirection === "east") {
          spawnX = 0; // left column on destination
          spawnY = targetY;
        }
      } else {
        const destSpawn = gate.targetSpawn || gate.spawnPoint;
        if (
          destSpawn &&
          typeof destSpawn.x === "number" &&
          typeof destSpawn.y === "number"
        ) {
          const gatePosX = gate.position?.x ?? targetX;
          const gatePosY = gate.position?.y ?? targetY;
          const relX = targetX - gatePosX;
          const relY = targetY - gatePosY;
          spawnX = destSpawn.x + relX;
          spawnY = destSpawn.y + relY;
        } else {
          spawnX = targetX;
          spawnY = targetY;
        }
      }

      const spawn = { x: spawnX, y: spawnY };
      const targetBase = toBaseMapId(gate.targetMapId);
      const finishWarp = () => {
        const store = useGameStore.getState();
        store.setWorldOriginOffset(0, 0);

        let loadedGrid: number[][] | undefined = undefined;
        // Load destination document before flipping ids — never leave stale
        // activeMapData mounted (World Builder warp already does this pair).
        const targetNodeId = (gate as any).targetNodeId;
        void loadMap(gate.targetMapId, 0, targetNodeId)
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
            // Clears activeMapData so the canvas effect loads fresh.
            useGameStore.setState({
              currentMapId: gate.targetMapId,
              activeAtlasNodeId: targetNodeId || null,
              activeMapData: null,
            });
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

            // Immediate camera alignment on the new map
            if (engineRef.current && !editorToolsRef.current) {
              const snapX = spawn.x - finalW / 2;
              const snapZ = finalH / 2 - spawn.y;
              engineRef.current.renderer.snapCameraTo(snapX, snapZ);
            }

            const liveStore = useGameStore.getState();
            const p = liveStore.player;
            const inStudio = getIsEditorMode();
            const creation = useEditorStore.getState().isCreationMode;
            if (emitSocketEvent && p.accountId) {
              startMapTransition({
                socket: { connected: true, emit: emitSocketEvent },
                accountId: p.accountId,
                contract: {
                  mapId: targetBase,
                  lobby: !inStudio,
                  // Studio must stay on private / PIE — never leak into public DEMO_chN.
                  isPrivate: inStudio && creation,
                  pie: inStudio && !creation,
                },
                position: { x: spawn.x, y: spawn.y },
                name: p.name || "Player",
                assetProfileId: p.assetProfileId || "adventurer",
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
            // Ensure transition state is cleared immediately so gameplay is completely fluid
            liveStore.setIsMapTransitioning(false);
            liveStore.setWorldSessionState("joined");
            showToast(`Crossed into ${gate.targetMapId.replace(/_/g, " ")}`);
          });
      };

      finishWarp();
      return;
    }

    if (result.type === "MOVED") {
      const dir = result.direction;
      if (isDevEditorOpen) {
        setPlayerPosition({ x: targetX, y: targetY }, dir, false);
      } else {
        // Phase 2: Client Prediction Enabled (instant local movement)
        setPlayerPosition({ x: targetX, y: targetY }, dir, true);
      }

      const seq = store.incrementMoveSeq();
      store.addPendingMove({
        seq,
        direction: dir,
        predictedPos: { x: targetX, y: targetY },
      });
      emitSocketEvent?.("input", {
        type: "MOVE",
        direction: dir,
        sequence: seq,
        timestamp: Date.now(),
      });
      emitSocketEvent?.("player_move", {
        x: targetX,
        y: targetY,
        direction: dir,
        moving: true,
        seq,
      });

      // Handle Step Actions (suppressed during Studio create tools — bible 17)
      if (result.stepAction && !suppressGameplay) {
        const payload = result.stepPayload || {};
        switch (result.stepAction) {
          case "ENCOUNTER":
            emitSocketEvent?.("encounter_check", {
              mapId: currentMapId,
              x: targetX,
              y: targetY,
            });
            break;
          case "OPEN_SHOP":
            showToast("Welcome to the Shop!");
            useGameStore.getState().setGameMode("SHOP");
            break;
          case "CLINIC_HEAL":
            emitSocketEvent?.("clinic_heal", { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case "FISHING":
            emitSocketEvent?.("fish_attempt", { mapId: currentMapId, x: targetX, y: targetY });
            break;
          case "BANK":
            showToast("Bank Terminal accessed!");
            useGameStore.getState().setGameMode("BANK");
            break;
          case "OPEN_CRAFTING":
            showToast("Crafting Station accessed!");
            useGameStore.getState().setGameMode("CRAFTING");
            break;
          case "OPEN_BASE":
            showToast("Base Terminal online!");
            useGameStore.getState().setGameMode("BASE");
            break;
        }
      }
    }
  };

  const tryMoveDirection = (dx: number, dy: number) => {
    const state = useGameStore.getState();
    if (state.gameMode !== "EXPLORING") return;
    const currentPlayer = state.player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;

    const isSprinting = isShiftHeldRef.current && !currentPlayer.isExhausted;
    const isJumping = isSpaceHeldRef.current && !currentPlayer.isExhausted;

    let moveDx = dx;
    let moveDy = dy;
    if (isSprinting) {
      moveDx *= 2;
      moveDy *= 2;
    }

    tryMovePlayerTo(curX + moveDx, curY + moveDy, { isSprinting, isJumping });
  };
  tryMoveDirectionRef.current = tryMoveDirection;

  // Interact / Talk Handler
  const handleInteract = () => {
    if (isDevEditorOpen) return;
    const store = useGameStore.getState();
    const currentPlayer = store.player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;
    const dir = currentPlayer.direction || "down";

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
      isDevEditorOpen,
    };

    const result = WorldSimulation.tryInteract(worldState, dir);

    if (result.type === "LOGIC_INTERACT") {
      if (result.action === "BANK") {
        showToast("Bank Terminal accessed!");
        useGameStore.getState().setGameMode("BANK");
        return;
      }
      if (result.action === "OPEN_CRAFTING") {
        showToast("Opened Crafting Station (Playtest Preview)");
        useGameStore.setState({ gameMode: "CRAFTING" });
        return;
      }
      if (result.action === "OPEN_SHOP") {
        showToast("Opened Shop (Playtest Preview)");
        return;
      }
      if (result.action === "HEAL") {
        showToast("Healed at Shrine (Playtest Preview)");
        return;
      }
      if (result.action === "OPEN_BANK") {
        showToast("Opened Bank (Playtest Preview)");
        return;
      }

      if (result.action === "HARVEST_WOOD") {
        soundSynth.playWoodcuttingSound();
        showToast("Harvested Wood");
      } else if (result.action === "HARVEST_ORE") {
        soundSynth.playMiningSound();
        showToast("Harvested Ore");
      }

      // Phase 5: Server Authority for Gathering
      store.emitSocketEvent?.("gather_interact", {
        mapId: currentMapId,
        targetX: result.targetX,
        targetY: result.targetY,
      });
      return;
    }

    if (result.type === "NPC_DIALOGUE") {
      const rawId = String(result.npcId || "");
      const dialogueNpcId =
        rawId.includes("vance") || rawId.includes("marshal")
          ? "npc_marshal_vance"
          : rawId;
      // Server-authoritative dialogue (Vance grants / quest report)
      store.emitSocketEvent?.("npc_interact", {
        mapId: currentMapId,
        targetId: dialogueNpcId,
      });
      return;
    }

    if (result.type === "NONE") {
      showToast("Nothing to interact with here.");
    }
  };
  handleInteractRef.current = handleInteract;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "s",
          "a",
          "d",
        ].includes(e.key)
      ) {
        clearAutoWalk();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearAutoWalk]);

  // MobileControls → same movement / interact pipeline as keyboard (playtest only)
  useEffect(() => {
    if (isDevEditorOpen) return;
    const onMove = (e: Event) => {
      const { dx, dy } =
        (e as CustomEvent<{ dx: number; dy: number }>).detail || {};
      if (typeof dx === "number" && typeof dy === "number") {
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
      if (data.type === "ATTACK_RESULT") {
        engineRef.current.spawnProjectile(
          data.attackerId,
          data.targetId,
          data.abilityId,
        );

        // Also show floating damage text via Babylon Engine
        if (!data.isMiss && data.damage > 0) {
          engineRef.current.renderDamageText(
            data.targetId,
            data.damage,
            data.isCrit,
          );
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
    const depletedOriginals = new Map<string, { l1: number; l2: number }>();

    const handleNodeDepleted = (e: Event) => {
      const data = (e as CustomEvent).detail;
      const { x, y } = data;
      if (engineRef.current && mapData) {
        // Save original tiles from Object layers (usually layer 1 or 2)
        const l1 = mapData.tileLayers?.[1]?.grid?.[y]?.[x] || 0;
        const l2 = mapData.tileLayers?.[2]?.grid?.[y]?.[x] || 0;
        depletedOriginals.set(`${x}_${y}`, { l1, l2 });

        // Clear the tiles visually
        if (l1)
          engineRef.current.updateSingleTile(y, x, 0, 1, mapData.tilesets);
        if (l2)
          engineRef.current.updateSingleTile(y, x, 0, 2, mapData.tilesets);

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
          if (orig.l1)
            engineRef.current.updateSingleTile(
              y,
              x,
              orig.l1,
              1,
              mapData.tilesets,
            );
          if (orig.l2)
            engineRef.current.updateSingleTile(
              y,
              x,
              orig.l2,
              2,
              mapData.tilesets,
            );
          depletedOriginals.delete(`${x}_${y}`);
        }
      }
    };

    const handleTileChanged = (e: Event) => {
      const data = (e as CustomEvent).detail || {};
      const x = data.x;
      const y = data.y;
      const tileId = typeof data.tileId === "number" ? data.tileId : 0;
      if (typeof x !== "number" || typeof y !== "number") return;

      const cur = useGameStore.getState().activeMapData;
      if (cur?.grid?.[y]) {
        const nextGrid = (cur.grid as number[][]).map(
          (row: number[], rowIdx: number) =>
            rowIdx === y
              ? row.map((cell: number, colIdx: number) =>
                  colIdx === x ? tileId : cell,
                )
              : row,
        );
        useGameStore.getState().setActiveMapData({ ...cur, grid: nextGrid });
      }

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
      if (
        typeof x === "number" &&
        typeof y === "number" &&
        engineRef.current?.clearTileProps
      ) {
        engineRef.current.clearTileProps(y, x);
      }
    };

    window.addEventListener("combat_update_event", handleCombatUpdate);
    window.addEventListener("node_depleted_event", handleNodeDepleted);
    window.addEventListener("node_depleted_event", handleNodeDepletedFallback);
    window.addEventListener("node_respawned_event", handleNodeRespawned);
    window.addEventListener("lobby_tile_changed", handleTileChanged);
    return () => {
      window.removeEventListener("combat_update_event", handleCombatUpdate);
      window.removeEventListener("node_depleted_event", handleNodeDepleted);
      window.removeEventListener(
        "node_depleted_event",
        handleNodeDepletedFallback,
      );
      window.removeEventListener("node_respawned_event", handleNodeRespawned);
      window.removeEventListener("lobby_tile_changed", handleTileChanged);
    };
  }, [mapData]); // Added mapData to dependencies since it's used in the new listeners

  // Stable key so setActiveMapData new-object refreshes do not dispose Babylon

  // Render Loop Effect
  useEffect(() => {
    if (!engine || !activeMap) return;

    // Start 60FPS Render Loop
    const observer = engine.scene.onBeforeRenderObservable.add(() => {
      // Prefer live engine dims — closure mapWidth/Height go stale across hot remesh
      // without a full remount.
      const liveW = engine.getMapWidth() || mapWidth;
      const liveH = engine.getMapHeight() || mapHeight;
      const liveStore = useGameStore.getState();
      const offset = liveStore.worldOriginOffset;

      if (!editorToolsRef.current) {
        // --- LIVE MMO RENDER PIPELINE ---
        const freshPlayer = liveStore.player;
        if (freshPlayer && freshPlayer.position) {
          const px = freshPlayer.position.x ?? 6;
          const py = freshPlayer.position.y ?? 2;
          const worldX = px - liveW / 2 + offset.x;
          const worldZ = liveH / 2 - py - offset.y;

          engine.updateEntity({
            id: "player_main",
            name: freshPlayer.name || "Hero",
            x: worldX,
            y: worldZ,
            spriteUrl: resolveEntitySpriteUrl(freshPlayer.assetProfileId, {
              kind: "player",
              fallback: "/game-assets/npc/adventurer.png",
            }),
            animationProfile: playerAnimationProfileRef.current as any,
            isPlayer: true,
            direction: freshPlayer.direction,
            isMoving: freshPlayer.isMoving,
            chatMessage: liveStore.localChat || undefined,
            spriteConfig: freshPlayer.spriteConfig,
            hp: freshPlayer.hp,
            maxHp: freshPlayer.maxHp,
          });
          engine.setEntityVisible("player_main", true);

          const playerMesh = engine.getEntityMesh("player_main");
          if (playerMesh) {
            engine.renderer.setCameraPosition(
              playerMesh.position.x,
              playerMesh.position.z,
              0.35,
            );
          } else {
            engine.renderer.setCameraPosition(worldX, worldZ, 0.35);
          }
        }
      } else {
        // --- STUDIO ISOLATION ---
        // Hide avatar and ignore live camera tracking
        engine.setEntityVisible("player_main", false);
      }

      // Map Chunks lookup for cross-border neighbor coordinate transformation
      const liveMapDoc =
        (liveStore.activeMapData as {
          npcs?: Array<{
            id: string;
            name?: string;
            x: number;
            y: number;
            sprite?: string;
          }>;
          chunks?: Array<{
            mapId: string;
            offsetX?: number;
            offsetZ?: number;
            width?: number;
            height?: number;
            npcs?: any[];
          }>;
        } | null) || activeMap;
      const rawChunks = (liveMapDoc as any)?.chunks as
        | Array<{
            mapId: string;
            offsetX?: number;
            offsetZ?: number;
            width?: number;
            height?: number;
            npcs?: any[];
          }>
        | undefined;
      const chunkMap = new Map<
        string,
        { offsetX: number; offsetZ: number; width: number; height: number }
      >();
      if (rawChunks && rawChunks.length > 0) {
        for (const c of rawChunks) {
          if (c.mapId) {
            chunkMap.set(c.mapId.toUpperCase(), {
              offsetX: c.offsetX || 0,
              offsetZ: c.offsetZ || 0,
              width: c.width || liveW,
              height: c.height || liveH,
            });
          }
        }
      }

      // Render connected multiplayer players (Live MMO only)
      const freshOtherPlayers = !editorToolsRef.current
        ? useGameStore.getState().otherPlayers
        : {};
      if (freshOtherPlayers) {
        const activeSockets = new Set(Object.keys(freshOtherPlayers));

        // Cleanup stale multiplayer meshes
        engine._renderedSockets.forEach((id: string) => {
          if (!activeSockets.has(id)) {
            engine.removeEntity(`multiplayer_${id}`);
            engine._renderedSockets.delete(id);
          }
        });

        for (const [socketId, other] of Object.entries(freshOtherPlayers)) {
          engine._renderedSockets.add(socketId);
          // Prefer ?? so tile (0,0) is not remapped to demo defaults.
          const targetX = other.x ?? 6;
          const targetY = other.y ?? 2;
          const otherMapId = (other as any).mapId
            ? String((other as any).mapId).toUpperCase()
            : undefined;
          let ox: number;
          let oz: number;

          if (
            otherMapId &&
            otherMapId !== String(currentMapId).toUpperCase() &&
            chunkMap.has(otherMapId)
          ) {
            const c = chunkMap.get(otherMapId)!;
            ox = targetX - c.width / 2 + c.offsetX + offset.x;
            oz = c.height / 2 - targetY + c.offsetZ - offset.y;
          } else {
            ox = targetX - liveW / 2 + offset.x;
            oz = liveH / 2 - targetY - offset.y;
          }

          const peerSprite =
            other.assetProfileId || (other as any).spriteId || "adventurer";

          // Fetch animationProfile if not cached (non-blocking)
          if (
            !multiplayerAnimationProfilesRef.current.has(socketId) &&
            peerSprite
          ) {
            multiplayerAnimationProfilesRef.current.set(socketId, null);
            getAssetAnimationProfile(peerSprite).then((profile) => {
              if (profile)
                multiplayerAnimationProfilesRef.current.set(socketId, profile);
            });
          }

          engine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || "Saint",
            x: ox,
            y: oz,
            spriteUrl: resolveEntitySpriteUrl(peerSprite, {
              kind: "player",
              fallback: "/game-assets/npc/adventurer.png",
            }),
            animationProfile: multiplayerAnimationProfilesRef.current.get(
              socketId,
            ) as any,
            isPlayer: true,
            direction: other.direction,
            isMoving: other.isMoving,
            chatMessage: other.chatMessage,
            spriteConfig: (other as any).spriteConfig,
            hp: other.hp,
            maxHp: other.maxHp,
          });
        }
      }

      // Render map entities: socket mapEntities + static map NPCs (including connected neighbor chunks)
      const mapEntities = !editorToolsRef.current
        ? liveStore.mapEntities || []
        : [];

      const staticNpcs: any[] = [];
      if (rawChunks && rawChunks.length > 0) {
        for (const chunk of rawChunks) {
          const isMain = !chunk.offsetX && !chunk.offsetZ;
          const cWidth = chunk.width || liveW;
          const cHeight = chunk.height || liveH;
          const cOffsetX = chunk.offsetX || 0;
          const cOffsetZ = chunk.offsetZ || 0;

          for (const npc of chunk.npcs || []) {
            staticNpcs.push({
              id: isMain
                ? `mapnpc_${npc.id}`
                : `mapnpc_${chunk.mapId}_${npc.id}`,
              type: "NPC" as const,
              spriteKey: npc.sprite || "adventurer",
              position: { x: npc.x, y: npc.y },
              worldX: npc.x - cWidth / 2 + cOffsetX + offset.x,
              worldZ: cHeight / 2 - npc.y + cOffsetZ - offset.y,
              mapId: chunk.mapId || currentMapId,
              name: npc.name || npc.id,
              hp: (npc as any).hp,
              maxHp: (npc as any).maxHp,
            });
          }
        }
      } else {
        for (const npc of liveMapDoc?.npcs || []) {
          staticNpcs.push({
            id: `mapnpc_${npc.id}`,
            type: "NPC" as const,
            spriteKey: npc.sprite || "adventurer",
            position: { x: npc.x, y: npc.y },
            worldX: npc.x - liveW / 2 + offset.x,
            worldZ: liveH / 2 - npc.y - offset.y,
            mapId: currentMapId,
            name: npc.name || npc.id,
            hp: (npc as any).hp,
            maxHp: (npc as any).maxHp,
          });
        }
      }

      // Prefer socket entities. Skip static NPCs already covered by socket at same
      // tile OR same display name (socket ids are npc_<template>_<ts>).
      const socketTiles = new Set(
        mapEntities
          .filter((e) => e.type === "NPC")
          .map(
            (e) => `${Math.round(e.position.x)},${Math.round(e.position.y)}`,
          ),
      );
      const socketNames = new Set(
        mapEntities
          .filter((e) => e.type === "NPC" && e.name)
          .map((e) => String(e.name).toLowerCase()),
      );
      const merged = [
        ...mapEntities,
        ...staticNpcs.filter(
          (n: { position: { x: number; y: number }; name?: string }) => {
            const tile = `${Math.round(n.position.x)},${Math.round(n.position.y)}`;
            const name = String(n.name || "").toLowerCase();
            return !socketTiles.has(tile) && !(name && socketNames.has(name));
          },
        ),
      ];

      const activeEntities = new Set<string>();
      for (const ent of merged) {
        const isCurrentMap =
          !ent.mapId ||
          ent.mapId === currentMapId ||
          isSameBaseMap(ent.mapId, currentMapId);
        const isNeighborMap =
          ent.mapId && chunkMap.has(String(ent.mapId).toUpperCase());

        if (isCurrentMap || isNeighborMap) {
          activeEntities.add(ent.id);
          const ex =
            (ent as any).worldX !== undefined
              ? (ent as any).worldX
              : isNeighborMap && chunkMap.has(String(ent.mapId).toUpperCase())
                ? ent.position.x -
                  chunkMap.get(String(ent.mapId).toUpperCase())!.width / 2 +
                  chunkMap.get(String(ent.mapId).toUpperCase())!.offsetX +
                  offset.x
                : ent.position.x - liveW / 2 + offset.x;
          const ez =
            (ent as any).worldZ !== undefined
              ? (ent as any).worldZ
              : isNeighborMap && chunkMap.has(String(ent.mapId).toUpperCase())
                ? chunkMap.get(String(ent.mapId).toUpperCase())!.height / 2 -
                  ent.position.y +
                  chunkMap.get(String(ent.mapId).toUpperCase())!.offsetZ -
                  offset.y
                : liveH / 2 - ent.position.y - offset.y;

          const kind =
            ent.type === "NPC"
              ? "npc"
              : ent.type === "ANIMAL"
                ? "animal"
                : "monster";
          const spriteUrl = resolveEntitySpriteUrl(ent.spriteKey, { kind });

          // Fetch animationProfile if not cached (non-blocking)
          if (
            !entityAnimationProfilesRef.current.has(ent.id) &&
            ent.spriteKey
          ) {
            entityAnimationProfilesRef.current.set(ent.id, null);
            getAssetAnimationProfile(ent.spriteKey).then((profile) => {
              if (profile)
                entityAnimationProfilesRef.current.set(ent.id, profile);
            });
          }

          engine.updateEntity({
            id: ent.id,
            name: ent.name || "",
            x: ex,
            y: ez,
            spriteUrl,
            animationProfile: entityAnimationProfilesRef.current.get(
              ent.id,
            ) as any,
            isPlayer: false,
            isNpc: ent.type === "NPC",
            isCreature: ent.type === "MONSTER" || ent.type === "ANIMAL",
            hp: (ent as any).hp,
            maxHp: (ent as any).maxHp,
            spriteConfig:
              (ent as any).spriteConfig ||
              (isSingleFrameSpriteUrl(spriteUrl)
                ? SINGLE_FRAME_SPRITE_CONFIG
                : undefined),
          });
        }
      }

      // Cleanup stale map entities
      engine._renderedEntities.forEach((id: string) => {
        if (!activeEntities.has(id)) {
          engine.removeEntity(id);
          engine._renderedEntities.delete(id);
        }
      });
      activeEntities.forEach((id) => engine._renderedEntities.add(id));
    });

    return () => {
      if (observer) engine.scene.onBeforeRenderObservable.remove(observer);
    };
  }, [engine, currentMapId, mapWidth, mapHeight]);

  // Tile Picking Effect
  useEffect(() => {
    if (!engine || !activeMap) return;

    // Spatial Interaction & Targeting in exploration mode
    engine.input.enableTilePicking(
      (r, c, _layerIdx, eventType, point) => {
        if (eventType && eventType !== "down") return;
        const currentPos = useGameStore.getState().player?.position;
        if (!currentPos) return;

        const picked = engine.input.pickWorldTarget();
        const dynamicEntities = useGameStore.getState().mapEntities || [];
        const logicTiles = useGameStore.getState().logicTiles;

        if (picked && picked.kind === "entity" && picked.entityId) {
          let entityObj = dynamicEntities.find((e) => e.id === picked.entityId);
          if (!entityObj && (map as any)?.npcs) {
            const staticNpc = (map as any).npcs.find(
              (n: any) =>
                `npc_${n.id}` === picked.entityId || n.id === picked.entityId,
            );
            if (staticNpc) {
              entityObj = {
                id: picked.entityId,
                name: staticNpc.name || staticNpc.id,
                type: "NPC",
                position: { x: staticNpc.x, y: staticNpc.y },
                components: {
                  identity: {
                    id: picked.entityId,
                    name: staticNpc.name || staticNpc.id,
                  },
                  dialogue: { dialogueKey: staticNpc.dialogueKey || "default" },
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
            engine.setGroundTargetRing(
              worldTarget,
              worldTarget.kind === "creature" ? "combat" : "focus",
            );

            if (worldTarget.interactable && worldTarget.primaryAction) {
              soundSynth?.playUiClick?.();
              if (worldTarget.primaryAction.type === "TALK") {
                const payload = worldTarget.primaryAction.payload;
                window.dispatchEvent(
                  new CustomEvent("open_dialogue", {
                    detail: {
                      speaker: worldTarget.name,
                      text: `Greetings, traveler! I am ${worldTarget.name}.`,
                      dialogueKey: payload?.dialogueKey,
                    },
                  }),
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
            for (
              let wy = engine.voxel.voxelWorld?.totalHeightBlocks - 1;
              wy >= 0;
              wy--
            ) {
              const w = engine.voxel.voxelWorld?.getVoxel(x, wy, wz);
              if (w?.low !== undefined && (w.low & 0xffffff) !== 0) {
                targetWY = wy;
                break;
              }
            }
            const overheadWord = engine.voxel.voxelWorld?.getVoxel(
              x,
              targetWY + 1,
              wz,
            );
            const overheadPhys = overheadWord?.low !== undefined ? ((overheadWord.high >>> 8) & 0xf) : 0;
            if (overheadWord?.low !== undefined && (overheadPhys === 1 || overheadPhys === 5))
              return false;

            const groundWord = engine.voxel.voxelWorld?.getVoxel(
              x,
              targetWY,
              wz,
            );
            if (groundWord?.low === undefined || (groundWord.low & 0xffffff) === 0) return false;
            const groundPhys = (groundWord.high >>> 8) & 0xf;
            if (groundPhys === 5) return false; // Hazard
          }
          const isStaticNpc = map.npcs?.some(
            (npc: any) => npc.x === x && npc.y === y,
          );
          const isDynamicNpc = dynamicEntities.some(
            (e) =>
              Math.round(e.position.x) === x &&
              Math.round(e.position.y) === y &&
              (e.mapId === currentMapId || !e.mapId),
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
          const path = findPath(
            currentPos.x,
            currentPos.y,
            c,
            r,
            mapWidth,
            mapHeight,
            isWalkable,
          );
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

          if (picked && picked.kind === "entity" && picked.entityId) {
            let entityObj = dynamicEntities.find(
              (e) => e.id === picked.entityId,
            );
            if (!entityObj && map.npcs) {
              const staticNpc = map.npcs.find(
                (n: any) =>
                  `npc_${n.id}` === picked.entityId || n.id === picked.entityId,
              );
              if (staticNpc) {
                entityObj = {
                  id: picked.entityId,
                  name: staticNpc.name || staticNpc.id,
                  type: "NPC",
                  position: { x: staticNpc.x, y: staticNpc.y },
                  components: {
                    identity: {
                      id: picked.entityId,
                      name: staticNpc.name || staticNpc.id,
                    },
                    dialogue: {
                      dialogueKey: staticNpc.dialogueKey || "default",
                    },
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
              engine.setGroundTargetRing(
                target,
                target.kind === "creature" ? "combat" : "hover",
              );
              engine.clearDestinationIndicator();
              return;
            }
          }

          // Tile hover
          const isSolid = Boolean(logicTiles[map.grid[r]?.[c]]?.isSolid);
          const normalizedGates = normalizeGates(map.gates);
          const gate = normalizedGates.find(
            (g: any) => g.position.x === c && g.position.y === r,
          );
          const tileTarget = evaluateTileTarget({
            r,
            c,
            playerPos: { x: currentPos.x, y: currentPos.y },
            isSolid,
            warpGate: gate,
          });

          useGameStore.getState().setHoveredTarget(tileTarget);
          engine.setDestinationIndicator(c, r, !isSolid);

          const focused = useGameStore.getState().focusedTarget;
          if (focused) {
            engine.setGroundTargetRing(
              focused,
              focused.kind === "creature" ? "combat" : "focus",
            );
          } else {
            engine.setGroundTargetRing(null);
          }
        },
        onTileLeave: () => {
          useGameStore.getState().setHoveredTarget(null);
          engine.clearDestinationIndicator();
          const focused = useGameStore.getState().focusedTarget;
          if (focused) {
            engine.setGroundTargetRing(
              focused,
              focused.kind === "creature" ? "combat" : "focus",
            );
          } else {
            engine.setGroundTargetRing(null);
          }
        },
      },
    );

    return () => {
      engine.input.disableTilePicking();
    };
  }, [engine, currentMapId, activeMap]);

  return (
    <>
      <CraftingOverlay />
      {engine && <FloatingHealthBars engine={engine} />}
    </>
  );
};
