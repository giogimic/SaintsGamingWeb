'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';
import { Compass, Map, Settings, Hammer, LogOut } from 'lucide-react';
import { HudPanelShell } from './hud/HudPanelShell';
import { useEditorStore } from './editor/editor-store';
import { soundSynth } from '@/engine/sound-synth';

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

interface MiniMapRadarProps {
  onOpenOptions?: () => void;
  enableStudio?: boolean;
}

export default function MiniMapRadar({ onOpenOptions, enableStudio = false }: MiniMapRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const instanceId = useGameStore((state) => state.instanceId);
  const playerPos = useGameStore((state) => state.player.position);
  const mapEntities = useGameStore((state) => state.mapEntities);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const otherPlayers = useGameStore((state) => state.otherPlayers);
  const studioToolsOpen = useEditorStore((s) => s.isCreationMode);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mapData = activeMapData || GAME_MAPS[currentMapId];
    if (!mapData || !mapData.grid) return;

    const grid = mapData.grid;
    const rows = grid.length;
    if (rows === 0) return;
    const cols = grid[0].length;

    const cw = canvas.width;
    const ch = canvas.height;
    const cellW = cw / cols;
    const cellH = ch / rows;

    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = '#04090e';
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

    // Scan-line overlay for retro cyber HUD effect
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < ch; y += 3) {
      ctx.fillRect(0, y, cw, 1);
    }

    // Draw NPCs — blue/cyan dots
    mapEntities.forEach((ent) => {
      if (!ent.mapId || ent.mapId === currentMapId) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(
          ent.position.x * cellW + cellW / 2,
          ent.position.y * cellH + cellH / 2,
          Math.max(1.5, cellW * 0.9),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    });

    // Multiplayer peers — amber dots (or cyan for party members)
    const partyMembers = useGameStore.getState().player.party || [];
    const partyNames = new Set(partyMembers.map((m: any) => m.name));

    Object.values(otherPlayers || {}).forEach((peer) => {
      if (typeof peer.x !== 'number' || typeof peer.y !== 'number') return;
      const isParty = partyNames.has(peer.name);
      ctx.fillStyle = isParty ? '#22d3ee' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(
        peer.x * cellW + cellW / 2,
        peer.y * cellH + cellH / 2,
        Math.max(2, cellW * (isParty ? 1.3 : 1.1)),
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = isParty ? 'rgba(34, 211, 238, 0.9)' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = isParty ? 1.5 : 1;
      ctx.stroke();
    });

    // Player pulsing emerald indicator
    const now = Date.now();
    const pulse = Math.abs(Math.sin(now * 0.004));
    const r = Math.max(2, cellW * 1.5);

    // Glow ring
    ctx.fillStyle = `rgba(20, 184, 166, ${0.2 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      r * 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Core dot
    ctx.fillStyle = `rgba(45, 212, 191, ${0.85 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      r,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // White center
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      Math.max(1, r * 0.4),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }, [currentMapId, playerPos, mapEntities, otherPlayers, activeMapData]);

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

  const mapData = activeMapData || GAME_MAPS[currentMapId];
  const mapName = mapData?.name || currentMapId;

  let channelText = '';
  if (instanceId && instanceId.includes('_ch')) {
    const chMatch = instanceId.match(/_ch(\d+)$/);
    if (chMatch) channelText = ` (Ch. ${chMatch[1]})`;
  } else if (instanceId && instanceId.includes('_acc')) {
    channelText = ' (Private)';
  }

  const handleOpenOptionsClick = () => {
    soundSynth?.playSelectSound?.();
    if (onOpenOptions) {
      onOpenOptions();
    } else {
      window.dispatchEvent(new CustomEvent('open_game_options'));
    }
  };

  return (
    <HudPanelShell className="pointer-events-auto w-[min(92vw,176px)]">
      {/* 1. Header Action Row: Quick Buttons */}
      <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-teal-500/20">
        <button
          type="button"
          onClick={handleOpenOptionsClick}
          className="flex items-center gap-1 px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 text-teal-300 hover:text-white text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
          title="Game Settings (ESC)"
        >
          <Settings className="w-3 h-3 text-teal-400" />
          <span>Options</span>
        </button>

        {enableStudio ? (
          <button
            type="button"
            onClick={() => {
              soundSynth?.playSelectSound?.();
              useEditorStore.getState().toggleCreationMode();
            }}
            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              studioToolsOpen
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title="Toggle Studio Editor (Ctrl+E)"
          >
            <Hammer className="w-3 h-3 text-amber-400" />
            <span>{studioToolsOpen ? 'Play' : 'Edit'}</span>
          </button>
        ) : (
          <a
            href="/studio"
            onClick={() => soundSynth?.playSelectSound?.()}
            className="flex items-center gap-1 px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 text-amber-300/80 hover:text-amber-200 text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Open Studio Map Editor"
          >
            <Hammer className="w-3 h-3 text-amber-400" />
            <span>Studio</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => {
            soundSynth?.playSelectSound?.();
            window.location.href = '/';
          }}
          className="flex items-center justify-center p-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
          title="Leave Game (Return to Website)"
        >
          <LogOut className="w-3 h-3" />
        </button>
      </div>

      {/* 2. Middle Section: Radar Thumbnail with Compass Ticks */}
      <div className="relative h-28 w-full overflow-hidden rounded border border-teal-500/30 bg-[#02060a] shadow-inner mb-1.5">
        <canvas ref={canvasRef} width={160} height={120} className="absolute inset-0 h-full w-full opacity-85" />
        
        {/* Compass Cardinal Overlays */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-cyan-400/60 pointer-events-none">N</span>
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-cyan-400/40 pointer-events-none">S</span>
        <span className="absolute top-1/2 left-0.5 -translate-y-1/2 text-[8px] font-mono font-black text-cyan-400/40 pointer-events-none">W</span>
        <span className="absolute top-1/2 right-0.5 -translate-y-1/2 text-[8px] font-mono font-black text-cyan-400/40 pointer-events-none">E</span>

        <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[8px] font-mono font-black uppercase tracking-widest text-teal-400/70 border border-teal-500/20">
          RADAR
        </div>
      </div>

      {/* 3. Footer Line: Location Label & Coordinates Readout */}
      <div className="flex flex-col gap-0.5 pt-1 border-t border-teal-500/20 font-mono">
        <div className="flex items-center gap-1 text-[10px] text-slate-200 font-bold truncate">
          <Map className="h-3 w-3 shrink-0 text-teal-400" />
          <span className="truncate">
            {mapName}
            {channelText}
          </span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-teal-300/60 font-medium">
          <div className="flex items-center gap-1">
            <Compass className="h-2.5 w-2.5 text-teal-400" />
            <span>POS</span>
          </div>
          <div className="text-teal-100 font-mono font-bold text-[10px] tracking-wide">
            <span className="text-teal-400/60">X:</span> {playerPos.x}{' '}
            <span className="text-teal-400/60 ml-1">Y:</span> {playerPos.y}
          </div>
        </div>
      </div>
    </HudPanelShell>
  );
}

