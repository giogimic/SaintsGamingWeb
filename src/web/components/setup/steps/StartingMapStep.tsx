'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Boxes,
  MapPin,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';

export interface SetupStartingMapData {
  id: string;
  name: string;
  widthChunks: number; // e.g. 2
  depthChunks: number; // e.g. 2
  heightChunks: number; // e.g. 1
  width: number; // widthChunks * 16
  height: number; // depthChunks * 16
  blockSizePx: number; // 16..512, default 64
  foundationMaterial: string; // 'gunmetal' | 'grass' | 'stone' | 'sand' | 'dark_cavern'
  topologyArchetype: 'flat_bedrock' | 'valley_meadow' | 'fortress_outpost' | 'sunken_dungeon';
  spawnPoint: { x: number; y: number; z?: number };
  voxelDoc?: VoxelWorldDocV3;
}

interface StartingMapStepProps {
  environment: SetupEnvironmentData;
  startingMap: SetupStartingMapData;
  onChange: (map: SetupStartingMapData) => void;
  onNext: () => void;
  onBack: () => void;
}

const FOUNDATION_MATERIALS = [
  { id: 'gunmetal', name: 'Gunmetal Bedrock', colorHex: '#2a2d34', desc: 'Standard industrial bedrock (Default)' },
  { id: 'grass', name: 'Lush Meadow', colorHex: '#22c55e', desc: 'Vibrant green grass with loam base' },
  { id: 'stone', name: 'Cobblestone', colorHex: '#64748b', desc: 'Ancient quarried grey stone blocks' },
  { id: 'sand', name: 'Desert Sandstone', colorHex: '#f59e0b', desc: 'Warm desert sandstone dunes' },
  { id: 'dark_cavern', name: 'Deep Obsidian', colorHex: '#1e293b', desc: 'Volcanic basalt and subterranean rock' },
];

const TOPOLOGY_ARCHETYPES = [
  {
    id: 'flat_bedrock',
    name: 'Flat Bedrock Plane',
    desc: 'Solid bottom bedrock with open atmosphere. Clean canvas for Studio creation.',
  },
  {
    id: 'valley_meadow',
    name: 'Rolling Valley Meadow',
    desc: 'Elevated terraces and clearings for organic outdoor regions.',
  },
  {
    id: 'fortress_outpost',
    name: 'Fortified Outpost',
    desc: 'Raised stronghold plateau with defensive foundations.',
  },
  {
    id: 'sunken_dungeon',
    name: 'Subterranean Vault',
    desc: 'Enclosed dungeon cavity with perimeter rock walls.',
  },
] as const;

