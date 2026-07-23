'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';
import { Compass } from 'lucide-react';

export default function MiniMapRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentMapId = useGameStore(state => state.currentMapId);
  const playerPos = useGameStore(state => state.player.position);
  const mapEntities = useGameStore(state => state.mapEntities);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapData = GAME_MAPS[currentMapId];
    if (!mapData || !mapData.grid) return;

    const grid = mapData.grid;
    const rows = grid.length;
    const cols = grid[0].length;

    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Map Grid Background
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val === 1) {
          ctx.fillStyle = '#0f172a'; // Wall
        } else if (val === 2) {
          ctx.fillStyle = '#14532d'; // Grass
        } else if (val >= 3) {
          ctx.fillStyle = '#d97706'; // Warp gate
        } else {
          ctx.fillStyle = '#1e293b'; // Walkable path
        }
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }

    // Draw NPCs
    mapEntities.forEach(ent => {
      if (!ent.mapId || ent.mapId === currentMapId) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ent.position.x * cellW + cellW / 2, ent.position.y * cellH + cellH / 2, cellW * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Player Pulse
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(playerPos.x * cellW + cellW / 2, playerPos.y * cellH + cellH / 2, cellW * 1.2, 0, Math.PI * 2);
    ctx.fill();

  }, [currentMapId, playerPos, mapEntities]);

  const mapName = GAME_MAPS[currentMapId]?.name || currentMapId;

  return (
    <div className="absolute top-16 right-4 z-20 pointer-events-none flex flex-col items-end gap-1 font-mono select-none">
      <div className="w-28 h-28 bg-black/80 border-2 border-emerald-500/50 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)] p-1 backdrop-blur-sm">
        <canvas ref={canvasRef} width={100} height={100} className="w-full h-full object-contain" />
      </div>
      <div className="bg-black/80 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] text-emerald-400 font-bold flex items-center gap-1 shadow">
        <Compass className="w-3 h-3 text-emerald-400" />
        <span>{mapName} ({playerPos.x}, {playerPos.y})</span>
      </div>
    </div>
  );
}
