'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store';
import { toBaseMapId } from '@/shared/net/mapIds';
import {
  Compass,
  Layers,
  Grid,
  Save,
  Shield,
  ChevronDown,
  ChevronRight,
  Globe,
  ArrowUpRight,
  Eye,
  EyeOff,
  Navigation,
  Sparkles,
  Trees,
  X,
  Plus,
  Brush,
  Magnet,
  Maximize2,
  Box,
} from 'lucide-react';
import { useEditorStore } from '../editor-store';

import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { getAdjacentAtlasNeighbors, type NeighborNodes } from '@/shared/game/atlas/spatialAtlas';
import { loadMap, getClientAtlas } from '../../data/maps';
import { soundSynth } from '@/engine/sound-synth';
import { SheetSlicerPanel } from './SheetSlicerPanel';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
  WindowMenuTabGroup,
} from '../WindowMenuBar';

export const WorldBuilderPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const showToast = useGameStore((state) => state.showToast);
  const isSaving = useEditorStore((state) => state.isSavingMap);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    neighbors: true,
    encounters: true,
    layers: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((state) => state.setActiveLayerIdx);
  const activeLayerType = useEditorStore((state) => state.activeLayerType);
  const setActiveLayerType = useEditorStore((state) => state.setActiveLayerType);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const setBrushRadius = useEditorStore((state) => state.setBrushRadius);
  const snapToGrid = useEditorStore((state) => state.snapToGrid);
  const setSnapToGrid = useEditorStore((state) => state.setSnapToGrid);
  const brushTileId = useEditorStore((state) => state.activeBrushTileId);
  const isMapDirty = useEditorStore((state) => state.mapDirty);
  const setBrushTileId = useEditorStore((state) => state.setActiveBrushTileId);
  const setBrushPattern = useEditorStore((state) => state.setActiveBrushPattern);
  const voxelBlockSizePx = useEditorStore((state) => state.voxelBlockSizePx);

  const baseMapId = typeof currentMapId === 'string' ? currentMapId.replace(/_.*/, '') : '';
  const currentMapData = activeMapData || {
    id: baseMapId,
    name: baseMapId,
    grid: Array(24).fill(0).map(() => Array(24).fill(0)),
    gates: {},
    tileLayers: [],
    tilesets: [],
    baseTileSizePx: 32,
  };

  const handleAddLayer = () => {
    if (!activeMapData) {
      showToast('Load a map before adding layers.');
      return;
    }
    const base = activeMapData;
    const h = base.grid?.length || 24;
    const w = base.grid?.[0]?.length || 24;
    const empty = Array(h).fill(0).map(() => Array(w).fill(0));
    const layers = Array.isArray(base.tileLayers) ? [...base.tileLayers] : [];
    const nextIdx = layers.length;
    layers.push({ name: `Layer ${nextIdx}`, grid: empty });
    const next = { ...base, tileLayers: layers };
    useGameStore.getState().setActiveMapData(next);
    setActiveLayerIdx(nextIdx);
    useEditorStore.getState().markMapDirty();
    showToast(`Added ${layers[nextIdx].name} — Save Map to persist.`);
  };

  const handleDeleteLayer = (layerIdx: number) => {
    if (!activeMapData) return;
    const base = activeMapData;
    const layers = Array.isArray(base.tileLayers) ? [...base.tileLayers] : [];
    if (layers.length <= 1 || layerIdx === 0) {
      if (confirm(`Clear all tiles on Layer ${layerIdx} (${layers[layerIdx]?.name || 'Ground'})?`)) {
        soundSynth?.playActionSound?.();
        const h = base.grid?.length || 24;
        const w = base.grid?.[0]?.length || 24;
        layers[layerIdx] = { ...layers[layerIdx], grid: Array(h).fill(0).map(() => Array(w).fill(0)) };
        const next = { ...base, tileLayers: layers };
        useGameStore.getState().setActiveMapData(next);
        const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
        if (engine) engine.loadTilemap(next);
        useEditorStore.getState().markMapDirty();
        showToast(`Cleared ${layers[layerIdx].name}`);
      }
      return;
    }

    const layerName = layers[layerIdx]?.name || `Layer ${layerIdx}`;
    if (confirm(`Delete ${layerName}? All tiles on this layer will be removed.`)) {
      soundSynth?.playActionSound?.();
      layers.splice(layerIdx, 1);
      const next = { ...base, tileLayers: layers };
      useGameStore.getState().setActiveMapData(next);
      if (activeLayerIdx >= layers.length) {
        setActiveLayerIdx(Math.max(0, layers.length - 1));
      }
      const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
      if (engine) engine.loadTilemap(next);
      useEditorStore.getState().markMapDirty();
      showToast(`Deleted ${layerName}`);
    }
  };

  const handleAddFreeformLayer = (type: 'paint-splat' | 'free-form' | 'polygon') => {
    if (!activeMapData) {
      showToast('Load a map before adding layers.');
      return;
    }
    const base = activeMapData;
    const layers = Array.isArray(base.freeformLayers) ? [...base.freeformLayers] : [];
    const nextIdx = layers.length;
    layers.push({
      id: `layer_${type}_${Date.now()}`,
      name: `New ${type === 'paint-splat' ? 'Splat' : type === 'free-form' ? 'Prop' : 'Polygon'} Layer`,
      type,
      data: {},
      objects: [],
      regions: []
    });
    const next = { ...base, freeformLayers: layers };
    useGameStore.getState().setActiveMapData(next);
    setActiveLayerIdx(nextIdx);
    setActiveLayerType(type);
    useEditorStore.getState().markMapDirty();
    showToast(`Added ${layers[nextIdx].name} — Save Map to persist.`);
  };

  const handleDeleteFreeformLayer = (layerIdx: number) => {
    if (!activeMapData) return;
    const base = activeMapData;
    const layers = Array.isArray(base.freeformLayers) ? [...base.freeformLayers] : [];
    const layerName = layers[layerIdx]?.name || `Layer ${layerIdx}`;
    
    if (confirm(`Delete ${layerName}? All data on this freeform layer will be removed.`)) {
      soundSynth?.playActionSound?.();
      layers.splice(layerIdx, 1);
      const next = { ...base, freeformLayers: layers };
      useGameStore.getState().setActiveMapData(next);
      
      if (layers.length === 0) {
        setActiveLayerType('grid');
        setActiveLayerIdx(0);
      } else if (activeLayerIdx >= layers.length) {
        setActiveLayerIdx(Math.max(0, layers.length - 1));
        setActiveLayerType(layers[layers.length - 1].type);
      }
      useEditorStore.getState().markMapDirty();
      showToast(`Deleted ${layerName}`);
    }
  };

  const handleClearLayer = (layerIdx: number) => {
    if (!activeMapData) return;
    const base = activeMapData;
    const layers = Array.isArray(base.tileLayers) ? [...base.tileLayers] : [];
    if (!layers[layerIdx]) return;
    const layerName = layers[layerIdx].name || `Layer ${layerIdx}`;
    if (confirm(`Clear all tiles on ${layerName}?`)) {
      soundSynth?.playActionSound?.();
      const h = base.grid?.length || 24;
      const w = base.grid?.[0]?.length || 24;
      layers[layerIdx] = { ...layers[layerIdx], grid: Array(h).fill(0).map(() => Array(w).fill(0)) };
      const next = { ...base, tileLayers: layers };
      useGameStore.getState().setActiveMapData(next);
      const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
      if (engine) engine.loadTilemap(next);
      useEditorStore.getState().markMapDirty();
      showToast(`Cleared ${layerName}`);
    }
  };

  const handleFillLayer = (layerIdx: number, gid: number) => {
    if (!activeMapData) return;
    const base = activeMapData;
    const layers = Array.isArray(base.tileLayers) ? [...base.tileLayers] : [];
    if (!layers[layerIdx]) return;
    soundSynth?.playActionSound?.();
    const h = base.grid?.length || 24;
    const w = base.grid?.[0]?.length || 24;
    layers[layerIdx] = { ...layers[layerIdx], grid: Array(h).fill(0).map(() => Array(w).fill(gid)) };
    const next = { ...base, tileLayers: layers };
    useGameStore.getState().setActiveMapData(next);
    const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
    if (engine) engine.loadTilemap(next);
    useEditorStore.getState().markMapDirty();
    showToast(`Filled ${layers[layerIdx].name} with GID #${gid}`);
  };

  const handleSetDefaultGroundGid = (gid: number) => {
    if (!activeMapData) return;
    const updated = {
      ...activeMapData,
      defaultGroundGid: gid,
    };
    useGameStore.getState().setActiveMapData(updated);
    useEditorStore.getState().markMapDirty();
  };

  const handleBrushSelect = (tileId: number) => {
    setBrushTileId(tileId);
    if (activeLayerIdx === -1) {
      setActiveLayerIdx(0);
      showToast('Switched to layer 0 (Visual) for tile paint.');
    }
  };

  const handleBrushSelectPattern = (pattern: { w: number; h: number; gids: number[][] }) => {
    setBrushPattern(pattern);
    if (pattern.gids?.[0]?.[0]) {
      setBrushTileId(pattern.gids[0][0]);
    }
    if (activeLayerIdx === -1) {
      setActiveLayerIdx(0);
      showToast('Switched to layer 0 (Visual) for tile paint.');
    }
  };

  const handleUpdateTilesets = (newTilesets: any[]) => {
    if (!activeMapData) return;
    const updated = {
      ...activeMapData,
      tilesets: newTilesets,
    };
    useGameStore.getState().setActiveMapData(updated);
    useEditorStore.getState().markMapDirty();
    showToast(`Tilesets updated (${newTilesets.length} total) — Save Map to persist.`);
  };


  return (
    <div className="space-y-3 text-xs font-mono select-none -m-3 mb-0">
      {/* ── WINDOW SUB-MENU BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Map"
          items={[
            {
              label: 'Save Map Document',
              icon: Save,
              shortcut: 'Ctrl+S',
              onClick: () => {
                if (!isSaving && activeMapData) {
                  window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                }
              },
              disabled: isSaving || !activeMapData,
            },
            {
              label: 'Fit Map in View',
              icon: Maximize2,
              shortcut: 'Home',
              onClick: () => window.dispatchEvent(new CustomEvent('studio_fit_map')),
            },
            {
              label: 'Open Atlas Studio',
              icon: Globe,
              shortcut: 'Ctrl+Shift+M',
              onClick: () => setStudioMode('atlas'),
            },
          ]}
        />
        <WindowMenuDropdown
          label="Layers"
          items={[
            { label: 'Ground Layer (0)', active: activeLayerIdx === 0, onClick: () => setActiveLayerIdx(0) },
            { label: 'Add Tile Layer', icon: Plus, onClick: handleAddLayer },
            { label: 'Add Splat Layer', icon: Brush, onClick: () => handleAddFreeformLayer('paint-splat') },
            { label: 'Add Prop Layer', icon: Layers, onClick: () => handleAddFreeformLayer('free-form') },
            { divider: true, label: '' },
            { label: 'Clear Current Layer', danger: true, onClick: () => handleClearLayer(activeLayerIdx) },
          ]}
        />

        <div className="flex-1" />
        <WindowMenuButton
          label={isSaving ? 'Saving...' : isMapDirty ? 'Save*' : 'Saved'}
          icon={Save}
          active={isMapDirty}
          onClick={() => {
            if (!isSaving && activeMapData) {
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }
          }}
          disabled={isSaving || !activeMapData}
          title="Save active map document"
        />
      </WindowMenuBar>

      <div className="p-3 space-y-3">
      {/* SECTION 1: Active Realm Overview & Atlas Jump */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <div className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold">
          <button
            type="button"
            onClick={() => toggleSection('overview')}
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors cursor-pointer text-left flex-1"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="truncate">Active Realm: {baseMapId || currentMapId}</span>
            {openSections.overview ? (
              <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-70" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setStudioMode('atlas')}
            className="flex items-center gap-1 text-[10px] text-amber-400/90 hover:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-all cursor-pointer shrink-0 ml-2"
            title="Open Atlas Studio (Macro World Layout, Map Library, Realm Creator)"
          >
            <Globe className="w-3 h-3 text-amber-400" />
            <span>Atlas Studio</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {openSections.overview && (
          <div className="p-3 space-y-2.5 border-t border-[#806f47]/20 bg-[#050b14]/50">
            {/* Tile Mode Sheet Slicer (Custom Grid Selection) */}
            <div className="rounded-lg overflow-hidden border border-border/40 bg-black/40">
              <SheetSlicerPanel />
            </div>


            <button
              type="button"
              onClick={() => {
                if (!isSaving && activeMapData) {
                  window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                }
              }}
              disabled={isSaving || !activeMapData}
              className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                isMapDirty
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-950/50 cursor-pointer'
                  : 'bg-[#cbb26a]/20 text-amber-300 border border-amber-500/30 hover:bg-[#cbb26a]/30'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving…' : isMapDirty ? 'Save Changes*' : 'Map Saved'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Atlas and Encounters removed from Tile Mode World Builder */}

      {/* SECTION 3: Active Painting Layer */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> Active Painting Layer
          </span>
          {openSections.layers ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {openSections.layers && (
          <div className="p-3 space-y-2 border-t border-[#806f47]/20 bg-[#050b14]/50">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveLayerIdx(-1);
                  setActiveLayerType('grid');
                  showToast('Switched to Logic Layer — Opened Logic Painter');
                }}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeLayerIdx === -1 && activeLayerType === 'grid'
                    ? 'bg-rose-950/60 border-rose-400 text-rose-200 shadow-md ring-1 ring-rose-400'
                    : 'bg-black/50/40 border-[#806f47]/20 text-slate-400 hover:text-white'
                }`}
                title="Switch to Logic Mode (Collision, Triggers & Rules)"
              >
                <Shield className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-[10px]">Logic (−1)</span>
                <span className="text-[8px] text-slate-400 font-semibold">Grid Collision</span>
              </button>

              {currentMapData.mapType !== 'VOXEL' && (
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  const targetIdx = activeLayerIdx >= 0 ? activeLayerIdx : 0;
                  setActiveLayerIdx(targetIdx);
                  setActiveLayerType('grid');
                  showToast(`Switched to Visual Grid Layer ${targetIdx}`);
                }}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeLayerIdx >= 0 && activeLayerType === 'grid'
                    ? 'bg-purple-950/60 border-purple-400 text-purple-200 shadow-md ring-1 ring-purple-400'
                    : 'bg-black/50/40 border-[#806f47]/20 text-slate-400 hover:text-white'
                }`}
                title="Switch to Visual Grid Mode (Tile Selector)"
              >
                <Grid className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-[10px]">Visual Grid</span>
                <span className="text-[8px] text-slate-400 font-semibold">Tilemap Paint</span>
              </button>
              )}
            </div>

            {/* Brush Controls for Freeform */}
            {activeLayerType !== 'grid' && activeLayerType !== 'polygon' && (
              <div className="pt-2 border-t border-[#806f47]/20/80 space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold text-[10px] flex items-center gap-1"><Brush className="w-3 h-3" /> Brush Size</span>
                  <span className="text-slate-300 font-bold text-[10px]">{brushRadius.toFixed(1)}</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" max="10.0" step="0.5" 
                  value={brushRadius} 
                  onChange={(e) => setBrushRadius(parseFloat(e.target.value))} 
                  className="w-full accent-amber-500 cursor-pointer" 
                />
                
                {activeLayerType === 'free-form' && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer text-slate-300 hover:text-amber-300 text-[10px] bg-black/40 p-1.5 rounded border border-[#806f47]/30">
                    <input 
                      type="checkbox" 
                      checked={snapToGrid} 
                      onChange={(e) => setSnapToGrid(e.target.checked)} 
                      className="accent-amber-500 w-3 h-3 cursor-pointer" 
                    />
                    <Magnet className="w-3 h-3 text-amber-500" />
                    Snap props to Grid
                  </label>
                )}
              </div>
            )}

            {/* Freeform Polygon Controls */}
            {activeLayerType === 'polygon' && (
              <div className="pt-2 border-t border-[#806f47]/20/80 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5 p-1.5 bg-black/40 border border-[#806f47]/30 rounded">
                  <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Click to add vertices. Double-click to close shape.</span>
                </div>
              </div>
            )}

            {/* Visual Grid Layer Selector */}
            {activeLayerType === 'grid' && activeLayerIdx >= 0 && (
              <div className="pt-2 border-t border-[#806f47]/20/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-bold">Layer Stack:</span>
                  <button
                    type="button"
                    onClick={handleAddLayer}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer"
                  >
                    + Add Layer
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(currentMapData.tileLayers || [{ name: 'Ground', grid: [] }]).map(
                    (layer: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          soundSynth?.playUiClick?.();
                          setActiveLayerIdx(idx);
                          setActiveLayerType('grid');
                          showToast(`Active: ${layer.name || `Grid Layer ${idx}`}`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          activeLayerIdx === idx && activeLayerType === 'grid'
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm ring-1 ring-purple-300'
                            : 'bg-black/50/40 text-slate-400 border-[#806f47]/20 hover:text-white'
                        }`}
                      >
                        {layer.name || `Grid Layer ${idx}`}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
            
            {/* Freeform Layer Selector */}
            <div className="pt-2 border-t border-[#806f47]/20/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">Freeform Layers (2.5D):</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAddFreeformLayer('paint-splat')} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer">+ Splat</button>
                  <button type="button" onClick={() => handleAddFreeformLayer('free-form')} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer">+ Prop</button>
                  <button type="button" onClick={() => handleAddFreeformLayer('polygon')} className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer">+ Poly</button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {(currentMapData.freeformLayers || []).map(
                  (layer: any, idx: number) => (
                    <div key={layer.id} className="flex items-center gap-1 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          soundSynth?.playUiClick?.();
                          setActiveLayerIdx(idx);
                          setActiveLayerType(layer.type as any);
                          showToast(`Active Freeform Layer: ${layer.name}`);
                        }}
                        className={`flex-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-left ${
                          activeLayerIdx === idx && activeLayerType === layer.type
                            ? layer.type === 'paint-splat' ? 'bg-amber-600 text-white border-amber-400 shadow-sm ring-1 ring-amber-300' 
                            : layer.type === 'free-form' ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm ring-1 ring-emerald-300'
                            : 'bg-rose-600 text-white border-rose-400 shadow-sm ring-1 ring-rose-300'
                            : 'bg-black/50/40 text-slate-400 border-[#806f47]/20 hover:text-white'
                        }`}
                      >
                        {layer.name} ({layer.type === 'paint-splat' ? 'Splats' : layer.type === 'free-form' ? 'Props' : 'Logic'})
                      </button>
                      <button 
                        onClick={() => handleDeleteFreeformLayer(idx)}
                        className="text-red-400 hover:text-red-300 bg-black/40 hover:bg-red-950 border border-[#806f47]/20 rounded p-1"
                        title="Delete this freeform layer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                )}
                {(!currentMapData.freeformLayers || currentMapData.freeformLayers.length === 0) && (
                  <div className="text-[10px] text-slate-500 italic p-1">No freeform layers yet. Click + to add one.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
};
