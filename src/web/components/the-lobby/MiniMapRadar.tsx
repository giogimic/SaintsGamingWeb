'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';
import { Compass, Map, Settings, Hammer, LogOut, Radio } from 'lucide-react';
import { useEditorStore } from './editor/editor-store';
import { soundSynth } from '@/engine/sound-synth';

const TILE_COLORS: Record<number, string> = {
  0: '#132a1c',  // Safe walkable — dark neon green
  1: '#070b10',  // Wall / Void — black
  2: '#0d3816',  // Tall grass — vivid green
  3: '#78350f',  // Gate — amber
  4: '#1e3a8a',  // Gate alt — blue
  5: '#064e3b',  // Woodcutting
  6: '#334155',  // Ore
  7: '#854d0e',  // Shop — warm gold
  8: '#0369a1',  // Clinic — cyan blue
  9: '#1e293b',  // Crafting
  10: '#1d4ed8', // Water / Fishing
  12: '#312e81', // Terminal
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
    ctx.fillStyle = '#050a12';
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

    // Scan-line overlay for cyber HUD effect
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = 0; y < ch; y += 3) {
      ctx.fillRect(0, y, cw, 1);
    }

    // Draw NPCs — cyan/blue dots
    mapEntities.forEach((ent) => {
      if (!ent.mapId || ent.mapId === currentMapId) {
        ctx.fillStyle = '#00f5d4';
        ctx.beginPath();
        ctx.arc(
          ent.position.x * cellW + cellW / 2,
          ent.position.y * cellH + cellH / 2,
          Math.max(1.8, cellW * 0.9),
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
      ctx.fillStyle = isParty ? '#00f5d4' : '#ffbe0b';
      ctx.beginPath();
      ctx.arc(
        peer.x * cellW + cellW / 2,
        peer.y * cellH + cellH / 2,
        Math.max(2, cellW * (isParty ? 1.3 : 1.1)),
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = isParty ? 'rgba(0, 245, 212, 0.9)' : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = isParty ? 1.5 : 1;
      ctx.stroke();
    });

    // Player pulsing indicator
    const now = Date.now();
    const pulse = Math.abs(Math.sin(now * 0.005));
    const r = Math.max(2.5, cellW * 1.6);

    // Glow ring
    ctx.fillStyle = `rgba(0, 245, 212, ${0.25 + pulse * 0.35})`;
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
    ctx.fillStyle = `rgba(0, 245, 212, ${0.9 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellW + cellW / 2,
      playerPos.y * cellH + cellH / 2,
      r,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Center spark
    ctx.fillStyle = '#ffffff';
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
    <div
      className="pointer-events-auto w-[min(92vw,180px)] select-none font-mono"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
    >
      <div
        className="w-full bg-[#0a0318]/95 border border-pink-500/30 rounded-2xl p-2.5 backdrop-blur-xl relative overflow-hidden flex flex-col gap-2"
        style={{
          clipPath: 'polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px)',
          boxShadow: '0 0 20px rgba(242,0,137,0.15), inset 0 0 15px rgba(0,0,0,0.8)',
        }}
      >
        {/* 1. Header Action Row: Quick Navigation Buttons */}
        <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-pink-500/20">
          <button
            type="button"
            onClick={handleOpenOptionsClick}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
            title="Game Settings (ESC)"
          >
            <Settings className="w-3 h-3 text-[#00f5d4]" />
            <span>Options</span>
          </button>

          {enableStudio ? (
            <button
              type="button"
              onClick={() => {
                soundSynth?.playSelectSound?.();
                useEditorStore.getState().toggleCreationMode();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
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
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
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
            className="flex items-center justify-center p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-white transition-colors cursor-pointer"
            title="Leave Game (Return to Portal)"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>

        {/* 2. Middle Section: Radar Thumbnail with Compass Ticks */}
        <div className="relative h-28 w-full overflow-hidden rounded-xl border border-[#00f5d4]/40 bg-[#02060a] shadow-inner">
          <canvas ref={canvasRef} width={160} height={120} className="absolute inset-0 h-full w-full opacity-90" />

          {/* Compass Cardinal Overlays */}
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-[#00f5d4] drop-shadow-[0_1px_2px_rgba(0,0,0,1)] pointer-events-none">N</span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black text-cyan-400/60 pointer-events-none">S</span>
          <span className="absolute top-1/2 left-1 -translate-y-1/2 text-[8px] font-mono font-black text-cyan-400/60 pointer-events-none">W</span>
          <span className="absolute top-1/2 right-1 -translate-y-1/2 text-[8px] font-mono font-black text-cyan-400/60 pointer-events-none">E</span>

          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-black uppercase tracking-widest text-[#00f5d4] border border-[#00f5d4]/30 flex items-center gap-1">
            <Radio size={8} className="animate-pulse" />
            RADAR
          </div>
        </div>

        {/* 3. Footer Line: Location Label & Coordinates Readout */}
        <div className="flex flex-col gap-1 pt-1.5 border-t border-pink-500/20">
          <div className="flex items-center gap-1.5 text-[10px] text-white font-black truncate">
            <Map className="h-3 w-3 shrink-0 text-[#00f5d4]" />
            <span className="truncate">
              {mapName}
              {channelText}
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Compass className="h-2.5 w-2.5 text-amber-400" />
              <span>COORDS</span>
            </div>
            <div className="text-white font-mono font-bold text-[10px] tracking-wide">
              <span className="text-cyan-400">X:</span> {playerPos.x}{' '}
              <span className="text-cyan-400 ml-1">Y:</span> {playerPos.y}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
