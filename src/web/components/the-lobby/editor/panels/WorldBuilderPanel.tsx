'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { searchMapIndex, registerNewMap, unregisterMap, type MapIndexEntry } from '../../data/map-index';
import { invalidateMapCache, loadMap } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';
import {
  Compass, Plus, Search, Layers, Grid, Save, Shield, Eraser, DoorOpen,
  MapPin, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  Circle, Globe, Maximize2
} from 'lucide-react';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { LogicTagPalette } from '../LogicTagPalette';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { normalizeGates, removeWarpGateAt, upsertWarpGate } from '@/shared/game/logicComponents';
import {
  buildNewStudioMap,
  formatMapWriteError,
  normalizeStudioMapVisuals,
  resizeStudioMap
} from '@/shared/game/studioMapCreate';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';
import { useSession } from 'next-auth/react';
import { canWriteStudioContent } from '@/shared/game/studioPermissions';

export const WorldBuilderPanel: React.FC = () => {
  const { data: session } = useSession();
  const userPermission = session?.user?.permissionLevel ?? 0;
  const canEdit = canWriteStudioContent(userPermission);

  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const showToast = useGameStore((state) => state.showToast);
  const activeGameId = useEditorStore((state) => state.activeGameId);
  const isSaving = useEditorStore((state) => state.isSavingMap);

  // Accordion section collapse state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    maps: true,
    layers: true,
    palette: true,
    gates: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(mapSearchQuery), 200);
    return () => clearTimeout(t);
  }, [mapSearchQuery]);

  const [isCreatingNewMap, setIsCreatingNewMap] = useState(false);
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState(64);
  const [newMapHeight, setNewMapHeight] = useState(64);
  const [isCreating, setIsCreating] = useState(false);
  const [remoteMaps, setRemoteMaps] = useState<MapIndexEntry[]>([]);
  
  // Delete map confirmation modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isResizingMap, setIsResizingMap] = useState(false);
  const [resizeW, setResizeW] = useState(64);
  const [resizeH, setResizeH] = useState(64);
  
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((state) => state.setActiveLayerIdx);
  const brushTileId = useEditorStore((state) => state.activeBrushTileId);
  const activeLogicTileId = useEditorStore((state) => state.activeLogicTileId);
  const isMapDirty = useEditorStore((state) => state.mapDirty);
  const isDevEditorOpen = useEditorStore((state) => state.isCreationMode);
  const setBrushTileId = useEditorStore((state) => state.setActiveBrushTileId);

  const fetchRemoteMaps = async () => {
    try {
      const res = await fetch('/api/maps');
      if (!res.ok) return;
      const data = await res.json();
      const entries: MapIndexEntry[] = (data.maps || []).map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        category: 'Special' as const,
        recommendedLevel: 1,
        width: m.width || 24,
        height: m.height || 24,
        npcCount: m.npcCount || 0,
        gateCount: m.gateCount || 0,
        hasEncounters: false,
      }));
      setRemoteMaps(entries);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void fetchRemoteMaps();
  }, [isCreating, isSaving]);

  // Legacy DEMO_SANDBOX tileset bootstrap
  useEffect(() => {
    if (!activeMapData) return;
    const ensured = ensureMapHasStudioTilesets(activeMapData);
    if (ensured === activeMapData) return;
    useGameStore.getState().setActiveMapData(ensured);
  }, [activeMapData]);

  const localIndex = searchMapIndex(debouncedSearch);
  const q = debouncedSearch.trim().toLowerCase();
  const remoteFiltered = remoteMaps.filter((m) =>
    !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
  const seen = new Set(localIndex.map((m) => m.id));
  const mapIndex = [
    ...localIndex,
    ...remoteFiltered.filter((m) => !seen.has(m.id)),
  ];
  const baseMapId = toBaseMapId(String(currentMapId || ''));
  const currentMapData = ensureMapHasStudioTilesets(
    activeMapData || {
      id: baseMapId,
      name: baseMapId,
      grid: Array(24).fill(0).map(() => Array(24).fill(0)),
      gates: {},
      tileLayers: [],
      tilesets: [],
    }
  );

  const handleWarpToMap = async (targetMapId: string) => {
    try {
      soundSynth?.playActionSound?.();
      const loaded = ensureMapHasStudioTilesets(await loadMap(targetMapId));
      const mw = loaded.grid?.[0]?.length || loaded.width || 24;
      const mh = loaded.grid?.length || loaded.height || 24;
      const cx = Math.max(1, Math.min(mw - 2, Math.floor(mw / 2)));
      const cy = Math.max(1, Math.min(mh - 2, Math.floor(mh / 2)));
      useGameStore.setState({ currentMapId: targetMapId, activeMapData: loaded });
      useGameStore.getState().setPlayerPosition({ x: cx, y: cy }, 'down', false);
      setMapSearchQuery('');
      showToast(`Warped to map: ${targetMapId}`);
    } catch {
      useGameStore.setState({ currentMapId: targetMapId });
      setMapSearchQuery('');
      showToast(`Warped to map: ${targetMapId} (loading…)`);
    }
  };



  const handleDeleteMap = async (mapId: string) => {
    if (!canEdit) {
      showToast('Admin permission required to delete maps.');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(mapId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to delete map');
        return;
      }
      unregisterMap(mapId);
      setDeleteTargetId(null);
      showToast(`Deleted map: ${mapId}`);
      void fetchRemoteMaps();
    } catch (e: any) {
      showToast(e?.message || 'Error deleting map');
    } finally {
      setIsDeleting(false);
    }
  };



  const handleCreateNewMapSubmit = async () => {
    const built = buildNewStudioMap({
      slug: newMapSlug,
      name: newMapName,
      gameId: activeGameId,
      width: newMapWidth,
      height: newMapHeight,
    });
    if (!built.ok) {
      showToast(built.error);
      return;
    }
    const newMapData = built.map;

    setIsCreating(true);
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(newMapData.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMapData.name,
          gameId: newMapData.gameId,
          grid: newMapData.grid,
          gates: newMapData.gates,
          npcs: newMapData.npcs,
          encounterPool: newMapData.encounterPool,
          tileLayers: newMapData.tileLayers,
          tilesets: newMapData.tilesets,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(formatMapWriteError(res.status, err));
        return;
      }

      invalidateMapCache(newMapData.id);
      registerNewMap(newMapData);
      useGameStore.setState({ currentMapId: newMapData.id, activeMapData: newMapData });
      useEditorStore.getState().clearMapDirty();

      setIsCreatingNewMap(false);
      setNewMapSlug('');
      setNewMapName('');
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';
      showToast(`Created & saved map: ${newMapData.id} (Synced to ${backendUsed})`);
    } catch (e: any) {
      showToast(e?.message || 'Create failed — network error.');
    } finally {
      setIsCreating(false);
    }
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

  const handleResizeMapSubmit = () => {
    if (!activeMapData) return;
    const currentW = activeMapData.grid?.[0]?.length || 0;
    const currentH = activeMapData.grid?.length || 0;
    if (resizeW < currentW || resizeH < currentH) {
      if (!confirm('Cropping the map will delete tiles outside the new bounds. Proceed?')) {
        return;
      }
    }
    const newMap = resizeStudioMap(activeMapData, resizeW, resizeH);
    useGameStore.getState().setActiveMapData(newMap);
    useEditorStore.getState().markMapDirty();
    setIsResizingMap(false);
    showToast(`Map resized to ${resizeW}x${resizeH} — Save Map to persist.`);
  };

  const handleBrushSelect = (tileId: number) => {
    setBrushTileId(tileId);
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
    <div className="space-y-3 text-xs font-mono select-none">
      
      {/* SECTION 1: Active Realm Overview */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-2.5 bg-black/40 text-[#cbb26a] font-bold text-left hover:bg-black/60 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" /> Active Realm: {baseMapId || currentMapId}
          </span>
          {openSections.overview ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {openSections.overview && (
          <div className="p-3 space-y-2.5 border-t border-[#806f47]/20 bg-[#050b14]/50">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Dimensions:</span>
              <span className="text-white font-bold bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                {currentMapData.grid?.[0]?.length || 24} × {currentMapData.grid?.length || 24} tiles
              </span>
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

            {/* Resize Button */}
            <button
              type="button"
              onClick={() => {
                setIsResizingMap(!isResizingMap);
                if (!isResizingMap && activeMapData?.grid) {
                  setResizeW(activeMapData.grid[0]?.length || 64);
                  setResizeH(activeMapData.grid.length || 64);
                }
              }}
              disabled={!activeMapData}
              className="w-full py-1.5 border border-dashed border-sky-500/40 hover:bg-sky-500/20 text-sky-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5 text-sky-400" />
              <span>{isResizingMap ? 'Close Resize' : 'Resize Map Dimensions'}</span>
            </button>

            {/* Set as Primary Lobby Button */}
            <button
              type="button"
              onClick={async () => {
                const mapId = baseMapId || currentMapId;
                if (!mapId) return;
                try {
                  const res = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'DEFAULT_MAP_ID', value: mapId }),
                  });
                  if (res.ok) {
                    showToast(`Set ${mapId} as Primary World Lobby!`);
                  } else {
                    showToast(`Saved lobby preference for ${mapId}`);
                  }
                } catch {
                  showToast(`Network error setting lobby.`);
                }
              }}
              disabled={!activeMapData}
              className="w-full py-1.5 border border-dashed border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Set as Primary Lobby</span>
            </button>

            {isResizingMap && (
              <div className="p-3 bg-[#050b14] border border-sky-500/40 rounded-xl space-y-2 shadow-inner">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">New W</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={resizeW}
                      onChange={(e) => setResizeW(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">New H</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={resizeH}
                      onChange={(e) => setResizeH(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResizeMapSubmit}
                  className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Apply Resize
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Map Explorer & Quick Switch */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('maps')}
          className="w-full flex items-center justify-between p-2.5 bg-black/40 text-[#cbb26a] font-bold text-left hover:bg-black/60 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-sky-400" /> Realms & Maps ({mapIndex.length})
          </span>
          {openSections.maps ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {openSections.maps && (
          <div className="p-3 space-y-2 border-t border-[#806f47]/20 bg-[#050b14]/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                placeholder="Search map by name/ID..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#050b14] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="max-h-40 overflow-y-auto bg-[#050b14] border border-slate-800 rounded-xl divide-y divide-slate-800/80 custom-scrollbar">
              {mapIndex.length === 0 ? (
                <div className="p-3 text-slate-500 text-center">No maps found</div>
              ) : (
                mapIndex.map((m) => {
                  const isCurrent = m.id === baseMapId;
                  return (
                    <div
                      key={m.id}
                      className={`group px-2.5 py-1.5 flex items-center justify-between transition-colors ${
                        isCurrent ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => void handleWarpToMap(m.id)}
                        className="flex-1 cursor-pointer truncate"
                      >
                        <span className="font-bold">{m.name || m.id}</span>
                        <span className="text-[9px] text-slate-500 ml-1.5 font-mono">({m.id})</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canEdit && m.id !== 'DEMO_SANDBOX' && m.id !== 'LOBBY' && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                            title="Delete map"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/60 border border-slate-800 text-slate-400">
                          {m.category || 'Map'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsCreatingNewMap(!isCreatingNewMap)}
                className="w-full py-1.5 border border-dashed border-[#806f47]/50 hover:bg-[#806f47]/20 text-amber-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingNewMap ? 'Cancel' : 'Create New Map'}</span>
              </button>
            )}

            {isCreatingNewMap && (
              <div className="p-3 bg-[#050b14] border border-[#806f47]/40 rounded-xl space-y-2 mt-2 shadow-inner">
                <input
                  type="text"
                  value={newMapSlug}
                  onChange={(e) => setNewMapSlug(e.target.value.toUpperCase())}
                  placeholder="MAP_SLUG (e.g. MOUNTAIN_PASS)"
                  className="w-full bg-[#0b1320] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="Display Name (e.g. Mountain Pass)"
                  className="w-full bg-[#0b1320] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400">W</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={newMapWidth}
                      onChange={(e) => setNewMapWidth(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400">H</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={newMapHeight}
                      onChange={(e) => setNewMapHeight(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateNewMapSubmit()}
                  disabled={isCreating || !newMapSlug.trim()}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors cursor-pointer"
                >
                  {isCreating ? 'Creating…' : 'Generate Map'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: Visual Tile Layers */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-2.5 bg-black/40 text-[#cbb26a] font-bold text-left hover:bg-black/60 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" /> Active Painting Layer
          </span>
          {openSections.layers ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                    : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
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
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                    : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-[10px]">Visual Layers</span>
                <span className="text-[8px] text-slate-500">Tilesets & Art</span>
              </button>
            </div>

            {activeLayerIdx >= 0 && (
              <div className="flex gap-1 overflow-x-auto custom-scrollbar pt-1">
                {currentMapData.tileLayers?.map((layer: { name?: string }, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveLayerIdx(idx)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold min-w-max transition-all cursor-pointer ${
                      activeLayerIdx === idx
                        ? 'bg-[#806f47]/40 border-[#cbb26a] text-white'
                        : 'border-slate-800 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {layer.name} ({idx})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAddLayer}
                  className="px-2 py-1 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                  title="Add new visual layer"
                >
                  + Add Layer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 4: Palette (Tileset Picker or Logic Tag Palette) */}
      <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
        <button
          type="button"
          onClick={() => toggleSection('palette')}
          className="w-full flex items-center justify-between p-2.5 bg-black/40 text-[#cbb26a] font-bold text-left hover:bg-black/60 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-emerald-400" />
            {activeLayerIdx === -1 ? 'Logic Tag Palette' : 'Tileset & Brush Picker'}
          </span>
          {openSections.palette ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
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
                activeLayerIdx={activeLayerIdx}
                onLayerChange={setActiveLayerIdx}
                tileLayers={currentMapData.tileLayers || []}
                onAddLayer={handleAddLayer}
                onUpdateTilesets={handleUpdateTilesets}
              />
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/50 bg-[#050b14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Delete Map &ldquo;{deleteTargetId}&rdquo;?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will permanently delete the map record from the database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteMap(deleteTargetId)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
