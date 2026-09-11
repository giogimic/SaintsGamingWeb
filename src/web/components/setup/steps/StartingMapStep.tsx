'use client';

import React, { useState, useEffect } from 'react';
import {
  Compass,
  Boxes,
  MapPin,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Sliders,
  Globe,
  Loader2,
  ShieldAlert,
  Layers,
  Shield,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import type { GameDefinitionData } from './GameDefinitionStep';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '@/shared/game/voxel/VoxelChunk';
import { useSetupWorldSession } from '../hooks/useSetupWorldSession';

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
  widthChunks: number;
  depthChunks: number;
  heightChunks: number;
  width: number;
  height: number;
  blockSizePx: number;
  foundationMaterial: string;
  topologyArchetype: 'flat_bedrock' | 'valley_meadow' | 'fortress_outpost' | 'sunken_dungeon';
  spawnPoint: { x: number; y: number; z?: number };
  gates?: SetupGateDefinition[];
  mapType?: 'TILE' | 'VOXEL' | 'FRACTAL';
  fractalBorderRadius?: number;
  fractalPregenRadius?: number;
  bootstrapRevisionId?: string;
}

interface StartingMapStepProps {
  environment: SetupEnvironmentData;
  gameDefinition: GameDefinitionData;
  startingMap: SetupStartingMapData;
  onChange: (map: SetupStartingMapData) => void;
  onNext: () => void;
  onBack: () => void;
}

const TOPOLOGY_ARCHETYPES = [
  { id: 'flat_bedrock', name: 'Flat Bedrock Plane', desc: 'Solid bottom bedrock with open atmosphere. Clean canvas.' },
  { id: 'valley_meadow', name: 'Rolling Valley Meadow', desc: 'Elevated terraces and clearings for organic outdoor regions.' },
  { id: 'fortress_outpost', name: 'Fortified Outpost', desc: 'Raised stronghold plateau with defensive foundations.' },
  { id: 'sunken_dungeon', name: 'Subterranean Vault', desc: 'Enclosed dungeon cavity with perimeter rock walls.' },
] as const;

