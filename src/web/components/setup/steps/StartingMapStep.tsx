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
  fractalBorderRadius?: number;
  fractalPregenRadius?: number;
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

  const widthChunks = 2;
  const depthChunks = 2;
  const totalWidthBlocks = widthChunks * 16;
  const totalDepthBlocks = depthChunks * 16;

  // Initialize default gates if not present
  const currentGates: SetupGateDefinition[] = [
    {
      id: 'spawn',
      name: 'Sanctuary Spawn Point',
      category: 'SPAWN',
      position: { x: Math.floor(totalWidthBlocks / 2), y: Math.floor(totalDepthBlocks / 2), z: 16 },
      interactPrompt: 'Respawn Sanctuary',
    }
  ];

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

    const foundationColor = '#2a2d34';

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

    // Draw spawn gate
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
  }, [widthChunks, depthChunks, totalWidthBlocks, totalDepthBlocks, currentGates]);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            6. Starting 3D Voxel Realm
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Initial World Generation & Genesis Spawn
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT COLUMN: INFO */}
        <div className="md:col-span-6 flex flex-col justify-center space-y-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2 text-primary font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Genesis Map: Starting Meadow</span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              This is the first map you will start in. When setup is complete, you will spawn directly into this realm.
            </p>
            
            <div className="p-3 bg-[#0a1628]/80 border border-border/40 rounded-lg">
              <div className="flex items-start gap-2 text-emerald-400 font-bold mb-1">
                <Globe className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Map Authoring is in Studio</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                You do not build or configure maps during setup. Once you enter the game, you can open <strong>Saints Studio</strong> to create new maps, edit terrain, add NPCs, set up gateways, and even remove this starting map.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2.5D ISOMETRIC VOLUMETRIC PREVIEW */}
        <div className="md:col-span-6 flex flex-col">
          <div className="h-full rounded-lg overflow-hidden border border-border/50 bg-[#060c18] flex flex-col">
            <div className="flex items-center justify-between px-2.5 py-1 bg-[#0a1424] border-b border-border/40 text-[10px] font-mono select-none">
              <span className="text-foreground flex items-center gap-1 font-bold">
                <Boxes className="w-3 h-3 text-primary" />
                Genesis Sanctuary Preview
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
                <MapPin className="w-3 h-3 text-sky-400" />
                Default Spawn Point
              </span>
              <span className="text-emerald-400 font-bold">Ready</span>
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
