'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Compass,
  Paintbrush,
  MapPin,
  Maximize2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';

export interface SetupStartingMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  tileLayers: Array<{ name: string; grid: number[][] }>;
  spawnPoint: { x: number; y: number };
}

interface StartingMapStepProps {
  environment: SetupEnvironmentData;
  startingMap: SetupStartingMapData;
  onChange: (map: SetupStartingMapData) => void;
  onNext: () => void;
  onBack: () => void;
}

const BRUSHES = [
  { id: 'ground', label: 'Default Ground', color: '#16a34a', gid: 17, isSolid: false },
  { id: 'dirt', label: 'Dirt Path', color: '#92400e', gid: 32, isSolid: false },
  { id: 'stone', label: 'Cobblestone', color: '#64748b', gid: 60, isSolid: false },
  { id: 'water', label: 'Water', color: '#0284c7', gid: 80, isSolid: true },
  { id: 'barrier', label: 'Solid Barrier', color: '#dc2626', gid: 1, isSolid: true },
];

export function StartingMapStep({
  environment,
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const [toolMode, setToolMode] = useState<'paint' | 'spawn'>('paint');
  const [activeBrush, setActiveBrush] = useState(BRUSHES[0]);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize or resize map if needed
  const width = startingMap.width || 24;
  const height = startingMap.height || 24;

  const handleResize = (newW: number, newH: number) => {
    const clampedW = Math.max(8, Math.min(64, newW));
    const clampedH = Math.max(8, Math.min(64, newH));

    const defaultGid = environment.defaultGroundGid || 17;

    const newGrid = Array.from({ length: clampedH }, (_, r) =>
      Array.from({ length: clampedW }, (_, c) => {
        if (startingMap.grid && r < startingMap.grid.length && c < startingMap.grid[r].length) {
          return startingMap.grid[r][c];
        }
        return r === 0 || r === clampedH - 1 || c === 0 || c === clampedW - 1 ? 1 : 0;
      })
    );

    const newVisual = Array.from({ length: clampedH }, (_, r) =>
      Array.from({ length: clampedW }, (_, c) => {
        if (
          startingMap.tileLayers?.[0]?.grid &&
          r < startingMap.tileLayers[0].grid.length &&
          c < startingMap.tileLayers[0].grid[r].length
        ) {
          return startingMap.tileLayers[0].grid[r][c];
        }
        return defaultGid;
      })
    );

    const safeSpawnX = Math.min(clampedW - 2, Math.max(1, startingMap.spawnPoint.x));
    const safeSpawnY = Math.min(clampedH - 2, Math.max(1, startingMap.spawnPoint.y));

    onChange({
      ...startingMap,
      width: clampedW,
      height: clampedH,
      grid: newGrid,
      tileLayers: [{ name: 'Ground', grid: newVisual }],
      spawnPoint: { x: safeSpawnX, y: safeSpawnY },
    });
  };

  const paintCell = useCallback(
    (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return;

      if (toolMode === 'spawn') {
        onChange({
          ...startingMap,
          spawnPoint: { x, y },
        });
        return;
      }

      const nextGrid = startingMap.grid.map((row, rIdx) =>
        row.map((cell, cIdx) => (rIdx === y && cIdx === x ? (activeBrush.isSolid ? 1 : 0) : cell))
      );

      const nextVisual = (startingMap.tileLayers?.[0]?.grid || []).map((row, rIdx) =>
        row.map((cell, cIdx) => (rIdx === y && cIdx === x ? activeBrush.gid : cell))
      );

      onChange({
        ...startingMap,
        grid: nextGrid,
        tileLayers: [{ name: 'Ground', grid: nextVisual }],
      });
    },
    [width, height, toolMode, activeBrush, startingMap, onChange]
  );

  // Draw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = Math.floor(Math.min(500 / width, 500 / height, 20));
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    const visualLayer = startingMap.tileLayers?.[0]?.grid;

    // Draw background cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gid = visualLayer?.[y]?.[x] || environment.defaultGroundGid || 17;
        const isSolid = startingMap.grid?.[y]?.[x] === 1;

        let fill = '#16a34a'; // default grass
        if (gid === 32) fill = '#92400e';
        else if (gid === 60) fill = '#64748b';
        else if (gid === 80) fill = '#0284c7';
        else if (gid === 3010) fill = '#78350f';
        else if (gid === 45) fill = '#d97706';
        else if (isSolid && gid === 1) fill = '#450a0a';

        ctx.fillStyle = fill;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        // Border outline
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);

        // Solid overlay hatch
        if (isSolid && gid !== 80) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    // Draw Spawn Point Beacon
    const spawn = startingMap.spawnPoint;
    if (spawn && spawn.x >= 0 && spawn.x < width && spawn.y >= 0 && spawn.y < height) {
      const centerX = spawn.x * cellSize + cellSize / 2;
      const centerY = spawn.y * cellSize + cellSize / 2;

      // Glow circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.fill();

      // Inner pin circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, cellSize * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Icon star
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(10, Math.floor(cellSize * 0.45))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', centerX, centerY + 0.5);
    }
  }, [width, height, startingMap, environment]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsMouseDown(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const cellSize = Math.floor(Math.min(500 / width, 500 / height, 20));
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    paintCell(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cellSize = Math.floor(Math.min(500 / width, 500 / height, 20));
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    setHoveredCell({ x, y });

    if (isMouseDown && toolMode === 'paint') {
      paintCell(x, y);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsMouseDown(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-amber-400" />
              5. Create Your Starting Map
            </h2>
            <p className="text-sm text-slate-400">
              Name your initial zone, choose dimensions, paint terrain features, and place the player spawn point.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Spawn: ({startingMap.spawnPoint.x}, {startingMap.spawnPoint.y})
            </div>
          </div>
        </div>

        {/* MAP CONFIGURATION (NAME & DIMENSIONS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Map Name
            </label>
            <input
              type="text"
              value={startingMap.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || 'STARTING_MEADOW';
                onChange({ ...startingMap, name, id: slug });
              }}
              placeholder="e.g. Starting Meadow, Town Square"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Width ({width} tiles)
            </label>
            <input
              type="range"
              min={16}
              max={48}
              step={2}
              value={width}
              onChange={(e) => handleResize(Number(e.target.value), height)}
              className="w-full accent-amber-400 mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Height ({height} tiles)
            </label>
            <input
              type="range"
              min={16}
              max={48}
              step={2}
              value={height}
              onChange={(e) => handleResize(width, Number(e.target.value))}
              className="w-full accent-amber-400 mt-2"
            />
          </div>
        </div>

        {/* TOOLBAR & PALETTE */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          {/* TOOL SELECTOR */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setToolMode('paint')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                toolMode === 'paint'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              Paint Terrain
            </button>

            <button
              onClick={() => setToolMode('spawn')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                toolMode === 'spawn'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Place Player Spawn
            </button>
          </div>

          {/* BRUSH PALETTE (IF PAINT MODE) */}
          {toolMode === 'paint' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {BRUSHES.map((b) => {
                const isSelected = activeBrush.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveBrush(b)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30 text-white ring-1 ring-amber-400/40'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                    <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* INTERACTIVE MAP CANVAS CONTAINER */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner overflow-auto max-h-[460px]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => {
              setIsMouseDown(false);
              setHoveredCell(null);
            }}
            className="cursor-crosshair border border-slate-800 shadow-2xl rounded-lg"
          />
          <div className="flex items-center justify-between w-full max-w-lg mt-3 text-[11px] text-slate-400 font-mono">
            <div>
              Mode: <strong className="text-amber-400 uppercase">{toolMode}</strong>
            </div>
            {hoveredCell && (
              <div>
                Hovered: X={hoveredCell.x}, Y={hoveredCell.y}
              </div>
            )}
            <div>
              Size: {width} × {height}
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!startingMap.name.trim()}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
        >
          Review & Create Game
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
