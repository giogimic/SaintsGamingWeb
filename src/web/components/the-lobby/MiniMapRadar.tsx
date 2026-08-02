'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';
import { Compass, Map } from 'lucide-react';

const TILE_COLORS: Record<number, string> = {
  0: '#1a3520',  // Safe walkable — dark forest green
  1: '#0c1014',  // Wall — near black
  2: '#144d1e',  // Tall grass — vivid green
  3: '#92400e',  // Gate — amber
  4: '#1e40af',  // Gate alt — blue
  5: '#064e3b',  // Woodcutting
  6: '#374151',  // Ore
  7: '#78350f',  // Shop — warm brown
  8: '#0c4a6e',  // Clinic — blue
  9: '#1f2937',  // Crafting
  10: '#1d4ed8', // Water / Fishing
  12: '#1e1b4b', // Terminal
};

export default function MiniMapRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const currentMapId = useGameStore(state => state.currentMapId);
  const instanceId = useGameStore(state => state.instanceId);
  const playerPos = useGameStore(state => state.player.position);
  const mapEntities = useGameStore(state => state.mapEntities);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapData = GAME_MAPS[currentMapId];
    if (!mapData || !mapData.grid) return;

    const grid = mapData.grid;
    const rows = grid.length;
    const cols = grid[0].length;

    const cw = canvas.width;
    const ch = canvas.height;
    const cellW = cw / cols;
    const cellH = ch / rows;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = '#050a10';
    ctx.fillRect(0, 0, cw, ch);

    // Draw tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        ctx.fillStyle = TILE_COLORS[val] ?? TILE_COLORS[0];
        ctx.fillRect(
          Math.floor(c * cellW),
          Math.floor(r * cellH),
          Math.ceil(cellW) + 1,
          Math.ceil(cellH) + 1
        );
      }
    }

    // Scan-line overlay for retro effect
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let y = 0; y < ch; y += 3) {
      ctx.fillRect(0, y, cw, 1);
    }

    // Draw NPCs — blue dots
    mapEntities.forEach(ent => {
      if (!ent.mapId || ent.mapId === currentMapId) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(
          ent.position.x * cellW + cellW / 2,
          ent.position.y * cellH + cellH / 2,
          Math.max(1.5, cellW * 0.9),
          0, Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Player pulsing dot (animate)
    const now = Date.now();
    const pulse = Math.abs(Math.sin(now * 0.004));
    const r = Math.max(2, cellW * 1.5);

    // Glow ring
    ctx.fillStyle = `rgba(16, 185, 129, ${0.2 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      r * 2,
      0, Math.PI * 2
    );
    ctx.fill();

    // Core dot
    ctx.fillStyle = `rgba(52, 211, 153, ${0.85 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      r,
      0, Math.PI * 2
    );
    ctx.fill();

    // White center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      Math.max(1, r * 0.4),
      0, Math.PI * 2
    );
    ctx.fill();
  }, [currentMapId, playerPos, mapEntities]);

  // Animate minimap at ~20fps for pulse effect
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      draw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    animFrameRef.current = frameId;
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  const mapData = GAME_MAPS[currentMapId];
  let mapName = mapData?.name || currentMapId;
  
  // Extract channel from instanceId (e.g. SAINTS_VILLAGE_ch1 -> "Ch. 1")
  let channelText = "";
  if (instanceId && instanceId.includes("_ch")) {
    const chMatch = instanceId.match(/_ch(\d+)$/);
    if (chMatch) channelText = ` (Ch. ${chMatch[1]})`;
  } else if (instanceId && instanceId.includes("_acc")) {
    channelText = " (Private)";
  }

  return (
    <div className="pointer-events-none absolute top-16 right-4 z-20 flex select-none flex-col items-end gap-1 font-mono">
      <div className="lobby-panel relative h-32 w-32 overflow-hidden rounded-xl shadow-[0_0_24px_rgba(167,139,250,0.22)]">
        <canvas ref={canvasRef} width={128} height={128} className="absolute inset-0 h-full w-full" />
        <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-lobby-film/70" />
        <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-lobby-film/70" />
        <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-lobby-soul/70" />
        <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-lobby-soul/70" />
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold tracking-widest text-lobby-fog/80">
          MAP
        </div>
      </div>

      <div className="lobby-panel flex max-w-[10rem] items-center gap-1.5 overflow-hidden rounded px-2 py-0.5 text-[10px] text-lobby-mist">
        <Map className="h-3 w-3 shrink-0 text-lobby-film" />
        <span className="truncate">
          {mapName}
          {channelText}
        </span>
      </div>

      <div className="lobby-panel flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] text-lobby-fog">
        <Compass className="h-2.5 w-2.5 text-lobby-soul" />
        <span className="text-lobby-film">X</span>
        <span className="text-lobby-mist">{playerPos.x}</span>
        <span className="ml-0.5 text-lobby-film">Y</span>
        <span className="text-lobby-mist">{playerPos.y}</span>
      </div>
    </div>
  );
}
