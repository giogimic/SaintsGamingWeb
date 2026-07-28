'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BabylonEngine } from '@/lib/game/BabylonEngine';
import { resolveEncounter } from '@/lib/game/TuxemonDb';
import { useGameStore } from '../store';
import { loadMap } from '../data/maps';
import type { GameMapData } from '../data/maps';
import { soundSynth } from '@/lib/game/sound-synth';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Hand } from 'lucide-react';

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
  const player = useGameStore((state) => state.player);
  const otherPlayers = useGameStore((state) => state.otherPlayers);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);
  const gainSkillXp = useGameStore((state) => state.gainSkillXp);

  // Async map state — engine only mounts AFTER map data is ready
  const [mapData, setMapData] = useState<GameMapData | null>(null);

  useEffect(() => {
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
  }, [currentMapId]);

  // Derive dimensions — use loaded map data or safe defaults
  const activeMap = mapData as any;
  const mapWidth = activeMap?.grid?.[0]?.length || 24;
  const mapHeight = activeMap?.grid?.length || 24;

  // Unified Movement Execution Engine
  const tryMovePlayerTo = (targetX: number, targetY: number) => {
    if (!activeMap) return;
    if (useGameStore.getState().isMapTransitioning) return;
    
    // Bounds Check
    if (targetX < 0 || targetX >= mapWidth || targetY < 0 || targetY >= mapHeight) {
      return; // Cannot walk off the map
    }

    const nextX = targetX;
    const nextY = targetY;

    const currentPos = useGameStore.getState().player?.position;
    if (!currentPos) return;

    // Determine intended direction even if we hit a wall
    let dir: 'up' | 'down' | 'left' | 'right' = 'down';
    if (nextX > currentPos.x) dir = 'right';
    else if (nextX < currentPos.x) dir = 'left';
    else if (nextY > currentPos.y) dir = 'down';
    else if (nextY < currentPos.y) dir = 'up';

    // Logic Grid Collision Check
    const targetTileId = activeMap.grid[nextY]?.[nextX];
    const logicTile = useGameStore.getState().logicTiles[targetTileId];
    
    if (logicTile?.isSolid) {
      // Just turn to face the wall, don't move.
      setPlayerPosition(currentPos, dir, false);
      return;
    }

    // NPC Collision Check
    const dynamicEntities = useGameStore.getState().mapEntities || [];
    const isStaticNpc = activeMap.npcs?.some((npc: any) => npc.x === nextX && npc.y === nextY);
    const isDynamicNpc = dynamicEntities.some((e) => Math.round(e.position.x) === nextX && Math.round(e.position.y) === nextY && (e.mapId === currentMapId || !e.mapId));
    
    if (isStaticNpc || isDynamicNpc) {
      setPlayerPosition(currentPos, dir, false);
      return; // Blocked by NPC
    }

    if (isDevEditorOpen) {
      setPlayerPosition({ x: nextX, y: nextY }, dir, false);
    } else {
      setPlayerPosition({ x: nextX, y: nextY }, dir, true);

      setTimeout(() => {
        const store = useGameStore.getState();
        if (store.player.position.x === nextX && store.player.position.y === nextY) {
          store.setPlayerPosition({ x: nextX, y: nextY }, undefined, false);
        }
      }, 250);
    }

    // Update server position
    emitSocketEvent?.('move', { x: nextX, y: nextY, direction: dir, mapId: currentMapId });

    // Logic Tile Step Event Trigger
    if (logicTile?.onStepAction) {
      const payload = logicTile.onStepPayload ? JSON.parse(logicTile.onStepPayload) : {};
      
      switch (logicTile.onStepAction) {
        case 'ENCOUNTER':
          const roll = Math.random() * 100;
          if (roll < (payload.chance * 100 || 15)) {
            let wildSpecies: any = null;
            
            // activeMap.encounterPool contains strings like ["spyder_route1"]
            const pool = activeMap?.encounterPool;
            if (pool && pool.length > 0) {
              const zone = pool[Math.floor(Math.random() * pool.length)];
              // This is async, but we can fire and forget the transition
              resolveEncounter(zone).then((encounterData) => {
                if (encounterData) {
                  soundSynth.playEncounterSound();
                  showToast(`Wild ${encounterData.speciesId.toUpperCase()} appeared! (Lv ${encounterData.minLevel}-${encounterData.maxLevel})`);
                  useGameStore.getState().setGameMode('BATTLE');
                }
              });
            } else {
              // Fallback
              soundSynth.playEncounterSound();
              showToast(`Wild IGNIS appeared!`);
              useGameStore.getState().setGameMode('BATTLE');
            }
          }
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

    // Warp Gate Transition Check
    if (Array.isArray(activeMap.gates)) {
      const gate = activeMap.gates.find((g: any) => g.position?.x === nextX && g.position?.y === nextY);
      if (gate && gate.targetMapId) {
        if (isDevEditorOpen) {
          useGameStore.setState({ currentMapId: gate.targetMapId });
          setPlayerPosition(gate.targetSpawn || { x: 6, y: 2 });
          showToast(`Warped to ${gate.targetMapId}`);
        } else {
          // Cinematic Fade Transition
          const store = useGameStore.getState();
          if (store.isMapTransitioning) return; // Prevent double warp
          
          store.setIsMapTransitioning(true);
          
          setTimeout(() => {
            useGameStore.setState({ currentMapId: gate.targetMapId });
            setPlayerPosition(gate.targetSpawn || { x: 6, y: 2 });
            
            // Wait for Babylon geometry to generate before fading back in
            setTimeout(() => {
              useGameStore.getState().setIsMapTransitioning(false);
              showToast(`Warped to ${gate.targetMapId}`);
            }, 100);
          }, 300);
        }
        return;
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
    const currentPlayer = useGameStore.getState().player;
    const curX = currentPlayer.position?.x ?? 6;
    const curY = currentPlayer.position?.y ?? 2;
    const dir = currentPlayer.direction || 'down';
    
    let faceX = curX;
    let faceY = curY;
    
    if (dir === 'up') faceY -= 1;
    else if (dir === 'down') faceY += 1;
    else if (dir === 'left') faceX -= 1;
    else if (dir === 'right') faceX += 1;

    const currentTileId = activeMap?.grid?.[faceY]?.[faceX];
    const logicTile = useGameStore.getState().logicTiles[currentTileId];

    // Resource Node Harvesting and Dynamic Tile Interactions
    if (logicTile?.interactable && logicTile?.onInteractAction) {
      const payload = logicTile.onInteractPayload ? JSON.parse(logicTile.onInteractPayload) : {};
      
      switch (logicTile.onInteractAction) {
        case 'HARVEST_WOOD':
          soundSynth.playWoodcuttingSound();
          gainSkillXp('woodcutting', payload.xp || 25);
          showToast(`Harvested Wood Logs (+${payload.xp || 25} Woodcutting XP)`);
          return;
        case 'HARVEST_ORE':
          soundSynth.playMiningSound();
          gainSkillXp('mining', payload.xp || 30);
          showToast(`Mined Copper Ore (+${payload.xp || 30} Mining XP)`);
          return;
      }
    }

    // NPC Interaction Check (Combined Map Data + Dynamic Entities)
    const dynamicEntities = useGameStore.getState().mapEntities || [];
    let nearbyNpc = null;
    let isDynamic = false;

    // Check static imported Tuxemon NPCs first
    nearbyNpc = activeMap?.npcs?.find((npc: any) => npc.x === faceX && npc.y === faceY);
    
    // Fallback to checking Dev Editor placed dynamic entities
    if (!nearbyNpc) {
      const ent = dynamicEntities.find((e) => Math.round(e.position.x) === faceX && Math.round(e.position.y) === faceY && (e.mapId === currentMapId || !e.mapId));
      if (ent) {
        nearbyNpc = {
          id: ent.id,
          name: ent.name || 'NPC',
          dialogueKey: ent.dialogueKey || 'Hello, traveler.'
        };
        isDynamic = true;
      }
    }

    if (nearbyNpc) {
      useGameStore.setState({
        activeDialog: {
          npcId: nearbyNpc.id,
          npcName: nearbyNpc.name || 'Stranger',
          text: nearbyNpc.dialogueKey || 'Greetings, Tamer! Welcome to the grounds.'
        },
        gameMode: 'DIALOG'
      });
    } else {
      showToast('Nothing to interact with here.');
    }
  };

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

    if (onCanvasReady) {
      onCanvasReady(babylonEngine);
    }

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
          // Fix: /assets/sprites/ does not exist. Sprites are in /assets/npcs/ or full path from Tuxemon
          spriteUrl: freshPlayer.spriteId
            ? (freshPlayer.spriteId.startsWith('/') ? freshPlayer.spriteId : `/tuxemon-assets/npc/${freshPlayer.spriteId}.png`)
            : undefined,
          isPlayer: true,
          direction: freshPlayer.direction,
          isMoving: freshPlayer.isMoving,
          chatMessage: useGameStore.getState().localChat || undefined
        });

        // Camera smoothly tracks player (already snapped on first tick)
        babylonEngine.setCameraPosition(worldX, worldZ, 0.08);
      }

      // Render connected multiplayer players
      const freshOtherPlayers = useGameStore.getState().otherPlayers;
      if (freshOtherPlayers) {
        Object.entries(freshOtherPlayers).forEach(([socketId, other]) => {
          const ox = (other.x || 6) - mapWidth / 2;
          const oz = mapHeight / 2 - (other.y || 2);
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Tamer',
            x: ox,
            y: oz,
            spriteUrl: other.spriteId
              ? (other.spriteId.startsWith('/') ? other.spriteId : `/tuxemon-assets/npc/${other.spriteId}.png`)
              : undefined,
            isPlayer: true,
            direction: other.direction,
            isMoving: other.isMoving,
            chatMessage: other.chatMessage
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
              isPlayer: false
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
      // Click-to-move in exploration mode
      engine.enableTilePicking((r, c) => {
        tryMovePlayerTo(c, r);
      });
    }
  }, [isDevEditorOpen, activeBrushTileId, mapData, activeLayerIdx]);

  // Handle Keyboard WASD & Arrow Key Movement
  useEffect(() => {
    let lastMoveTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Interact Key (E / Space)
      if (key === 'e' || key === ' ') {
        handleInteract();
        return;
      }

      if (now - lastMoveTime < 240) return; // Throttle step frequency to match animation speed

      let dx = 0;
      let dy = 0;

      if (key === 'w' || key === 'arrowup') dy = -1;
      else if (key === 's' || key === 'arrowdown') dy = 1;
      else if (key === 'a' || key === 'arrowleft') dx = -1;
      else if (key === 'd' || key === 'arrowright') dx = 1;

      if (dx !== 0 || dy !== 0) {
        tryMoveDirection(dx, dy);
        lastMoveTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        className="w-full h-full outline-none touch-none cursor-crosshair"
        tabIndex={0}
        onClick={(e) => (e.currentTarget as HTMLCanvasElement).focus()}
      />
      
      {/* 2.5D HUD Badge */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-violet-500/40 text-xs font-mono text-violet-200 flex items-center gap-2.5 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
        <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
        <span className="text-slate-400">Map:</span>
        <strong className="text-white">{activeMap?.name || currentMapId}</strong>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Pos:</span>
        <strong className="text-amber-300">({player.position?.x ?? 0}, {player.position?.y ?? 0})</strong>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500 hidden sm:inline">BGD / Click to Move</span>
      </div>

      {/* On-Screen Touch / Mouse Control D-Pad & Talk Action Button */}
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
    </div>
  );
};

export default GameCanvasBabylon;
