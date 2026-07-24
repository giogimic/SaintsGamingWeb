'use client';

import React, { useEffect, useRef } from 'react';
import { BabylonEngine } from '@/lib/game/BabylonEngine';
import { useGameStore } from '../store';
import { GAME_MAPS } from '../data/maps';

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
      width: mapWidth,
      height: mapHeight,
      tileSize: 1,
      tiles: mapData.grid,
      npcs: mapData.npcs
    });

    // Start 60FPS Render Loop
    babylonEngine.startRenderLoop(() => {
      if (player && player.position) {
        const px = player.position.x || 6;
        const py = player.position.y || 2;
        const worldX = px - mapWidth / 2;
        const worldZ = mapHeight / 2 - py;

        babylonEngine.updateEntity({
          id: 'player_main',
          name: player.name || 'Hero',
          x: worldX,
          y: worldZ,
          spriteUrl: player.spriteId ? `/assets/sprites/${player.spriteId}.png` : undefined,
          isPlayer: true
        });

        // Camera tracks player position smoothly
        babylonEngine.setCameraPosition(worldX, worldZ, 0.1);
      }

      // Render connected multiplayer players
      if (otherPlayers) {
        Object.entries(otherPlayers).forEach(([socketId, other]) => {
          const ox = (other.x || 6) - mapWidth / 2;
          const oz = mapHeight / 2 - (other.y || 2);
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Tamer',
            x: ox,
            y: oz,
            spriteUrl: other.spriteId ? `/assets/sprites/${other.spriteId}.png` : undefined,
            isPlayer: false
          });
        });
      }
    });

    return () => {
      babylonEngine.dispose();
      engineRef.current = null;
    };
  }, [currentMapId]);

  // Handle Live Dev Editor Tile Picking
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isDevEditorOpen) {
      engine.enableTilePicking((r, c) => {
        engine.updateSingleTile(r, c, activeBrushTileId);
        // Mutate grid locally in mapData for immediate feedback
        if (mapData.grid[r]) {
          mapData.grid[r][c] = activeBrushTileId;
        }
      });
    } else {
      engine.disableTilePicking();
    }
  }, [isDevEditorOpen, activeBrushTileId]);

  // Handle WASD, Arrow Keys & Action Key (E / Space) Triggers
  useEffect(() => {
    let lastMoveTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture inputs if user is typing in form elements
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Action Key 'E' or Space: Interact with NPCs or Harvest Resource Nodes
      if (key === 'e' || key === ' ') {
        const curX = player.position?.x || 6;
        const curY = player.position?.y || 2;
        const currentTile = mapData.grid[curY]?.[curX];

        // Resource Node Harvesting
        if (currentTile === 5) {
          gainSkillXp('woodcutting', 25);
          showToast('Harvested Wood Logs (+25 Woodcutting XP)');
        } else if (currentTile === 6) {
          gainSkillXp('mining', 30);
          showToast('Mined Copper Ore (+30 Mining XP)');
        }

        // NPC Interaction Check
        const nearbyNpc = mapData.npcs?.find((npc) => Math.abs(npc.x - curX) <= 1 && Math.abs(npc.y - curY) <= 1);
        if (nearbyNpc) {
          showToast(`${nearbyNpc.name}: "${nearbyNpc.dialogueKey || 'Greetings, Tamer!'}"`);
        }
        return;
      }

      if (now - lastMoveTime < 120) return; // 120ms movement throttle

      let dx = 0;
      let dy = 0;

      if (key === 'w' || key === 'arrowup') dy = -1;
      else if (key === 's' || key === 'arrowdown') dy = 1;
      else if (key === 'a' || key === 'arrowleft') dx = -1;
      else if (key === 'd' || key === 'arrowright') dx = 1;

      if (dx !== 0 || dy !== 0) {
        const curX = player.position?.x || 6;
        const curY = player.position?.y || 2;
        const nextX = Math.max(0, Math.min(mapWidth - 1, curX + dx));
        const nextY = Math.max(0, Math.min(mapHeight - 1, curY + dy));

        // Check grid collision (tile 1 = wall/solid)
        const targetTile = mapData.grid[nextY]?.[nextX];
        if (targetTile !== 1) {
          setPlayerPosition({ x: nextX, y: nextY });
          emitSocketEvent?.('move', { x: nextX, y: nextY });
          lastMoveTime = now;

          // Tall Grass Wild Encounter Trigger Check (Tile 2)
          if (targetTile === 2) {
            const roll = Math.random() * 100;
            if (roll < 12) { // 12% chance per step in grass
              const pool = mapData.encounterPool || [{ speciesId: 'ignis', minLevel: 2, maxLevel: 5 }];
              const wildSpecies = pool[Math.floor(Math.random() * pool.length)];
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player.position, mapWidth, mapHeight, setPlayerPosition, emitSocketEvent, gainSkillXp, showToast]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#050508] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none touch-none cursor-crosshair"
      />
      
      {/* 2.5D HUD Badge */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded bg-black/75 backdrop-blur border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>Map: <strong className="text-white">{mapData.name || currentMapId}</strong></span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">WASD to Move | Press E to Interact</span>
      </div>
    </div>
  );
};

export default GameCanvasBabylon;
