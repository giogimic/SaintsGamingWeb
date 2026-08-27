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
} from 'lucide-react';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { LogicTagPalette } from '../LogicTagPalette';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { getAdjacentAtlasNeighbors, type NeighborNodes } from '@/shared/game/atlas/spatialAtlas';
import { getEdgeStrip } from '@/shared/game/atlas/edgeStrip';
import { loadMap } from '../../data/maps';
import { soundSynth } from '@/engine/sound-synth';

export const WorldBuilderPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const showToast = useGameStore((state) => state.showToast);
  const isSaving = useEditorStore((state) => state.isSavingMap);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);

  // Accordion section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    neighbors: true,
    layers: true,
    palette: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((state) => state.setActiveLayerIdx);
  const brushTileId = useEditorStore((state) => state.activeBrushTileId);
  const isMapDirty = useEditorStore((state) => state.mapDirty);
  const setBrushTileId = useEditorStore((state) => state.setActiveBrushTileId);
  const setBrushPattern = useEditorStore((state) => state.setActiveBrushPattern);

  const [neighbors, setNeighbors] = useState<NeighborNodes>({});
  const [neighborBleedPreview, setNeighborBleedPreview] = useState(false);

  // Legacy DEMO_SANDBOX tileset bootstrap
  useEffect(() => {
    if (!activeMapData) return;
    const ensured = ensureMapHasStudioTilesets(activeMapData);
    if (ensured === activeMapData) return;
    useGameStore.getState().setActiveMapData(ensured);
  }, [activeMapData]);

  const baseMapId = toBaseMapId(String(currentMapId || ''));
  const currentMapData = ensureMapHasStudioTilesets(
    activeMapData || {
      id: baseMapId,
      name: baseMapId,
      grid: Array(24).fill(0).map(() => Array(24).fill(0)),
      gates: {},
      tileLayers: [],
      tilesets: [],
      baseTileSizePx: 32,
    }
  );

  const handleUpdateBaseTileSize = (val: number) => {
    if (!activeMapData) return;
    const updated = { ...activeMapData, baseTileSizePx: val };
    useGameStore.getState().setActiveMapData(updated);
    useEditorStore.getState().markMapDirty();
  };

  // Fetch adjacent Atlas neighbors and load their edge strips for seamless bleed
  const refreshNeighbors = useCallback(async () => {
    if (!baseMapId) return;
    try {
      const res = await fetch('/api/world/atlas');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.atlasData?.nodes) return;

      const adj = getAdjacentAtlasNeighbors(data.atlasData, baseMapId);
      setNeighbors(adj);

      // Load neighbor edge strips into BabylonEngine
      const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
      if (!engine) return;

      const strips: any = {};
      for (const [dir, node] of Object.entries(adj) as [keyof NeighborNodes, any][]) {
        if (!node?.mapId) continue;
        try {
          const nData = await loadMap(node.mapId);
          if (nData) {
            strips[dir] = getEdgeStrip(nData, dir as any, 6);
          }
        } catch {
          // Skip unloadable neighbor
        }
      }
      engine.setNeighborEdgeStrips(strips);
    } catch {
      // Atlas fetch failed or offline
    }
  }, [baseMapId]);

  useEffect(() => {
    void refreshNeighbors();
  }, [refreshNeighbors]);

  const handleWarpAndEditNeighbor = async (targetMapId: string) => {
    soundSynth?.playActionSound?.();
    try {
      const loaded = ensureMapHasStudioTilesets(await loadMap(targetMapId));
      useGameStore.setState({ currentMapId: targetMapId, activeMapData: loaded });
      const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
      if (engine) {
        engine.loadTilemap(loaded);
        engine.fitMapInView();
      }
      showToast(`Loaded ${targetMapId} for editing.`);
    } catch {
      useGameStore.setState({ currentMapId: targetMapId });
      showToast(`Loading ${targetMapId}…`);
    }
  };

  const handleToggleNeighborBleed = () => {
    soundSynth?.playUiClick?.();
    const nextState = !neighborBleedPreview;
    setNeighborBleedPreview(nextState);
    const engine = (typeof window !== 'undefined' && (window as any).__babylonEngine) || null;
    if (engine) {
      engine.setShowNeighborBleedPreview(nextState);
      engine.loadTilemap(currentMapData);
    }
    showToast(nextState ? 'Neighbor Edge Bleed Preview: ON' : 'Neighbor Edge Bleed Preview: OFF');
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

  const hasAnyNeighbor = Boolean(neighbors.north || neighbors.south || neighbors.east || neighbors.west);

  return (
    <div className="space-y-3 text-xs font-mono select-none">
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
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Dimensions:</span>
              <span className="text-white font-bold bg-black/50/20 px-2 py-0.5 rounded border border-[#806f47]/20">
                {currentMapData.grid?.[0]?.length || 24} × {currentMapData.grid?.length || 24} tiles
              </span>
            </div>

            {/* Neighbor Bleed Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-[#806f47]/20/60">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Edge Look-Ahead:</span>
              </span>
              <button
                type="button"
                onClick={handleToggleNeighborBleed}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  neighborBleedPreview
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                    : 'bg-black/50/40 text-slate-400 border-[#806f47]/20 hover:text-white'
                }`}
                title="Toggle visual look-ahead bleed of connected atlas neighbor maps"
              >
                {neighborBleedPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{neighborBleedPreview ? 'Bleed ON' : 'Bleed OFF'}</span>
              </button>
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
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-lg shadow-amber-950/50 cursor-pointer'
                  : 'bg-[#cbb26a]/20 text-amber-300 border border-amber-500/30 hover:bg-[#cbb26a]/30'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving…' : isMapDirty ? 'Save Changes*' : 'Map Saved'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: Connected Atlas Neighbors (Fast Switch / Multi-Map Editing) */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('neighbors')}
          className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-cyan-400" /> Connected Realms (Atlas)
          </span>
          {openSections.neighbors ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {openSections.neighbors && (
          <div className="p-3 space-y-2 border-t border-[#806f47]/20 bg-[#050b14]/50">
            {hasAnyNeighbor ? (
              <div className="grid grid-cols-2 gap-2">
                {neighbors.north && (
                  <button
                    type="button"
                    onClick={() => handleWarpAndEditNeighbor(neighbors.north!.mapId)}
                    className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 flex flex-col items-start transition-all cursor-pointer"
                    title={`Switch editor to North neighbor: ${neighbors.north.mapId}`}
                  >
                    <span className="text-[9px] text-cyan-400/70 font-bold uppercase">↑ North</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {neighbors.north.mapId}
                    </span>
                  </button>
                )}
                {neighbors.south && (
                  <button
                    type="button"
                    onClick={() => handleWarpAndEditNeighbor(neighbors.south!.mapId)}
                    className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 flex flex-col items-start transition-all cursor-pointer"
                    title={`Switch editor to South neighbor: ${neighbors.south.mapId}`}
                  >
                    <span className="text-[9px] text-cyan-400/70 font-bold uppercase">↓ South</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {neighbors.south.mapId}
                    </span>
                  </button>
                )}
                {neighbors.west && (
                  <button
                    type="button"
                    onClick={() => handleWarpAndEditNeighbor(neighbors.west!.mapId)}
                    className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 flex flex-col items-start transition-all cursor-pointer"
                    title={`Switch editor to West neighbor: ${neighbors.west.mapId}`}
                  >
                    <span className="text-[9px] text-cyan-400/70 font-bold uppercase">← West</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {neighbors.west.mapId}
                    </span>
                  </button>
                )}
                {neighbors.east && (
                  <button
                    type="button"
                    onClick={() => handleWarpAndEditNeighbor(neighbors.east!.mapId)}
                    className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 flex flex-col items-start transition-all cursor-pointer"
                    title={`Switch editor to East neighbor: ${neighbors.east.mapId}`}
                  >
                    <span className="text-[9px] text-cyan-400/70 font-bold uppercase">→ East</span>
                    <span className="text-[10px] font-bold text-white truncate max-w-full">
                      {neighbors.east.mapId}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-[10px] text-slate-500">
                No adjacent realms connected in Atlas.{' '}
                <button
                  type="button"
                  onClick={() => setStudioMode('atlas')}
                  className="text-amber-400 underline hover:text-amber-300 cursor-pointer"
                >
                  Position on Atlas
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
                onClick={() => setActiveLayerIdx(-1)}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeLayerIdx === -1
                    ? 'bg-rose-950/60 border-rose-400 text-rose-200 shadow-md'
                    : 'bg-black/50/40 border-[#806f47]/20 text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-[10px]">Logic (−1)</span>
                <span className="text-[8px] text-slate-500">Collision & Gates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLayerIdx(0)}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  activeLayerIdx >= 0
                    ? 'bg-purple-950/60 border-purple-400 text-purple-200 shadow-md'
                    : 'bg-black/50/40 border-[#806f47]/20 text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-[10px]">Visual Layer</span>
                <span className="text-[8px] text-slate-500">
                  {activeLayerIdx >= 0 ? `Layer ${activeLayerIdx}` : 'Select Layer'}
                </span>
              </button>
            </div>

            {/* Visual Layer Selector */}
            {activeLayerIdx >= 0 && (
              <div className="pt-2 border-t border-[#806f47]/20/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Layer Stack:</span>
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
                        onClick={() => setActiveLayerIdx(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          activeLayerIdx === idx
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                            : 'bg-black/50/40 text-slate-400 border-[#806f47]/20 hover:text-white'
                        }`}
                      >
                        {layer.name || `Layer ${idx}`}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: Paint Palette */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('palette')}
          className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-amber-400" />
            {activeLayerIdx === -1 ? 'Logic Tag Palette' : 'Tileset Brush Palette'}
          </span>
          {openSections.palette ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {openSections.palette && (
          <div className="p-3 border-t border-[#806f47]/20 bg-[#050b14]/50">
            {activeLayerIdx === -1 ? (
              <LogicTagPalette />
            ) : (
              <TilesetPicker
                tilesets={currentMapData.tilesets || []}
                activeBrushTileId={brushTileId}
                onBrushSelect={handleBrushSelect}
                onBrushSelectPattern={handleBrushSelectPattern}
                activeLayerIdx={activeLayerIdx}
                onLayerChange={(idx) => setActiveLayerIdx(idx)}
                tileLayers={currentMapData.tileLayers || []}
                onAddLayer={handleAddLayer}
                onDeleteLayer={handleDeleteLayer}
                onClearLayer={handleClearLayer}
                onFillLayer={handleFillLayer}
                onSetDefaultGroundGid={handleSetDefaultGroundGid}
                onUpdateTilesets={handleUpdateTilesets}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
