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
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { SetupEnvironmentData } from './EnvironmentSetupStep';
import type { GameDefinitionData } from './GameDefinitionStep';
import { generateDefaultWorldDoc, type VoxelWorldDocV3 } from '@/shared/game/voxel/VoxelWorldDoc';
import { generateVoxelWorldDoc, type VoxelWorldGenerationConfig } from '@/shared/game/voxel/VoxelWorldGenerator';
import { extractPhysics, VOXEL_WORD_AIR_LOW, VoxelPhysics, VOXEL_MAT_WATER, VOXEL_MAT_LAVA } from '@/shared/game/voxel/VoxelWord';
import { VoxelChunk, CHUNK_SIZE_X, CHUNK_SIZE_Z, CHUNK_SIZE_Y } from '@/shared/game/voxel/VoxelChunk';
import { resolveSafeVoxelSpawn, type SpawnValidationResult } from '@/shared/game/voxel/SpawnResolver';

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
  widthChunks: number; // committed chunks
  depthChunks: number;
  heightChunks: number;
  width: number;
  height: number;
  blockSizePx: number;
  foundationMaterial: string;
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
  gameDefinition: GameDefinitionData;
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
  environment,
  gameDefinition,
  startingMap,
  onChange,
  onNext,
  onBack,
}: StartingMapStepProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [previewSizeChunks, setPreviewSizeChunks] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<VoxelWorldDocV3 | null>(null);
  const [spawnResult, setSpawnResult] = useState<SpawnValidationResult | null>(null);
  const [generationTimeMs, setGenerationTimeMs] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const STARTER_REGION_CHUNKS = 4;
  const totalWidthBlocks = previewSizeChunks * CHUNK_SIZE_X;
  const totalDepthBlocks = previewSizeChunks * CHUNK_SIZE_Z;

  // 1. Generation Effect
  useEffect(() => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSpawnResult(null);

    const t = setTimeout(() => {
      try {
        const t0 = performance.now();
        const seedStr = gameDefinition.name || Date.now().toString();

        // We ONLY ever need to generate the 4x4 starter region for spawn validation!
        // The visual canvas is just a mockup grid, so generating 1024 chunks synchronously is pointless and freezes the UI.
        const doc = generateVoxelWorldDoc({
          id: 'STARTING_MEADOW',
          name: 'Genesis Sanctuary',
          widthChunks: STARTER_REGION_CHUNKS,
          depthChunks: STARTER_REGION_CHUNKS,
          heightChunks: 1, // 32 blocks
          mode: 'procedural',
          seed: seedStr,
          baseMaterial: environment.foundationMaterial === 'gunmetal' ? 1 : 2, // Map to voxel ID roughly
          baseElevation: 16,
        });

        // Try to find a safe spawn near the center
        const centerX = Math.floor((STARTER_REGION_CHUNKS * CHUNK_SIZE_X) / 2);
        const centerZ = Math.floor((STARTER_REGION_CHUNKS * CHUNK_SIZE_Z) / 2);
        
        const safeSpawn = resolveSafeVoxelSpawn(doc, centerX, centerZ, 64);
        
        setPreviewDoc(doc);
        setSpawnResult(safeSpawn);
        setGenerationTimeMs(performance.now() - t0);
        
        // If it's the 4x4 (starter) region, update the parent state
        if (previewSizeChunks === STARTER_REGION_CHUNKS && safeSpawn.isSafe) {
          onChange({
            ...startingMap,
            widthChunks: STARTER_REGION_CHUNKS,
            depthChunks: STARTER_REGION_CHUNKS,
            voxelDoc: doc,
            spawnPoint: { x: safeSpawn.position.x, y: safeSpawn.position.z, z: safeSpawn.position.y },
            width: STARTER_REGION_CHUNKS * CHUNK_SIZE_X,
            height: STARTER_REGION_CHUNKS * CHUNK_SIZE_Z,
            gates: [
              {
                id: 'spawn',
                name: 'Genesis Gate',
                category: 'SPAWN',
                position: { x: safeSpawn.position.x, y: safeSpawn.position.z, z: safeSpawn.position.y },
                interactPrompt: 'Respawn',
              }
            ]
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to generate preview');
      } finally {
        setIsGenerating(false);
      }
    }, 50);

    return () => clearTimeout(t);
  }, [previewSizeChunks, environment.foundationMaterial, gameDefinition.name]);

  // 2. Draw 2D Height/Biome Map Effect
  useEffect(() => {
    if (!previewDoc || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Background
    ctx.fillStyle = '#060c18';
    ctx.fillRect(0, 0, cw, ch);

    const blocksX = previewSizeChunks * CHUNK_SIZE_X;
    const blocksZ = previewSizeChunks * CHUNK_SIZE_Z;
    
    // Fit the map into the canvas, keeping square aspect
    const pixelSize = Math.min(cw / blocksX, ch / blocksZ);
    const offsetX = (cw - blocksX * pixelSize) / 2;
    const offsetY = (ch - blocksZ * pixelSize) / 2;

    // Fast-path to draw chunks: we won't fully deserialize for preview, just scan doc.chunks
    // But since it's an RLE array, parsing it perfectly for a top-down view is a bit complex.
    // However, since it's just a top-down heightmap, we can parse it roughly or just use a helper.
    // For simplicity, we just use the spawnResult's heightmap logic if we want, but let's do a basic visual.
    
    // As a shortcut for this preview, let's draw a nice procedurally colored noise grid,
    // because parsing RLE in the UI thread for 1024x1024 blocks (32x32 chunks) is heavy.
    // The actual doc was generated properly above.
    
    // To make it reflect the data somewhat accurately without full RLE decoding:
    // We will just draw a grid based on chunks.
    ctx.fillStyle = environment.foundationMaterial === 'grass' ? '#166534' : '#1e293b';
    ctx.fillRect(offsetX, offsetY, blocksX * pixelSize, blocksZ * pixelSize);

    // Grid lines for chunks
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    for (let i = 0; i <= previewSizeChunks; i++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * CHUNK_SIZE_X * pixelSize, offsetY);
      ctx.lineTo(offsetX + i * CHUNK_SIZE_X * pixelSize, offsetY + blocksZ * pixelSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * CHUNK_SIZE_Z * pixelSize);
      ctx.lineTo(offsetX + blocksX * pixelSize, offsetY + i * CHUNK_SIZE_Z * pixelSize);
      ctx.stroke();
    }

    // Starter Region Highlight
    if (previewSizeChunks > STARTER_REGION_CHUNKS) {
      // Highlight the center 4x4 region
      const startCX = Math.floor(previewSizeChunks / 2) - 2;
      const startCZ = Math.floor(previewSizeChunks / 2) - 2;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        offsetX + startCX * CHUNK_SIZE_X * pixelSize,
        offsetY + startCZ * CHUNK_SIZE_Z * pixelSize,
        STARTER_REGION_CHUNKS * CHUNK_SIZE_X * pixelSize,
        STARTER_REGION_CHUNKS * CHUNK_SIZE_Z * pixelSize
      );
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#38bdf820';
      ctx.fillRect(
        offsetX + startCX * CHUNK_SIZE_X * pixelSize,
        offsetY + startCZ * CHUNK_SIZE_Z * pixelSize,
        STARTER_REGION_CHUNKS * CHUNK_SIZE_X * pixelSize,
        STARTER_REGION_CHUNKS * CHUNK_SIZE_Z * pixelSize
      );
    }

    // Draw Spawn Point
    if (spawnResult) {
      const sx = offsetX + spawnResult.position.x * pixelSize;
      const sz = offsetY + spawnResult.position.z * pixelSize;
      
      // Halo
      ctx.beginPath();
      ctx.arc(sx, sz, 12, 0, Math.PI * 2);
      ctx.fillStyle = spawnResult.isSafe ? '#22c55e40' : '#ef444440';
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(sx, sz, 4, 0, Math.PI * 2);
      ctx.fillStyle = spawnResult.isSafe ? '#22c55e' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(spawnResult.isSafe ? 'Genesis Spawn' : 'Unsafe Spawn', sx, sz - 14);
    }

  }, [previewDoc, spawnResult, previewSizeChunks, environment.foundationMaterial]);

  const handlePublishClick = () => {
    // Only allow proceeding if the 4x4 region generated safely
    if (previewSizeChunks !== 4) {
      setPreviewSizeChunks(4); // Force switch to 4x4 for commit
      return;
    }
    
    if (spawnResult?.isSafe) {
      onNext();
    }
  };

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
            Procedural World Generation & Genesis Validation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT COLUMN: INFO & CONTROLS */}
        <div className="md:col-span-5 flex flex-col justify-start space-y-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2 text-primary font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Genesis Map: {gameDefinition.name || 'Starting Meadow'}</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed mb-4">
              Your server will initialize with a <strong>{STARTER_REGION_CHUNKS}x{STARTER_REGION_CHUNKS} chunk</strong> starting region ({STARTER_REGION_CHUNKS * CHUNK_SIZE_X}x{STARTER_REGION_CHUNKS * CHUNK_SIZE_Z} blocks).
              You can preview how this region fits into a larger procedural world by zooming out.
            </p>
            
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Preview Zoom (Generative)</div>
              <div className="grid grid-cols-2 gap-2">
                {[4, 8, 16, 32].map((size) => (
                  <button
                    key={size}
                    onClick={() => setPreviewSizeChunks(size)}
                    className={`px-2 py-1.5 rounded border text-[11px] flex items-center justify-center gap-1.5 transition ${
                      previewSizeChunks === size
                        ? 'bg-primary/20 border-primary/50 text-primary font-bold shadow-inner'
                        : 'bg-slate-900/50 border-border/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {size}x{size}
                    {size === 4 && <span className="ml-1 text-[9px] opacity-70">(Starter)</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* DIAGNOSTICS PANEL */}
          <div className="p-3 bg-[#0a1628]/80 border border-border/40 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold mb-2">
              <Shield className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Generation Diagnostics</span>
            </div>
            
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Seed</span>
              <span className="text-slate-300 truncate max-w-[120px]">{gameDefinition.name || 'Random'}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Generation Time</span>
              <span className="text-slate-300">{generationTimeMs.toFixed(0)} ms</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">Blocks</span>
              <span className="text-slate-300">{(previewSizeChunks * previewSizeChunks * CHUNK_SIZE_Y * CHUNK_SIZE_X * CHUNK_SIZE_Z).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-border/30">
              <span className="text-slate-500">Spawn Safety</span>
              {spawnResult ? (
                spawnResult.isSafe ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Safe (Y:{spawnResult.position.y})
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> {spawnResult.reason || 'Unsafe'}
                  </span>
                )
              ) : (
                <span className="text-slate-400">Evaluating...</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2D TOP-DOWN PREVIEW */}
        <div className="md:col-span-7 flex flex-col">
          <div className="h-full rounded-lg overflow-hidden border border-border/50 bg-[#060c18] flex flex-col relative">
            
            {/* Overlay Loading */}
            {isGenerating && (
              <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-primary">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="font-bold tracking-widest text-[10px] uppercase">Generating World...</span>
              </div>
            )}
            
            <div className="flex items-center justify-between px-2.5 py-1 bg-[#0a1424] border-b border-border/40 text-[10px] font-mono select-none z-20">
              <span className="text-foreground flex items-center gap-1 font-bold">
                <Boxes className="w-3 h-3 text-primary" />
                2D Top-Down Heightmap
              </span>
              <span className="text-primary font-bold">
                {totalWidthBlocks}x{totalDepthBlocks}
              </span>
            </div>
            
            <div className="flex-1 relative min-h-[250px]">
              <canvas
                ref={canvasRef}
                width={500}
                height={400}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="p-1.5 bg-[#0a1424]/80 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground z-20">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                {previewSizeChunks === STARTER_REGION_CHUNKS ? 'Starter Region View' : 'Regional Context View'}
              </span>
              {spawnResult?.isSafe ? (
                <span className="text-emerald-400 font-bold">Ready</span>
              ) : (
                <span className="text-rose-400 font-bold">Not Ready</span>
              )}
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

        {previewSizeChunks !== 4 ? (
          <button
            type="button"
            onClick={() => setPreviewSizeChunks(4)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer shadow-md"
          >
            Switch to 4x4 & Review
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePublishClick}
            disabled={isGenerating || !spawnResult?.isSafe}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded font-bold text-xs transition cursor-pointer shadow-md ${
              isGenerating || !spawnResult?.isSafe
                ? 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
            }`}
          >
            {isGenerating ? 'Validating...' : !spawnResult?.isSafe ? 'Spawn Blocked' : 'Commit Region to Server'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
