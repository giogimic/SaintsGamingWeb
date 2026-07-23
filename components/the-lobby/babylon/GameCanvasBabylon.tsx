'use client';

import React, { useEffect, useRef } from 'react';
import { BabylonEngine } from '@/lib/game/BabylonEngine';
import { useGameStore } from '../store';

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
  const _currentMapId = useGameStore((state) => state.currentMapId);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize 2.5D Babylon Engine
    const babylonEngine = new BabylonEngine(canvasRef.current);
    engineRef.current = babylonEngine;

    if (onCanvasReady) {
      onCanvasReady(babylonEngine);
    }

    // Load map tile data
    const defaultTiles = Array(20).fill(0).map(() => Array(20).fill(1));
    babylonEngine.loadTilemap({
      width: 20,
      height: 20,
      tileSize: 1,
      tiles: defaultTiles
    });

    // Enable live tile painting if Dev Editor is active
    if (isDevEditorOpen) {
      babylonEngine.enableTilePicking((r, c) => {
        babylonEngine.updateSingleTile(r, c, activeBrushTileId);
      });
    } else {
      babylonEngine.disableTilePicking();
    }

    // Start 60FPS Render Loop
    babylonEngine.startRenderLoop(() => {
      if (player && player.position) {
        const px = player.position.x || 6;
        const py = player.position.y || 2;
        babylonEngine.updateEntity({
          id: 'player_main',
          name: player.name || 'Hero',
          x: px - 10,
          y: 10 - py,
          spriteUrl: player.spriteId ? `/assets/sprites/${player.spriteId}.png` : '/assets/sprites/player.png',
          isPlayer: true
        });

        // Camera tracks player smoothly
        babylonEngine.setCameraPosition(px - 10, 10 - py, 0.1);
      }

      // Render connected multiplayer players
      if (otherPlayers) {
        Object.entries(otherPlayers).forEach(([socketId, other]) => {
          babylonEngine.updateEntity({
            id: `multiplayer_${socketId}`,
            name: other.name || 'Tamer',
            x: (other.x || 10) - 10,
            y: 10 - (other.y || 10),
            spriteUrl: other.spriteId ? `/assets/sprites/${other.spriteId}.png` : '/assets/sprites/player.png',
            isPlayer: false
          });
        });
      }
    });

    return () => {
      babylonEngine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050508] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full outline-none touch-none cursor-crosshair"
      />
      
      {/* 2.5D Watermark & Controls Badge */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded bg-black/70 backdrop-blur border border-white/10 text-xs font-mono text-cyan-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        Babylon 2.5D Engine | Press <kbd className="px-1.5 py-0.5 bg-cyan-950 border border-cyan-500/30 rounded text-[10px] text-cyan-300">Ctrl + E</kbd> for Dev Editor
      </div>
    </div>
  );
};

export default GameCanvasBabylon;