export function StartingMapStep({
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const widthChunks = startingMap.widthChunks || 2;
  const depthChunks = startingMap.depthChunks || 2;
  const totalWidthBlocks = widthChunks * 16;
  const totalDepthBlocks = depthChunks * 16;

  // Draw 2.5D Volumetric Isometric Preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, width, height);

    // Grid Coordinates
    const originX = width / 2;
    const originY = height / 2 - 20;
    const isoTileW = Math.min(22, Math.floor((width - 40) / (totalWidthBlocks + totalDepthBlocks)));
    const isoTileH = Math.floor(isoTileW / 2);

    const foundationColor =
      FOUNDATION_MATERIALS.find((m) => m.id === startingMap.foundationMaterial)?.colorHex || '#2a2d34';

    // Draw Isometric Bedrock Foundation Grid
    for (let d = 0; d < totalDepthBlocks; d += 2) {
      for (let w = 0; w < totalWidthBlocks; w += 2) {
        const screenX = originX + (w - d) * (isoTileW / 2);
        const screenY = originY + (w + d) * (isoTileH / 2);

        // Bedrock Volume base
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + isoTileW / 2, screenY + isoTileH / 2);
        ctx.lineTo(screenX, screenY + isoTileH);
        ctx.lineTo(screenX - isoTileW / 2, screenY + isoTileH / 2);
        ctx.closePath();

        ctx.fillStyle = foundationColor;
        ctx.fill();
        ctx.strokeStyle = '#00000030';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw Chunk Boundary Wireframes
    for (let cZ = 0; cZ < depthChunks; cZ++) {
      for (let cX = 0; cX < widthChunks; cX++) {
        const cornerW = cX * 16;
        const cornerD = cZ * 16;
        const screenX = originX + (cornerW - cornerD) * (isoTileW / 2);
        const screenY = originY + (cornerW + cornerD) * (isoTileH / 2);

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + 8 * isoTileW, screenY + 8 * isoTileH);
        ctx.lineTo(screenX, screenY + 16 * isoTileH);
        ctx.lineTo(screenX - 8 * isoTileW, screenY + 8 * isoTileH);
        ctx.closePath();

        ctx.strokeStyle = '#fbbf2460';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw Player Spawn Beacon
    const spawnX = startingMap.spawnPoint?.x ?? Math.floor(totalWidthBlocks / 2);
    const spawnY = startingMap.spawnPoint?.y ?? Math.floor(totalDepthBlocks / 2);
    const spawnScreenX = originX + (spawnX - spawnY) * (isoTileW / 2);
    const spawnScreenY = originY + (spawnX + spawnY) * (isoTileH / 2);

    // Glowing spawn anchor
    ctx.beginPath();
    ctx.arc(spawnScreenX, spawnScreenY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Beacon beam
    ctx.beginPath();
    ctx.moveTo(spawnScreenX, spawnScreenY);
    ctx.lineTo(spawnScreenX, spawnScreenY - 30);
    ctx.strokeStyle = '#38bdf8aa';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [widthChunks, depthChunks, totalWidthBlocks, totalDepthBlocks, startingMap.foundationMaterial, startingMap.spawnPoint]);

  const handleApplyDimensions = (wChunks: number, dChunks: number) => {
    const w = wChunks * 16;
    const h = dChunks * 16;
    onChange({
      ...startingMap,
      widthChunks: wChunks,
      depthChunks: dChunks,
      width: w,
      height: h,
      spawnPoint: { x: Math.floor(w / 2), y: Math.floor(h / 2), z: 16 },
    });
  };

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Compass className="w-4 h-4 text-amber-400" />
            6. Starting 3D Volumetric Realm & Spawn
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define initial world chunk boundaries, foundation bedrock material, and player spawn anchor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT COLUMN: CONFIGURATION CONTROLS */}
        <div className="md:col-span-6 space-y-3">
          {/* REALM NAME & ID */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                Map ID / Slug
              </label>
              <input
                type="text"
                value={startingMap.id}
                onChange={(e) => onChange({ ...startingMap, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                Display Name
              </label>
              <input
                type="text"
                value={startingMap.name}
                onChange={(e) => onChange({ ...startingMap, name: e.target.value })}
                className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none"
              />
            </div>
          </div>

          {/* CHUNK VOLUME PRESETS */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
              Chunk Volume Dimensions (1 Chunk = 16x16x32 Blocks)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { w: 2, d: 2, label: '2x2 Chunks', blocks: '32x32 Blocks', desc: 'Starting Zone' },
                { w: 3, d: 3, label: '3x3 Chunks', blocks: '48x48 Blocks', desc: 'Regional Hub' },
                { w: 4, d: 4, label: '4x4 Chunks', blocks: '64x64 Blocks', desc: 'Open World' },
              ].map((preset) => {
                const isSelected = widthChunks === preset.w && depthChunks === preset.d;
                return (
                  <button
                    key={`${preset.w}x${preset.d}`}
                    type="button"
                    onClick={() => handleApplyDimensions(preset.w, preset.d)}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-[#070e1b] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-white">{preset.label}</span>
                    <span className="text-[10px] text-amber-300/80 font-mono mt-0.5">{preset.blocks}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BEDROCK FOUNDATION MATERIAL */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
              Bedrock Foundation Base
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FOUNDATION_MATERIALS.map((mat) => {
                const isSelected = startingMap.foundationMaterial === mat.id;
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => onChange({ ...startingMap, foundationMaterial: mat.id })}
                    className={`p-2 rounded-lg border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                        : 'bg-[#070e1b] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/40"
                      style={{ backgroundColor: mat.colorHex }}
                    />
                    <span className="text-xs font-semibold truncate">{mat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TOPOLOGY ARCHETYPE */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
              Surface Topology Archetype
            </label>
            <select
              value={startingMap.topologyArchetype}
              onChange={(e) => onChange({ ...startingMap, topologyArchetype: e.target.value as any })}
              className="w-full bg-[#050b14] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans"
            >
              {TOPOLOGY_ARCHETYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RIGHT COLUMN: 2.5D ISOMETRIC VOLUMETRIC PREVIEW */}
        <div className="md:col-span-6 flex flex-col">
          <div className="h-full rounded-xl overflow-hidden border border-slate-700/80 bg-[#060c18] flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a1424] border-b border-slate-800 text-[10px] font-mono select-none">
              <span className="text-slate-300 flex items-center gap-1 font-bold">
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                2.5D Volumetric Realm Canvas
              </span>
              <span className="text-amber-300">
                {totalWidthBlocks}x{totalDepthBlocks}x32 Blocks
              </span>
            </div>
            <div className="flex-1 relative min-h-[220px]">
              <canvas
                ref={canvasRef}
                width={400}
                height={260}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-2 bg-[#0a1424]/60 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                Spawn Anchor: X: {startingMap.spawnPoint?.x || 16}, Y: {startingMap.spawnPoint?.y || 16}
              </span>
              <span className="text-emerald-400 font-bold">VoxelDocV3 Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer shadow-md shadow-amber-600/20"
        >
          Continue to Final Review
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
