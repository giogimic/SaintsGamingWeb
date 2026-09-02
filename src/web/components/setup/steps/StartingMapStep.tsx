'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Boxes,
  MapPin,
  Maximize2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Layers,
  Palette,
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
  { id: 'gunmetal', name: 'Gunmetal Bedrock', colorHex: '#2a2d34', desc: 'Standard industrial slate bedrock (Default)' },
  { id: 'grass', name: 'Lush Meadow', colorHex: '#22c55e', desc: 'Vibrant green grass with loam soil base' },
  { id: 'stone', name: 'Cobblestone Masonry', colorHex: '#64748b', desc: 'Ancient quarried grey stone blocks' },
  { id: 'sand', name: 'Desert Sandstone', colorHex: '#f59e0b', desc: 'Warm desert sand and sandstone dunes' },
  { id: 'dark_cavern', name: 'Deep Obsidian Cavern', colorHex: '#1e293b', desc: 'Volcanic basalt and subterranean rock' },
];

const TOPOLOGY_ARCHETYPES = [
  {
    id: 'flat_bedrock',
    name: 'Flat Bedrock Plane',
    desc: 'Solid bottom half (0..15) with open buildable atmosphere (16..31). Clean canvas for Studio creation.',
  },
  {
    id: 'valley_meadow',
    name: 'Rolling Valley Meadow',
    desc: 'Gentle elevated terraces and recessed grassy clearings for organic outdoor regions.',
  },
  {
    id: 'fortress_outpost',
    name: 'Fortified Outpost',
    desc: 'Raised stepped stronghold plateau with defensive perimeter foundations.',
  },
  {
    id: 'sunken_dungeon',
    name: 'Subterranean Vault',
    desc: 'Enclosed dungeon cavity with perimeter rock walls and interior courtyard.',
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
    ctx.fillStyle = '#070d17';
    ctx.fillRect(0, 0, width, height);

    // Isometric math
    const centerX = width / 2;
    const centerY = height / 2 + 30;
    const tileW = 28;
    const tileH = 14;
    const blockHeight = 40;

    const mat = FOUNDATION_MATERIALS.find((m) => m.id === startingMap.foundationMaterial) || FOUNDATION_MATERIALS[0];

    // Draw Chunks Volume Box
    for (let cx = 0; cx < widthChunks; cx++) {
      for (let cz = 0; cz < depthChunks; cz++) {
        const isoX = centerX + (cx - cz) * (tileW * 2);
        const isoY = centerY + (cx + cz) * (tileH * 2);

        // Bedrock Lower Half (0..16)
        ctx.fillStyle = mat.colorHex;
        ctx.beginPath();
        ctx.moveTo(isoX, isoY);
        ctx.lineTo(isoX + tileW * 2, isoY + tileH * 2);
        ctx.lineTo(isoX, isoY + tileH * 4);
        ctx.lineTo(isoX - tileW * 2, isoY + tileH * 2);
        ctx.closePath();
        ctx.fill();

        // Top Border
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3D Depth Extrusion (Front faces)
        ctx.fillStyle = '#181b20';
        ctx.beginPath();
        ctx.moveTo(isoX - tileW * 2, isoY + tileH * 2);
        ctx.lineTo(isoX, isoY + tileH * 4);
        ctx.lineTo(isoX, isoY + tileH * 4 + blockHeight);
        ctx.lineTo(isoX - tileW * 2, isoY + tileH * 2 + blockHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(isoX, isoY + tileH * 4);
        ctx.lineTo(isoX + tileW * 2, isoY + tileH * 2);
        ctx.lineTo(isoX + tileW * 2, isoY + tileH * 2 + blockHeight);
        ctx.lineTo(isoX, isoY + tileH * 4 + blockHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Upper Atmosphere Volume (Wireframe)
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(isoX, isoY - blockHeight);
        ctx.lineTo(isoX + tileW * 2, isoY + tileH * 2 - blockHeight);
        ctx.lineTo(isoX, isoY + tileH * 4 - blockHeight);
        ctx.lineTo(isoX - tileW * 2, isoY + tileH * 2 - blockHeight);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw Spawn Point Indicator
    const spawnXRatio = (startingMap.spawnPoint.x / totalWidthBlocks) * 2 - 1;
    const spawnZRatio = (startingMap.spawnPoint.y / totalDepthBlocks) * 2 - 1;
    const spawnIsoX = centerX + (spawnXRatio - spawnZRatio) * (tileW * widthChunks);
    const spawnIsoY = centerY + (spawnXRatio + spawnZRatio) * (tileH * depthChunks);

    // Spawn Beacon Glow
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(spawnIsoX, spawnIsoY - 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Beacon Line
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spawnIsoX, spawnIsoY);
    ctx.lineTo(spawnIsoX, spawnIsoY - 24);
    ctx.stroke();
  }, [widthChunks, depthChunks, startingMap.foundationMaterial, startingMap.spawnPoint, totalWidthBlocks, totalDepthBlocks]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Boxes className="w-5 h-5 text-amber-400" />
              Starting 3D Voxel Realm Specification
            </h2>
            <p className="text-sm text-slate-400">
              Configure the initial volumetric chunk dimensions, foundation bedrock material, and player spawn point.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-2xl">
              Volume: {totalWidthBlocks} × {totalDepthBlocks} × 32 Blocks ({widthChunks} × {depthChunks} Chunks)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Realm Name & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Realm Identifier
                </label>
                <input
                  type="text"
                  value={startingMap.id}
                  onChange={(e) => onChange({ ...startingMap, id: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-white font-mono text-sm uppercase focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={startingMap.name}
                  onChange={(e) => onChange({ ...startingMap, name: e.target.value })}
                  className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-amber-400 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* 2. World Chunk Dimensions */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                World Chunk Dimensions (16×16×32 Blocks per Chunk)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { w: 2, d: 2, label: 'Small Realm', blocks: '32 × 32' },
                  { w: 3, d: 3, label: 'Medium Realm', blocks: '48 × 48' },
                  { w: 4, d: 4, label: 'Large Realm', blocks: '64 × 64' },
                ].map((dim) => {
                  const isSelected = widthChunks === dim.w && depthChunks === dim.d;
                  return (
                    <button
                      key={dim.w}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...startingMap,
                          widthChunks: dim.w,
                          depthChunks: dim.d,
                          width: dim.w * 16,
                          height: dim.d * 16,
                          spawnPoint: { x: (dim.w * 16) / 2, y: (dim.d * 16) / 2, z: 16 },
                        })
                      }
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/30'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{dim.label}</div>
                      <div className="font-mono text-xs text-amber-400 mt-1">{dim.blocks} Blocks</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{dim.w}×{dim.d} Chunks</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Bedrock Foundation Material */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Bedrock Foundation Material (Lower 0..15 Stratum)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FOUNDATION_MATERIALS.map((mat) => {
                  const isSelected = (startingMap.foundationMaterial || 'gunmetal') === mat.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => onChange({ ...startingMap, foundationMaterial: mat.id })}
                      className={`p-3 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl shrink-0 border border-slate-700 shadow-inner"
                        style={{ backgroundColor: mat.colorHex }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{mat.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{mat.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Topology Archetype */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Starting Surface Topology
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TOPOLOGY_ARCHETYPES.map((arch) => {
                  const isSelected = (startingMap.topologyArchetype || 'flat_bedrock') === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => onChange({ ...startingMap, topologyArchetype: arch.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400/30'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{arch.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">{arch.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3D Isometric Preview Canvas */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 overflow-hidden shadow-2xl relative flex flex-col items-center justify-center">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-300">
                <Sparkles className="w-3 h-3 text-amber-400" />
                3D Volumetric Mesh Preview
              </div>

              <canvas
                ref={canvasRef}
                width={360}
                height={320}
                className="w-full max-w-[360px] h-auto rounded-2xl"
              />

              <div className="w-full mt-3 pt-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400 px-2">
                <span className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  Spawn Point: ({startingMap.spawnPoint.x}, {startingMap.spawnPoint.y}, Y=16)
                </span>
                <span className="font-mono text-slate-500">Volumetric Grid</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-xs text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Greedy Meshing & Zero Seams
              </div>
              <p>
                Chunks are generated with a 1-block boundary halo and greedy quad merging to guarantee maximum frame rates with minimal draw calls.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-xl shadow-amber-500/20 transition-all"
        >
          Continue: Environment & Atmosphere
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
