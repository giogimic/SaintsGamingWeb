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
  Plus,
  Trash2,
  BookOpen,
  DoorOpen,
  Sliders,
  Globe,
  Swords,
  Gamepad2,
  Zap,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';

export interface SetupGateDefinition {
  id: string;
  name: string;
  category: 'SPAWN' | 'WARP' | 'PORTAL' | 'DUNGEON' | 'PVP' | 'TOWN';
  position: { x: number; y: number; z?: number };
  targetMapId?: string;
  targetPosition?: { x: number; y: number; z?: number };
  interactPrompt?: string;
}

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
  gates?: SetupGateDefinition[];
  voxelDoc?: VoxelWorldDocV3;
  mapType?: 'TILE' | 'VOXEL' | 'FRACTAL';
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

const GATE_CATEGORIES: Array<{ id: SetupGateDefinition['category']; label: string; color: string; beaconColor: string }> = [
  { id: 'SPAWN', label: 'Spawn Anchor', color: 'text-sky-400 border-sky-500/40 bg-sky-500/10', beaconColor: '#38bdf8' },
  { id: 'WARP', label: 'Town / Hub Warp', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10', beaconColor: '#22c55e' },
  { id: 'PORTAL', label: 'Frontier Rift', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10', beaconColor: '#a855f7' },
  { id: 'DUNGEON', label: 'Dungeon Portal', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10', beaconColor: '#f59e0b' },
  { id: 'PVP', label: 'PvP Arena', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10', beaconColor: '#f43f5e' },
  { id: 'TOWN', label: 'Safe Town Zone', color: 'text-teal-400 border-teal-500/40 bg-teal-500/10', beaconColor: '#14b8a6' },
];

export function StartingMapStep({
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'GEOMETRY' | 'GATES' | 'TUTORIAL'>('GEOMETRY');

  const widthChunks = startingMap.widthChunks || 2;
  const depthChunks = startingMap.depthChunks || 2;
  const totalWidthBlocks = widthChunks * 16;
  const totalDepthBlocks = depthChunks * 16;

  // Initialize default gates if not present
  const currentGates: SetupGateDefinition[] = startingMap.gates || [
    {
      id: 'spawn',
      name: 'Sanctuary Spawn Point',
      category: 'SPAWN',
      position: { x: Math.floor(totalWidthBlocks / 2), y: Math.floor(totalDepthBlocks / 2), z: 16 },
      interactPrompt: 'Respawn Sanctuary',
    },
    {
      id: 'town_gate',
      name: 'Capital City Portal',
      category: 'WARP',
      position: { x: 4, y: Math.floor(totalDepthBlocks / 2), z: 16 },
      targetMapId: 'SAINTS_VILLAGE',
      interactPrompt: 'Warp to Capital City',
    },
  ];

  // Draw 2.5D Volumetric Isometric Preview with all gateways
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

    // Draw all configured gates
    currentGates.forEach((gate, idx) => {
      const gx = gate.position.x;
      const gy = gate.position.y;
      const gateScreenX = originX + (gx - gy) * (isoTileW / 2);
      const gateScreenY = originY + (gx + gy) * (isoTileH / 2);

      const categoryConfig = GATE_CATEGORIES.find((c) => c.id === gate.category);
      const beaconColor = categoryConfig?.beaconColor || '#38bdf8';

      // Gateway pedestal glow
      ctx.beginPath();
      ctx.arc(gateScreenX, gateScreenY, 6, 0, Math.PI * 2);
      ctx.fillStyle = beaconColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gateway beacon beam
      ctx.beginPath();
      ctx.moveTo(gateScreenX, gateScreenY);
      ctx.lineTo(gateScreenX, gateScreenY - (gate.category === 'SPAWN' ? 32 : 24));
      ctx.strokeStyle = `${beaconColor}cc`;
      ctx.lineWidth = gate.category === 'SPAWN' ? 2.5 : 1.5;
      ctx.stroke();

      // Gateway label
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(gate.name || `Gate ${idx + 1}`, gateScreenX, gateScreenY - (gate.category === 'SPAWN' ? 36 : 28));
    });
  }, [widthChunks, depthChunks, totalWidthBlocks, totalDepthBlocks, startingMap.foundationMaterial, currentGates]);

  const handleApplyDimensions = (wChunks: number, dChunks: number) => {
    const w = wChunks * 16;
    const h = dChunks * 16;
    const updatedSpawn = { x: Math.floor(w / 2), y: Math.floor(h / 2), z: 16 };
    const updatedGates = currentGates.map((g, idx) => 
      idx === 0 ? { ...g, position: updatedSpawn } : g
    );

    onChange({
      ...startingMap,
      widthChunks: wChunks,
      depthChunks: dChunks,
      width: w,
      height: h,
      spawnPoint: updatedSpawn,
      gates: updatedGates,
    });
  };

  const handleUpdateGate = (index: number, updated: Partial<SetupGateDefinition>) => {
    const nextGates = [...currentGates];
    nextGates[index] = { ...nextGates[index], ...updated };
    onChange({
      ...startingMap,
      gates: nextGates,
      spawnPoint: nextGates[0]?.position ? { ...nextGates[0].position, z: 16 } : startingMap.spawnPoint,
    });
  };

  const handleAddGate = () => {
    const newGate: SetupGateDefinition = {
      id: `gate_${currentGates.length + 1}`,
      name: `Warp Gate ${currentGates.length + 1}`,
      category: 'WARP',
      position: { x: Math.floor(totalWidthBlocks / 4), y: Math.floor(totalDepthBlocks / 4), z: 16 },
      targetMapId: 'SAINTS_VILLAGE',
      interactPrompt: 'Travel through gateway',
    };
    onChange({
      ...startingMap,
      gates: [...currentGates, newGate],
    });
  };

  const handleRemoveGate = (index: number) => {
    if (index === 0) return; // Prevent removing primary spawn
    const nextGates = currentGates.filter((_, idx) => idx !== index);
    onChange({
      ...startingMap,
      gates: nextGates,
    });
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            6. Starting 3D Voxel Realm &amp; Gateway Topology
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure volumetric boundaries, bedrock base, and initial named gateway warps.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 bg-[#050b14] p-1 rounded-lg border border-border/40">
          <button
            type="button"
            onClick={() => setActiveSubTab('GEOMETRY')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'GEOMETRY'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>World Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('GATES')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'GATES'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <DoorOpen className="w-3 h-3" />
            <span>Gateways ({currentGates.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('TUTORIAL')}
            className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeSubTab === 'TUTORIAL'
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Architecture Guide</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* LEFT COLUMN: ACTIVE SUB-TAB CONTROLS */}
        <div className="md:col-span-6 space-y-2.5">
          {activeSubTab === 'GEOMETRY' && (
            <div className="space-y-2.5">
              {/* REALM NAME & ID */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Map ID / Slug
                  </label>
                  <input
                    type="text"
                    value={startingMap.id}
                    onChange={(e) => onChange({ ...startingMap, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    className="w-full bg-[#050b14] border border-border/60 focus:border-primary rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={startingMap.name}
                    onChange={(e) => onChange({ ...startingMap, name: e.target.value })}
                    className="w-full bg-[#050b14] border border-border/60 focus:border-primary rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* MAP ENGINE SELECTOR */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Map Engine Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { mode: 'TILE', label: '2D Tile Engine', desc: 'Classic 2D logic' },
                    { mode: 'VOXEL', label: '3D Voxel Engine', desc: 'Volumetric builder' },
                    { mode: 'FRACTAL', label: 'Fractal Domains', desc: 'Procedural Gen' },
                  ].map((engine) => {
                    const currentMode = startingMap.mapType || 'VOXEL';
                    const isSelected = currentMode === engine.mode;
                    return (
                      <button
                        key={engine.mode}
                        type="button"
                        onClick={() => onChange({ ...startingMap, mapType: engine.mode as 'TILE' | 'VOXEL' | 'FRACTAL' })}
                        className={`p-1.5 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-white shadow-sm'
                            : 'bg-[#0a1628]/60 border-border/40 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">{engine.label}</span>
                        <span className="text-[9px] text-muted-foreground mt-0.5">{engine.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CHUNK VOLUME PRESETS */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Volume Dimensions (1 Chunk = 16x16x32 Voxels)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
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
                        className={`p-1.5 rounded border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-white shadow-sm'
                            : 'bg-[#0a1628]/60 border-border/40 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground">{preset.label}</span>
                        <span className="text-[10px] text-primary/90 mt-0.5">{preset.blocks}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BEDROCK FOUNDATION MATERIAL */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Bedrock Foundation Base
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {FOUNDATION_MATERIALS.map((mat) => {
                    const isSelected = startingMap.foundationMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => onChange({ ...startingMap, foundationMaterial: mat.id })}
                        className={`p-1.5 rounded border text-left transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 border-primary text-foreground shadow-sm'
                            : 'bg-[#0a1628]/60 border-border/40 text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-black/40"
                          style={{ backgroundColor: mat.colorHex }}
                        />
                        <span className="text-[11px] font-semibold truncate">{mat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOPOLOGY ARCHETYPE */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Surface Topology Archetype
                </label>
                <select
                  value={startingMap.topologyArchetype}
                  onChange={(e) => onChange({ ...startingMap, topologyArchetype: e.target.value as any })}
                  className="w-full bg-[#050b14] border border-border/60 rounded px-2 py-1 text-xs text-foreground outline-none"
                >
                  {TOPOLOGY_ARCHETYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeSubTab === 'GATES' && (
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-1 border-b border-border/30">
                <span className="text-[11px] font-bold text-foreground">Configured Realm Gateways</span>
                <button
                  type="button"
                  onClick={handleAddGate}
                  className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Gate</span>
                </button>
              </div>

              {currentGates.map((gate, idx) => (
                <div
                  key={gate.id || idx}
                  className="p-2 rounded bg-[#0a1628]/80 border border-border/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-bold text-primary shrink-0">#{idx + 1}</span>
                      <input
                        type="text"
                        value={gate.name}
                        onChange={(e) => handleUpdateGate(idx, { name: e.target.value })}
                        placeholder="Gateway Name"
                        className="w-full bg-[#050b14] border border-border/50 rounded px-1.5 py-0.5 text-xs text-foreground outline-none"
                      />
                    </div>

                    <select
                      value={gate.category}
                      onChange={(e) => handleUpdateGate(idx, { category: e.target.value as any })}
                      className="bg-[#050b14] border border-border/50 rounded px-1.5 py-0.5 text-[10px] text-foreground outline-none"
                    >
                      {GATE_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGate(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded transition cursor-pointer"
                        title="Delete Gateway"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div>
                      <span className="text-muted-foreground mr-1">X:</span>
                      <input
                        type="number"
                        min={0}
                        max={totalWidthBlocks - 1}
                        value={gate.position.x}
                        onChange={(e) => handleUpdateGate(idx, { position: { ...gate.position, x: Number(e.target.value) } })}
                        className="w-12 bg-[#050b14] border border-border/40 rounded px-1 py-0.5 text-xs text-foreground text-center"
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">Y:</span>
                      <input
                        type="number"
                        min={0}
                        max={totalDepthBlocks - 1}
                        value={gate.position.y}
                        onChange={(e) => handleUpdateGate(idx, { position: { ...gate.position, y: Number(e.target.value) } })}
                        className="w-12 bg-[#050b14] border border-border/40 rounded px-1 py-0.5 text-xs text-foreground text-center"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={gate.targetMapId || ''}
                        onChange={(e) => handleUpdateGate(idx, { targetMapId: e.target.value })}
                        placeholder="Target Map"
                        className="w-full bg-[#050b14] border border-border/40 rounded px-1 py-0.5 text-[10px] text-foreground"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === 'TUTORIAL' && (
            <div className="p-3 rounded-lg bg-[#0a1628]/80 border border-border/40 space-y-2 max-h-[290px] overflow-y-auto text-[11px] leading-relaxed">
              <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>Saints Gaming Architecture Overview</span>
              </div>
              <p className="text-muted-foreground">
                Saints Gaming runs on a <strong>Greenfield 3D Voxel Engine</strong> where volumetric chunks of 32-bit compact words form the authoritative world truth, and 2.5D serves as the presentation perspective.
              </p>
              <div className="space-y-1.5 pt-1 border-t border-border/30">
                <div className="flex items-start gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Volumetric Chunks:</strong> 16×16×32 block volumes with greedy meshing ensure lightweight network streaming and instant dirty chunk rebuilds.
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Gateway Topology:</strong> Named gateways seamlessly link realms together. Sharding keeps multiplayer peers grouped on base map instances.
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Dual Battle Engine:</strong> Real-time hotbar combat against standard monsters pairs seamlessly with turn-based companion capture encounters.
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">In-Engine Studio:</strong> Press <code className="bg-muted px-1 py-0.2 rounded text-foreground">Ctrl+E</code> in Studio to toggle instant playtesting with full physics, NPC dialogues, and loot drops without server restarts.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 2.5D ISOMETRIC VOLUMETRIC PREVIEW */}
        <div className="md:col-span-6 flex flex-col">
          <div className="h-full rounded-lg overflow-hidden border border-border/50 bg-[#060c18] flex flex-col">
            <div className="flex items-center justify-between px-2.5 py-1 bg-[#0a1424] border-b border-border/40 text-[10px] font-mono select-none">
              <span className="text-foreground flex items-center gap-1 font-bold">
                <Boxes className="w-3 h-3 text-primary" />
                2.5D Volumetric Canvas
              </span>
              <span className="text-primary font-bold">
                {totalWidthBlocks}x{totalDepthBlocks}x32 Blocks
              </span>
            </div>
            <div className="flex-1 relative min-h-[200px]">
              <canvas
                ref={canvasRef}
                width={380}
                height={220}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-1.5 bg-[#0a1424]/80 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <DoorOpen className="w-3 h-3 text-sky-400" />
                {currentGates.length} Gateways Active
              </span>
              <span className="text-emerald-400 font-bold">VoxelDocV3 Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-muted-foreground hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground transition cursor-pointer shadow-md shadow-primary/20"
        >
          Continue to Final Review
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
