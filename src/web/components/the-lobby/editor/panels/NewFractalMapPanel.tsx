'use client';

import React, { useState } from 'react';
import { Sparkles, Box, Dices, Layers, Grid3X3 } from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { useMapIndex } from '@/web/hooks/studio-data';
import { buildNewStudioMap, formatMapWriteError } from '@/shared/game/studioMapCreate';
import { soundSynth } from '@/engine/sound-synth';
import { loadMap } from '../../data/maps';
import {
  generateVoxelWorldDoc,
  type VoxelTerrainProfile,
  type VoxelGenerationMode,
} from '@/shared/game/voxel/VoxelWorldGenerator';
import {
  VOXEL_MAT_GRASS,
  VOXEL_MAT_STONE,
  VOXEL_MAT_SAND,
  VOXEL_MAT_DIRT,
  VOXEL_MAT_SNOW,
} from '@/shared/game/voxel/VoxelMaterialDefinition';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';

type SizePreset = 'tiny' | 'small' | 'standard' | 'large' | 'custom';

export const NewFractalMapPanel: React.FC = () => {
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const { mutateMaps } = useMapIndex();

  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [borderRadius, setBorderRadius] = useState<number>(0);
  const [pregenRadius, setPregenRadius] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Voxel Settings
  const mapEngine = 'FRACTAL';
  const genMode = 'procedural';
  const [seed, setSeed] = useState<string>(() => Math.floor(Math.random() * 1000000).toString());
  const [baseMaterial, setBaseMaterial] = useState<number>(VOXEL_MAT_GRASS);
  const [blockSizePx, setBlockSizePx] = useState<number>(64);
  const [baseElevation, setBaseElevation] = useState<number>(14);
  const [elevationRange, setElevationRange] = useState<number>(8);
  const [waterLevel, setWaterLevel] = useState<number>(12);

  const handleRandomizeSeed = () => {
    soundSynth?.playActionSound?.();
    setSeed(Math.floor(Math.random() * 10000000).toString());
  };

  const handleWarp = async (mapId: string) => {
    soundSynth?.playActionSound?.();
    try {
      const loaded = ensureMapHasStudioTilesets(await loadMap(mapId));
      const mw = loaded.grid?.[0]?.length || loaded.width || 24;
      const mh = loaded.grid?.length || loaded.height || 24;
      const cx = Math.max(1, Math.min(mw - 2, Math.floor(mw / 2)));
      const cy = Math.max(1, Math.min(mh - 2, Math.floor(mh / 2)));
      useGameStore.setState({ currentMapId: mapId, activeMapData: loaded });
      useGameStore.getState().setPlayerPosition({ x: cx, y: cy }, 'down', false);
      useEditorStore.getState().setStudioMode('voxel');
      showToast(`Switched to ${mapId}`);
      useEditorStore.getState().closePanel('newFractalMap');
      useEditorStore.getState().openPanel('build');
    } catch {
      useGameStore.setState({ currentMapId: mapId });
      showToast(`Switched to ${mapId} (loading…)`);
    }
  };

  const handleCreateNewMap = async () => {
    const slug = newMapSlug.trim().toUpperCase();
    if (!slug) {
      showToast('Please enter a map ID slug.');
      return;
    }

    const actualGenMode = mapEngine === 'FRACTAL' ? 'procedural' : genMode;

    const generatedVoxelDoc = generateVoxelWorldDoc({
      id: slug,
      name: newMapName.trim() || slug,
      widthChunks: 1, // Doesn't matter for infinite procedural fractal maps
      depthChunks: 1,
      heightChunks: 1,
      blockSizePx,
      mode: actualGenMode,
      seed,
      baseMaterial,
      baseElevation,
      elevationRange,
      waterLevel,
    });

    const built = buildNewStudioMap({
      slug,
      name: newMapName.trim() || slug,
      gameId: activeGameId,
      width: 8,
      height: 8,
      mapType: mapEngine,
    });
    if (!built.ok) {
      showToast(built.error);
      return;
    }

    const newMapData = {
      ...built.map,
      voxelDoc: generatedVoxelDoc,
      blockSizePx,
    };

    setIsCreating(true);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMapData.name,
          gameId: newMapData.gameId,
          width: newMapData.width,
          height: newMapData.height,
          grid: newMapData.grid,
          gates: newMapData.gates,
          npcs: newMapData.npcs,
          encounterPool: newMapData.encounterPool,
          mapType: newMapData.mapType,
          tileLayers: newMapData.tileLayers,
          tilesets: newMapData.tilesets,
          voxelDoc: generatedVoxelDoc,
          blockSizePx,
          fractalBorderRadius: borderRadius,
          fractalPregenRadius: pregenRadius,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = formatMapWriteError(res.status, err);
        throw new Error(msg);
      }

      showToast(`Created Fractal Map: ${slug}`);
      setNewMapSlug('');
      setNewMapName('');

      mutateMaps();
      handleWarp(slug);
    } catch (e: any) {
      showToast(e?.message || 'Error creating map');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden p-4">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-4 shrink-0">
        <Box className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="font-bold text-sm text-slate-100">Create Fractal Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Generate a procedural fractal strata.</p>
        </div>
      </div>

      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">Map ID Slug *</label>
            <input
              type="text"
              value={newMapSlug}
              onChange={(e) => setNewMapSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
              placeholder="e.g. SKY_ISLAND"
              className="w-full px-2.5 py-1.5 bg-black/50 border border-border/50 rounded-lg text-xs font-bold text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50 uppercase"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="e.g. Floating Skies"
              className="w-full px-2.5 py-1.5 bg-black/50 border border-border/50 rounded-lg text-xs text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>



        <div className="grid grid-cols-2 gap-3 bg-black/20 p-2.5 rounded-xl border border-border/20">
          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-semibold">World Border Radius (Chunks)</label>
            <input
              type="number"
              min={0}
              max={64}
              value={borderRadius}
              onChange={(e) => setBorderRadius(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-black/50 border border-border/50 rounded-md text-xs text-slate-200"
            />
            <span className="text-[9px] text-muted-foreground mt-0.5 block">0 = Infinite (No Border)</span>
          </div>
          <div>
            <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Pre-Generate Radius (Chunks)</label>
            <input
              type="number"
              min={0}
              max={16}
              value={pregenRadius}
              onChange={(e) => setPregenRadius(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-2 py-1 bg-black/50 border border-border/50 rounded-md text-xs text-slate-200"
            />
            <span className="text-[9px] text-muted-foreground mt-0.5 block">Radius of initial spawn area to build immediately.</span>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-border/20">


          <div className="space-y-3 bg-blue-950/10 p-3 rounded-xl border border-blue-900/30">
              <div className="text-xs text-blue-300/70 italic mb-2">
                Atlas World Generation Engine is active. Terrain and strata will be procedurally generated based on the seed.
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 text-[10px] font-semibold">World Seed:</label>
                  <button type="button" onClick={handleRandomizeSeed} className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Dices className="w-3 h-3" /> Randomize
                  </button>
                </div>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full px-2 py-1.5 bg-black/50 border border-border/40 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Base Elev:</span>
                    <span className="text-blue-400 font-bold">{baseElevation}</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={24}
                    value={baseElevation}
                    onChange={(e) => setBaseElevation(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Height Var:</span>
                    <span className="text-blue-400 font-bold">±{elevationRange}</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    value={elevationRange}
                    onChange={(e) => setElevationRange(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Sea Level:</span>
                    <span className="text-blue-400 font-bold">{waterLevel}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    value={waterLevel}
                    onChange={(e) => setWaterLevel(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>


          {/* Base Surface Material */}
          <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Base Surface Material:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: VOXEL_MAT_GRASS, label: 'Grass', color: 'bg-emerald-600' },
                  { id: VOXEL_MAT_STONE, label: 'Stone', color: 'bg-slate-500' },
                  { id: VOXEL_MAT_SAND, label: 'Sand', color: 'bg-amber-400' },
                  { id: VOXEL_MAT_DIRT, label: 'Dirt', color: 'bg-amber-900' },
                  { id: VOXEL_MAT_SNOW, label: 'Snow', color: 'bg-sky-200' },
                ].map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setBaseMaterial(mat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      baseMaterial === mat.id
                        ? 'border-blue-500/80 bg-blue-500/20 text-blue-300 font-bold'
                        : 'border-border/40 bg-[#0b1626] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${mat.color}`} />
                    <span>{mat.label}</span>
                  </button>
                ))}
              </div>
            </div>

        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto shrink-0">
        <div className="text-[10px] text-muted-foreground flex flex-col">
          <span>Footprint: <span className="text-slate-300">Infinite (JIT Streaming)</span></span>
          <span>Starting Area: <span className="text-slate-300">{pregenRadius * 2 + 1}×{pregenRadius * 2 + 1} Chunks</span></span>
        </div>
        <button
          type="button"
          onClick={handleCreateNewMap}
          disabled={isCreating || !newMapSlug.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600/25 hover:bg-blue-600/35 text-blue-300 border border-blue-500/50 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isCreating ? 'Generating…' : 'Generate Fractal Map'}</span>
        </button>
      </div>
    </div>
  );
};
