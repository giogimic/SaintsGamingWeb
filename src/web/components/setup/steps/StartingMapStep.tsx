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
  Video,
  Grid3x3,
  Box,
  Shield,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import type { GameDefinitionData } from './GameDefinitionStep';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '@/shared/game/voxel/VoxelChunk';
import type { VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { SetupVoxelViewport, type ViewportCameraMode } from '../SetupVoxelViewport';
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
  voxelDoc?: VoxelWorldDocV3;
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
  const [cameraMode, setCameraMode] = useState<ViewportCameraMode>('orbit');
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [showChunkBorders, setShowChunkBorders] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);

  const {
    status,
    voxelDoc,
    deserializedWorld,
    spawnResult,
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
    if (status === 'READY' && spawnResult?.isSafe) {
      onChange({
        ...startingMap,
        widthChunks: previewSizeChunks,
        depthChunks: previewSizeChunks,
        spawnPoint: { x: spawnResult.position.x, y: spawnResult.position.z, z: spawnResult.position.y },
        width: previewSizeChunks * CHUNK_SIZE_X,
        height: previewSizeChunks * CHUNK_SIZE_Z,
        gates: [
          {
            id: 'spawn',
            name: 'Genesis Gate',
            category: 'SPAWN',
            position: { x: spawnResult.position.x, y: spawnResult.position.z, z: spawnResult.position.y },
            interactPrompt: 'Respawn',
          }
        ],
        voxelDoc: voxelDoc || undefined,
      });
    }
  }, [status, spawnResult, previewSizeChunks, voxelDoc]);

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
          
          {/* VIEWPORT HEADER & CAMERA CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#070e1b] border border-slate-800/80">
            <div className="flex items-center gap-1 bg-[#050b14] rounded-md border border-slate-800 p-0.5">
              <button
                onClick={() => setCameraMode('orbit')}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded uppercase transition-colors cursor-pointer ${cameraMode === 'orbit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Orbit
              </button>
              <button
                onClick={() => setCameraMode('topdown')}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded uppercase transition-colors cursor-pointer ${cameraMode === 'topdown' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Top Down
              </button>
              <button
                onClick={() => setCameraMode('free')}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded uppercase transition-colors cursor-pointer ${cameraMode === 'free' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Free Fly
              </button>
              <button
                onClick={() => setCameraMode('slice')}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded uppercase transition-colors cursor-pointer ${cameraMode === 'slice' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Slice
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoOrbit(!autoOrbit)}
                disabled={cameraMode !== 'orbit'}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold rounded border uppercase transition-colors ${cameraMode !== 'orbit' ? 'opacity-50 cursor-not-allowed border-slate-800 text-slate-500' : autoOrbit ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-pointer' : 'bg-[#050b14] text-slate-400 border-slate-700 hover:text-slate-200 cursor-pointer'}`}
              >
                <Video className="w-3 h-3" />
                Auto Orbit
              </button>
              <button
                onClick={() => setShowChunkBorders(!showChunkBorders)}
                className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-bold rounded border uppercase transition-colors cursor-pointer ${showChunkBorders ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-[#050b14] text-slate-400 border-slate-700 hover:text-slate-200'}`}
              >
                <Grid3x3 className="w-3 h-3" />
                Chunks
              </button>
              <button
                onClick={() => setShowWireframe(!showWireframe)}
                className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono font-bold rounded border uppercase transition-colors cursor-pointer ${showWireframe ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'bg-[#050b14] text-slate-400 border-slate-700 hover:text-slate-200'}`}
              >
                <Box className="w-3 h-3" />
                Wire
              </button>
            </div>
          </div>
          
          {/* VIEWPORT CONTAINER */}
          <div className="relative w-full aspect-video sm:aspect-[16/10] rounded-xl overflow-hidden border border-slate-700 shadow-inner bg-[#050b14]">
            
            <SetupVoxelViewport 
              world={deserializedWorld}
              spawnResult={spawnResult}
              cameraMode={cameraMode}
              autoOrbit={autoOrbit}
              showChunkBorders={showChunkBorders}
              showWireframe={showWireframe}
            />

            {/* OVERLAY LOADING SPINNER */}
            {status !== 'READY' && status !== 'ERROR' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-4" />
                <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">
                  {status === 'GENERATING' && `Generating Terrain... (${Math.round((generatedChunksCount / Math.max(1, totalChunksCount)) * 100)}%)`}
                  {status === 'SERIALIZING' && 'Serializing Document...'}
                  {status === 'DESERIALIZING' && 'Deserializing Physics...'}
                </h3>
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
                  MESH READY
                </div>
              </div>
            </div>

            {/* SPAWN VALIDATION HUD */}
            <div className="absolute bottom-2 right-2 p-2 bg-slate-950/60 backdrop-blur-md border border-slate-700/50 rounded pointer-events-none select-none font-mono text-[9px] space-y-1 z-20 min-w-[140px]">
              <div className="text-white font-bold mb-1 border-b border-slate-700/50 pb-1">SPAWN VALIDATION</div>
              {spawnResult ? (
                <>
                  <div className={`flex items-center gap-1.5 ${spawnResult.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {spawnResult.isSafe ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    Solid Ground
                  </div>
                  <div className={`flex items-center gap-1.5 ${spawnResult.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {spawnResult.isSafe ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    2+ Blocks Headroom
                  </div>
                  <div className={`flex items-center gap-1.5 ${spawnResult.isSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {spawnResult.isSafe ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    Not Fluid
                  </div>
                  <div className="text-sky-300 mt-1 pt-1 border-t border-slate-700/50">
                    Pos: X:{spawnResult.position.x} Y:{spawnResult.position.y} Z:{spawnResult.position.z}
                  </div>
                </>
              ) : (
                <div className="text-slate-500 animate-pulse">Calculating Spawn...</div>
              )}
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
              Serialization Integrity Checked
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
          disabled={status !== 'READY' || !spawnResult?.isSafe}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-mono font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 cursor-pointer shadow-lg shadow-sky-500/20"
        >
          Final Review
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
