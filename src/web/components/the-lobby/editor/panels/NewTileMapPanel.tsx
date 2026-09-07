'use client';

import React, { useState } from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { useMapIndex } from '@/web/hooks/studio-data';
import { buildNewStudioMap, formatMapWriteError } from '@/shared/game/studioMapCreate';
import { soundSynth } from '@/engine/sound-synth';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { loadMap } from '../../data/maps';

type SizePreset = 'tiny' | 'small' | 'standard' | 'large' | 'custom';

export const NewTileMapPanel: React.FC = () => {
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const { mutateMaps } = useMapIndex();

  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [newMapW, setNewMapW] = useState(64);
  const [newMapH, setNewMapH] = useState(64);
  const [isCreating, setIsCreating] = useState(false);

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
      useEditorStore.getState().setStudioMode('tile');
      showToast(`Switched to ${mapId}`);
      useEditorStore.getState().closePanel('newTileMap');
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

    const built = buildNewStudioMap({
      slug,
      name: newMapName.trim() || slug,
      gameId: activeGameId,
      width: newMapW,
      height: newMapH,
      mapType: 'TILE',
    });
    if (!built.ok) {
      showToast(built.error);
      return;
    }

    const newMapData = built.map;

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
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = formatMapWriteError(res.status, err);
        throw new Error(msg);
      }

      showToast(`Created Tile Map: ${slug}`);
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
      <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-bold text-sm text-slate-100">Create Tile Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Generate a blank 2.5D layer-based map.</p>
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
              placeholder="e.g. CITY_CENTER"
              className="w-full px-2.5 py-1.5 bg-black/50 border border-border/50 rounded-lg text-xs font-bold text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 uppercase select-text"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="block text-slate-400 text-[11px] mb-1 font-semibold uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="e.g. Goldenrod City"
              className="w-full px-2.5 py-1.5 bg-black/50 border border-border/50 rounded-lg text-xs text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 select-text"
              onKeyDown={(e) => e.stopPropagation()}
            />
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
                    ? 'bg-primary/20 text-primary border border-primary/40'
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
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/40 mt-auto">
        <div className="text-[10px] text-muted-foreground">
          Footprint: <span className="text-slate-300">{newMapW}×{newMapH}</span>
        </div>
        <button
          type="button"
          onClick={handleCreateNewMap}
          disabled={isCreating || !newMapSlug.trim()}
          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary/25 hover:bg-primary/35 text-amber-300 border border-primary/50 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isCreating ? 'Generating…' : 'Generate Tile Map'}</span>
        </button>
      </div>
    </div>
  );
};