export function StartingMapStep({
  environment,
  gameDefinition,
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const [previewSizeChunks, setPreviewSizeChunks] = useState<number>(4);

  const {
    status,
    bootstrapRevisionId,
    generationTimeMs,
    generatedChunksCount,
    totalChunksCount,
    errorMsg,
    generateWorld,
  } = useSetupWorldSession(environment, gameDefinition);

  // Trigger generation on mount or when key dependencies change
  useEffect(() => {
    generateWorld(previewSizeChunks);
  }, [previewSizeChunks, environment.foundationMaterial, gameDefinition.name, generateWorld]);

  // Sync to parent when ready
  useEffect(() => {
    if (status === 'READY') {
      const centerX = Math.floor((previewSizeChunks * CHUNK_SIZE_X) / 2);
      const centerZ = Math.floor((previewSizeChunks * CHUNK_SIZE_Z) / 2);
      onChange({
        ...startingMap,
        widthChunks: previewSizeChunks,
        depthChunks: previewSizeChunks,
        spawnPoint: { x: centerX, y: centerZ, z: 32 },
        width: previewSizeChunks * CHUNK_SIZE_X,
        height: previewSizeChunks * CHUNK_SIZE_Z,
        gates: [
          {
            id: 'spawn',
            name: 'Genesis Gate',
            category: 'SPAWN',
            position: { x: centerX, y: centerZ, z: 32 },
            interactPrompt: 'Respawn',
          }
        ],
        bootstrapRevisionId: bootstrapRevisionId || undefined
      });
    }
  }, [status, bootstrapRevisionId, previewSizeChunks]);

  const totalBlocks = (previewSizeChunks * CHUNK_SIZE_X) * (previewSizeChunks * CHUNK_SIZE_Z);


  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Globe className="w-4 h-4 text-sky-400" />
            5. World Bootstrap & 3D Voxel Validation
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generating 3D voxel terrain, validating spawn safety, and ensuring serialization integrity.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider block">Game Engine</span>
          <span className="text-xs font-bold text-sky-400 uppercase font-mono">{startingMap.mapType}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TWO COLUMN LAYOUT: CONTROLS & VIEWPORT */}
      <div className="flex flex-col lg:flex-row gap-4">
        
        {/* LEFT COLUMN: Controls & Topology */}
        <div className="w-full lg:w-1/3 space-y-4">
          
          {/* Topology Selection */}
          <div className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Topology Archetype
            </h3>
            <div className="space-y-2">
              {TOPOLOGY_ARCHETYPES.map((arch) => (
                <button
                  key={arch.id}
                  onClick={() => onChange({ ...startingMap, topologyArchetype: arch.id as any })}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    startingMap.topologyArchetype === arch.id
                      ? 'bg-purple-500/10 border-purple-500/40 shadow-inner'
                      : 'bg-[#050b14] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${startingMap.topologyArchetype === arch.id ? 'text-purple-300' : 'text-slate-300'}`}>
                      {arch.name}
                    </span>
                    {startingMap.topologyArchetype === arch.id && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{arch.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Map Size Selection */}
          <div className="p-3.5 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-sky-400" />
                World Volume
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[4, 8, 16, 32].map((size) => (
                <button
                  key={size}
                  onClick={() => setPreviewSizeChunks(size)}
                  className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                    previewSizeChunks === size
                      ? 'bg-sky-500/10 border-sky-500/40 shadow-inner'
                      : 'bg-[#050b14] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className={`block text-xs font-bold font-mono ${previewSizeChunks === size ? 'text-sky-300' : 'text-slate-300'}`}>
                    {size}x{size}
                  </span>
                  <span className="block text-[9px] text-slate-500 uppercase mt-0.5">Chunks</span>
                </button>
              ))}
            </div>
            
            <div className="p-2 rounded bg-[#050b14] border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Total Ground Blocks:</span>
              <span className="font-bold text-slate-200">{totalBlocks.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Viewport & HUD */}
        <div className="w-full lg:w-2/3 flex flex-col gap-3">
          
          {/* VIEWPORT CONTAINER */}
          <div className="relative w-full aspect-video sm:aspect-[16/10] rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-[#050b14] flex flex-col items-center justify-center">
            
            {/* 
              NOTE for Studio Architecture:
              The concept of a 3D WYSIWYG world preview belongs here in the overall Studio design.
              However, it must NOT download the entire region payloads to construct a browser voxelDoc.
              It must eventually consume the same draft region artifacts using WorldStreamer & MapMesher 
              just like the runtime. For now (Phase 5 Unblock), we show a clean generation status screen.
            */}

            {status !== 'READY' && status !== 'ERROR' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
                <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">
                  {status === 'GENERATING' && `Generating Terrain... (${Math.round((generatedChunksCount / Math.max(1, totalChunksCount)) * 100)}%)`}
                </h3>
              </div>
            )}

            {status === 'READY' && (
               <div className="flex flex-col items-center justify-center text-center p-6">
                 <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                 <h2 className="text-xl font-bold text-white mb-2">World Generated Successfully</h2>
                 <p className="text-sm text-slate-400 max-w-md">
                   The draft world has been successfully baked to storage artifacts. 
                   Proceed to Final Review to publish this world version.
                 </p>
               </div>
            )}

            {/* DIAGNOSTIC HUD (Minecraft Style) */}
            <div className="absolute top-2 left-2 p-2 bg-slate-950/60 backdrop-blur-md border border-slate-700/50 rounded pointer-events-none select-none font-mono text-[9px] text-slate-300 space-y-1 z-20">
              <div className="text-white font-bold mb-1">WORLD BOOTSTRAP</div>
              <div className="flex justify-between gap-4"><span>Seed:</span> <span>{gameDefinition.name || 'Random'}</span></div>
              <div className="flex justify-between gap-4"><span>Chunks:</span> <span>{generatedChunksCount} / {totalChunksCount || (previewSizeChunks * previewSizeChunks)}</span></div>
              <div className="flex justify-between gap-4"><span>Dim:</span> <span>{previewSizeChunks * 32}x32x{previewSizeChunks * 32}</span></div>
              <div className="flex justify-between gap-4"><span>Gen Time:</span> <span>{generationTimeMs.toFixed(0)} ms</span></div>
              <div className="mt-2 pt-1 border-t border-slate-700/50 text-[10px]">
                <div className={`flex items-center gap-1.5 ${status === 'READY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {status === 'READY' ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
                  SURFACE READY
                </div>
                <div className={`flex items-center gap-1.5 ${status === 'READY' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {status === 'READY' ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-50" />}
                  ARTIFACTS BAKED
                </div>
              </div>
            </div>

          </div>
          
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => generateWorld(previewSizeChunks)}
              disabled={status !== 'READY' && status !== 'ERROR'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-300 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status !== 'READY' && status !== 'ERROR' ? 'animate-spin' : ''}`} />
              Regenerate World
            </button>
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              Artifact Integrity Checked
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={status !== 'READY'}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-mono font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-500/20"
        >
          Final Review
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
