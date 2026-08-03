'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import { searchMapIndex, registerNewMap } from '../../data/map-index';
import { GAME_MAPS, invalidateMapCache } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';
import { Compass, Plus, Search, Layers, Grid, Save, Shield } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';

export const WorldBuilderPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isCreatingNewMap, setIsCreatingNewMap] = useState(false);
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState(24);
  const [newMapHeight, setNewMapHeight] = useState(24);
  const [isSaving, setIsSaving] = useState(false);
  
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((state) => state.setActiveLayerIdx);
  const brushTileId = useEditorStore((state) => state.activeBrushTileId);
  const setBrushTileId = useEditorStore((state) => state.setActiveBrushTileId);

  const mapIndex = searchMapIndex(mapSearchQuery);
  const baseMapId = toBaseMapId(String(currentMapId || ''));
  const currentMapData = activeMapData || GAME_MAPS[baseMapId] || {
    id: baseMapId,
    name: baseMapId,
    grid: Array(24).fill(0).map(() => Array(24).fill(0)),
    gates: {},
    tileLayers: [{ name: 'Ground', grid: Array(24).fill(0).map(() => Array(24).fill(0)) }],
    tilesets: [
      { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 }
    ]
  };

  const handleWarpToMap = (targetMapId: string) => {
    useGameStore.setState({ currentMapId: targetMapId });
    setMapSearchQuery('');
    showToast(`Warped to map: ${targetMapId}`);
  };

  const handleSaveMap = async () => {
    if (!baseMapId) {
      showToast('No map loaded to save.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: currentMapData.name || baseMapId,
        grid: currentMapData.grid,
        gates: currentMapData.gates || {},
        npcs: currentMapData.npcs || [],
        encounterPool: currentMapData.encounterPool || [],
        tileLayers: currentMapData.tileLayers || [],
        tilesets: currentMapData.tilesets || [],
      };
      const res = await fetch(`/api/maps/${encodeURIComponent(baseMapId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err?.error || `Save failed (${res.status})`);
        return;
      }
      invalidateMapCache(baseMapId);
      // Notify server + peers to hot-reload from WorldMap (shard-safe global broadcast).
      emitSocketEvent?.('admin_reload_map', { mapId: baseMapId });
      showToast(`Saved map ${baseMapId}`);
    } catch (e: any) {
      console.error('[Studio] Save map failed', e);
      showToast(e?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewMapSubmit = () => {
    if (!newMapSlug) {
      showToast('Please enter a valid Map ID slug!');
      return;
    }

    const cleanSlug = newMapSlug.toUpperCase().replace(/\s+/g, '_');
    const newGrid = Array(newMapHeight).fill(0).map((_, r) =>
      Array(newMapWidth).fill(0).map((_, c) =>
        (r === 0 || r === newMapHeight - 1 || c === 0 || c === newMapWidth - 1) ? 1 : 0
      )
    );

    const newMapData = {
      id: cleanSlug,
      name: newMapName || cleanSlug,
      grid: newGrid,
      gates: {},
      npcs: [],
      encounterPool: [],
      tileLayers: [{ name: 'Ground', grid: newGrid }],
      tilesets: [
        { firstgid: 1, imageSource: "Terrain_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 },
        { firstgid: 1000, imageSource: "Furniture_and_Fittings_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
        { firstgid: 2000, imageSource: "Interior_Walls_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
        { firstgid: 3000, imageSource: "Interior_Floors_by_George.png", columns: 10, tilewidth: 16, tileheight: 16 },
        { firstgid: 4000, imageSource: "Vegetation_and_Outdoor_Fittings_by_George.png", columns: 15, tilewidth: 16, tileheight: 16 }
      ]
    };

    registerNewMap(newMapData);
    useGameStore.setState({ currentMapId: cleanSlug, activeMapData: newMapData });
    setIsCreatingNewMap(false);
    showToast(`Created & Warped to new map: ${cleanSlug}`);
  };

  const handleBrushSelect = (tileId: number) => {
    setBrushTileId(tileId);
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      {/* MAP SELECTOR */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center justify-between text-[#cbb26a]">
          <span className="flex items-center gap-1.5 font-bold"><Compass className="w-3.5 h-3.5" /> World:</span>
          <span className="text-white px-2 py-0.5 rounded border border-[#806f47]/30 bg-[#050b14]">{baseMapId || currentMapId}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveMap()}
          disabled={isSaving}
          className="w-full py-1.5 bg-[#cbb26a]/90 hover:bg-[#cbb26a] disabled:opacity-50 text-[#0a0a0f] rounded font-bold flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save Map'}
        </button>

        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={mapSearchQuery}
            onChange={(e) => setMapSearchQuery(e.target.value)}
            placeholder="Search map..."
            className="w-full pl-7 pr-2 py-1 bg-[#050b14]/90 border border-slate-700/80 rounded text-slate-200 focus:outline-none focus:border-[#cbb26a]"
          />
        </div>

        {mapSearchQuery && (
          <div className="max-h-32 overflow-y-auto bg-[#050b14] border border-slate-700 rounded divide-y divide-slate-800 custom-scrollbar">
            {mapIndex.map((m) => (
              <div
                key={m.id}
                onClick={() => handleWarpToMap(m.id)}
                className="px-2 py-1 hover:bg-white/10 cursor-pointer flex justify-between items-center"
              >
                <span>{m.name}</span>
                <span className="text-[9px] text-[#cbb26a]">{m.category}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsCreatingNewMap(!isCreatingNewMap)}
          className="w-full py-1 border border-dashed border-[#806f47]/50 hover:bg-[#806f47]/20 text-slate-300 rounded flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Create New Map
        </button>

        {isCreatingNewMap && (
          <div className="p-2 bg-[#050b14] border border-[#806f47]/40 rounded space-y-2 mt-2">
            <input
              type="text"
              value={newMapSlug}
              onChange={(e) => setNewMapSlug(e.target.value)}
              placeholder="MAP_ID"
              className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
            />
            <input
              type="text"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="Display Name"
              className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
            />
            <button
              onClick={handleCreateNewMapSubmit}
              className="w-full py-1 bg-green-600/80 hover:bg-green-500 text-white rounded font-bold"
            >
              Generate
            </button>
          </div>
        )}
      </div>

      {/* LAYER SELECTOR */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Layers className="w-3.5 h-3.5" /> Layer Targeting
        </div>
        <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveLayerIdx(-1)}
            className={`px-2 py-1 rounded border min-w-max transition-all flex items-center gap-1 ${
              activeLayerIdx === -1
                ? 'bg-rose-900/40 border-rose-400 text-rose-100'
                : 'border-transparent text-slate-400 hover:bg-white/5'
            }`}
            title="Collision / authority grid (bible layer −1)"
          >
            <Shield className="w-3 h-3" /> Logic (−1)
          </button>
          {currentMapData.tileLayers?.map((layer: { name?: string }, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveLayerIdx(idx)}
              className={`px-2 py-1 rounded border min-w-max transition-all ${
                activeLayerIdx === idx
                  ? 'bg-[#806f47]/30 border-[#cbb26a] text-white'
                  : 'border-transparent text-slate-400 hover:bg-white/5'
              }`}
            >
              {layer.name} ({idx})
            </button>
          ))}
        </div>
      </div>

      {/* TILESET PICKER */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Grid className="w-3.5 h-3.5" /> Asset Picker
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <TilesetPicker
            tilesets={currentMapData.tilesets || []}
            activeBrushTileId={brushTileId}
            onBrushSelect={handleBrushSelect}
            activeLayerIdx={activeLayerIdx}
            onLayerChange={setActiveLayerIdx}
            tileLayers={currentMapData.tileLayers || []}
            onAddLayer={() => {}} // Placeholder for now
          />
        </div>
      </div>
    </div>
  );
};
