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

export const NewVoxelMapPanel: React.FC = () => {
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const { mutateMaps } = useMapIndex();

  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [newMapW, setNewMapW] = useState(64);
  const [newMapH, setNewMapH] = useState(64);
  const [isCreating, setIsCreating] = useState(false);

  // Voxel Settings
  const [mapEngine, setMapEngine] = useState<'VOXEL' | 'FRACTAL'>('VOXEL');
  const [genMode, setGenMode] = useState<VoxelGenerationMode>('procedural');
  const [terrainProfile, setTerrainProfile] = useState<VoxelTerrainProfile>('rolling_hills');
  const [seed, setSeed] = useState<string>(() => Math.floor(Math.random() * 1000000).toString());
  const [baseMaterial, setBaseMaterial] = useState<number>(VOXEL_MAT_GRASS);
  const [blockSizePx, setBlockSizePx] = useState<number>(64);
  const [baseElevation, setBaseElevation] = useState<number>(14);
  const [elevationRange, setElevationRange] = useState<number>(8);

  const handleSelectPreset = (preset: SizePreset) => {
    setSizePreset(preset);
    if (preset === 'tiny') {
      setNewMapW(16);
      setNewMapH(16);
    } else if (preset === 'small') {
      setNewMapW(32);
      setNewMapH(32);
    } else if (preset === 'standard') {
      setNewMapW(64);
      setNewMapH(64);
    } else if (preset === 'large') {
      setNewMapW(128);
      setNewMapH(128);
    }
  };

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
      useEditorStore.getState().closePanel('newVoxelMap');
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

    const widthChunks = Math.max(1, Math.ceil(newMapW / 32));
    const depthChunks = Math.max(1, Math.ceil(newMapH / 32));

    const actualGenMode = mapEngine === 'FRACTAL' ? 'procedural' : genMode;

    const generatedVoxelDoc = generateVoxelWorldDoc({
      id: slug,
      name: newMapName.trim() || slug,
      widthChunks,
      depthChunks,
      heightChunks: 1,
      blockSizePx,
      mode: actualGenMode,
      terrainProfile,
      seed,
      baseMaterial,
      baseElevation,
      elevationRange,
    });

    const built = buildNewStudioMap({
      slug,
      name: newMapName.trim() || slug,
      gameId: activeGameId,
      width: newMapW,
      height: newMapH,
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
          width: newMapW,
          height: newMapH,
          grid: newMapData.grid,
          gates: newMapData.gates,
          npcs: newMapData.npcs,
          encounterPool: newMapData.encounterPool,
          mapType: newMapData.mapType,
          tileLayers: newMapData.tileLayers,
          tilesets: newMapData.tilesets,
          voxelDoc: generatedVoxelDoc,
          blockSizePx,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = formatMapWriteError(res.status, err);
        throw new Error(msg);
      }

      showToast(`Created Voxel Map: ${slug}`);
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
          <h3 className="font-bold text-sm text-slate-100">Create Voxel Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Generate a 3D block chunk map or fractal strata.</p>
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

        <div>
          <label className="block text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">Map Engine Type</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMapEngine('VOXEL')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                mapEngine === 'VOXEL'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                  : 'bg-black/40 text-slate-500 border border-border/40 hover:border-border/80'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Standard Voxel</span>
            </button>
            <button
              type="button"
              onClick={() => setMapEngine('FRACTAL')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                mapEngine === 'FRACTAL'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-black/40 text-slate-500 border border-border/40 hover:border-border/80'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Procedural Fractal</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">Map Size Preset</label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'tiny', label: 'Tiny (16×16)' },
              { id: 'small', label: 'Small (32×32)' },
              { id: 'standard', label: 'Standard (64×64)' },
              { id: 'large', label: 'Large (128×128)' },
              { id: 'custom', label: 'Custom' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id as SizePreset)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sizePreset === preset.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'bg-black/30 text-slate-400 border border-border/30 hover:border-border/60 hover:text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {sizePreset === 'custom' && (
          <div className="grid grid-cols-2 gap-3 bg-black/20 p-2.5 rounded-xl border border-border/20">
            <div>
              <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Width (Tiles)</label>
              <input
                type="number"
                min={8}
                max={256}
                value={newMapW}
                onChange={(e) => setNewMapW(Math.max(8, Math.min(256, parseInt(e.target.value) || 32)))}
                className="w-full px-2 py-1 bg-black/50 border border-border/50 rounded-md text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Height (Tiles)</label>
              <input
                type="number"
                min={8}
                max={256}
                value={newMapH}
                onChange={(e) => setNewMapH(Math.max(8, Math.min(256, parseInt(e.target.value) || 32)))}
                className="w-full px-2 py-1 bg-black/50 border border-border/50 rounded-md text-xs text-slate-200"
              />
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2 border-t border-border/20">
          {mapEngine === 'VOXEL' && (
            <div>
              <label className="block text-slate-400 text-[11px] mb-1 font-semibold">Generation Mode:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGenMode('blank')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    genMode === 'blank'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-black/40 text-slate-400 border border-border/40 hover:text-white'
                  }`}
                >
                  Flat / Blank
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('procedural')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    genMode === 'procedural'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-black/40 text-slate-400 border border-border/40 hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-3 h-3" />
                  Procedural
                </button>
              </div>
            </div>
          )}

          {(mapEngine === 'FRACTAL' || genMode === 'procedural') && (
            <div className="space-y-3 bg-blue-950/10 p-3 rounded-xl border border-blue-900/30">
              <div>
                <label className="block text-slate-400 text-[10px] mb-1 font-semibold">Terrain Profile:</label>
                <select
                  value={terrainProfile}
                  onChange={(e) => setTerrainProfile(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-black/50 border border-border/40 rounded-lg text-[11px] text-slate-200 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="rolling_hills">Rolling Hills</option>
                  <option value="rugged_mountains">Rugged Mountains</option>
                  <option value="archipelago">Archipelago / Islands</option>
                  <option value="canyon">Canyon / Mesa</option>
                </select>
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Base Elevation:</span>
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
              </div>
            </div>
          )}

          {/* Base Surface Material */}
          {(mapEngine === 'FRACTAL' || genMode !== 'blank') && (
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
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto shrink-0">
        <div className="text-[10px] text-muted-foreground flex flex-col">
          <span>Footprint: <span className="text-slate-300">{newMapW}×{newMapH}</span> blocks</span>
          <span>Chunks: <span className="text-slate-300">{Math.ceil(newMapW / 32)}×{Math.ceil(newMapH / 32)}</span></span>
        </div>
        <button
          type="button"
          onClick={handleCreateNewMap}
          disabled={isCreating || !newMapSlug.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600/25 hover:bg-blue-600/35 text-blue-300 border border-blue-500/50 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isCreating ? 'Generating…' : 'Generate Voxel Map'}</span>
        </button>
      </div>
    </div>
  );
};
