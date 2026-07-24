'use client';

import React, { useEffect, useRef } from 'react';
import { BabylonEngine } from '@/lib/game/BabylonEngine';
import { useGameStore } from '../store';
import { GAME_MAPS } from '../data/maps';
import { soundSynth } from '@/lib/game/sound-synth';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Hand } from 'lucide-react';

interface GameCanvasBabylonProps {
  onCanvasReady?: (engine: BabylonEngine) => void;
  activeBrushTileId?: number;
  isDevEditorOpen?: boolean;
}

export const GameCanvasBabylon: React.FC<GameCanvasBabylonProps> = ({
  onCanvasReady,
  activeBrushTileId = 1,
  isDevEditorOpen = false
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

  // Load Active Map Data or Default Fallback
  const mapData = GAME_MAPS[currentMapId] || {
    id: 'DEFAULT_MAP',
    name: 'Tamer Grounds',
    grid: Array(24).fill(0).map((_, r) => 
      Array(24).fill(0).map((_, c) => 
        (r === 0 || r === 23 || c === 0 || c === 23) ? 1 : (r % 5 === 0 && c % 5 === 0) ? 2 : 0
      )
    )
  };

  const mapWidth = mapData.grid[0]?.length || 24;
  const mapHeight = mapData.grid.length || 24;

  // Unified Movement Execution Engine
  const tryMovePlayerTo = (targetX: number, targetY: number) => {
    const nextX = Math.max(0, Math.min(mapWidth - 1, targetX));
    const nextY = Math.max(0, Math.min(mapHeight - 1, targetY));

    // Collision check (Tile 1 = Solid Wall)
    const targetTile = mapData.grid[nextY]?.[nextX];
    if (targetTile === 1) {
      showToast('Blocked by obstacle!');
      return;
    }

    setPlayerPosition({ x: nextX, y: nextY });
    emitSocketEvent?.('move', { x: nextX, y: nextY });

    // Tall Grass Wild Encounter Trigger Check (Tile 2)
    if (targetTile === 2) {
      const roll = Math.random() * 100;
      if (roll < 15) { // 15% chance per step in grass
        const pool = mapData.encounterPool || [{ speciesId: 'ignis', minLevel: 2, maxLevel: 5 }];
        const wildSpecies = pool[Math.floor(Math.random() * pool.length)];
        soundSynth.playEncounterSound();
        showToast(`Wild ${wildSpecies.speciesId.toUpperCase()} appeared!`);
        useGameStore.getState().setGameMode('BATTLE');
      }
    }

    // Warp Gate Transition Check (Tile 3/4)
    if ((targetTile === 3 || targetTile === 4) && mapData.gates?.[targetTile]) {
      const gate = mapData.gates[targetTile];
      useGameStore.setState({ currentMapId: gate.targetMapId });
      setPlayerPosition(gate.spawnPoint);
      showToast(`Warped to ${gate.targetMapId}`);
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
    const currentTile = mapData.grid[curY]?.[curX];

    // Resource Node Harvesting
    if (currentTile === 5) {
      soundSynth.playWoodcuttingSound();
      gainSkillXp('woodcutting', 25);
      showToast('Harvested Wood Logs (+25 Woodcutting XP)');
      return;
    } else if (currentTile === 6) {
      soundSynth.playMiningSound();
      gainSkillXp('mining', 30);
      showToast('Mined Copper Ore (+30 Mining XP)');
      return;
    }

    // NPC Interaction Check (Combined Map Data + Dynamic Entities)
    const dynamicEntities = useGameStore.getState().mapEntities || [];
    let nearbyNpc = null;
    let isDynamic = false;

    // Check static imported Tuxemon NPCs first
    nearbyNpc = mapData.npcs?.find((npc) => Math.abs(npc.x - curX) <= 2 && Math.abs(npc.y - curY) <= 2);
    
    // Fallback to checking Dev Editor placed dynamic entities
    if (!nearbyNpc) {
      const ent = dynamicEntities.find((e) => Math.abs(e.position.x - curX) <= 2 && Math.abs(e.position.y - curY) <= 2 && (e.mapId === currentMapId || !e.mapId));
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
          text: nearbyNpc.dialogueKey || 'Greetings, Tamer! Welcome to the grounds.'
        },
        gameMode: 'DIALOG'
      });
    } else {
      showToast('No NPC nearby. Use WASD / Arrows or D-Pad to move.');
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize 2.5D Babylon Engine
    const babylonEngine = new BabylonEngine(canvasRef.current);
    engineRef.current = babylonEngine;

    if (onCanvasReady) {
      onCanvasReady(babylonEngine);
    }

    // Load actual map grid and NPCs
    babylonEngine.loadTilemap({
      id: currentMapId,
      width: mapWidth,
      height: mapHeight,
      tileSize: 1,
      tiles: mapData.grid,
      tileLayers: (mapData as any).tileLayers,
      tilesets: (mapData as any).tilesets,
      npcs: mapData.npcs
    });

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
          spriteUrl: freshPlayer.spriteId ? `/assets/sprites/${freshPlayer.spriteId}.png` : undefined,
          isPlayer: true,
          chatMessage: useGameStore.getState().localChat || undefined
        });

        // Camera tracks player position smoothly
        babylonEngine.setCameraPosition(worldX, worldZ, 0.1);
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
            spriteUrl: other.spriteId ? `/assets/sprites/${other.spriteId}.png` : undefined,
            isPlayer: false,
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
              name: '',
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
  }, [currentMapId, mapData.grid]);

  // Handle Live Dev Editor Tile Picking & Click-to-Move
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isDevEditorOpen) {
      engine.enableTilePicking((r, c) => {
        engine.updateSingleTile(r, c, activeBrushTileId);
        if (mapData.grid[r]) {
          mapData.grid[r][c] = activeBrushTileId;
        }
      });
    } else {
      // Click-to-move in exploration mode
      engine.enableTilePicking((r, c) => {
        tryMovePlayerTo(c, r);
      });
    }
  }, [isDevEditorOpen, activeBrushTileId, mapData.grid]);

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

      if (now - lastMoveTime < 100) return; // Throttle step frequency

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
  }, [mapWidth, mapHeight, mapData.grid, mapData.gates]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050508] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none touch-none cursor-crosshair"
        tabIndex={0}
        onClick={(e) => (e.currentTarget as HTMLCanvasElement).focus()}
      />
      
      {/* 2.5D HUD Badge */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded bg-black/75 backdrop-blur border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>Map: <strong className="text-white">{mapData.name || currentMapId}</strong></span>
        <span className="text-slate-500">|</span>
        <span>Pos: <strong className="text-amber-400">({player.position?.x ?? 0}, {player.position?.y ?? 0})</strong></span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">WASD / Click to Move</span>
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
