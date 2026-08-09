'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { searchMapIndex, registerNewMap } from '../../data/map-index';
import { invalidateMapCache, loadMap, type MapIndexEntry } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';
import { Compass, Plus, Search, Layers, Grid, Save, Shield, Eraser } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { LogicTagPalette } from '../LogicTagPalette';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import {
  buildNewStudioMap,
  formatMapWriteError,
  normalizeStudioMapVisuals,
} from '@/shared/game/studioMapCreate';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';

/** After Next `/api/maps` save: sync Go live world (or TS cache reload). */
function notifyLiveMapSync(
  emit: ((event: string, data: any) => void) | undefined,
  mapId: string,
  payload: {
    name?: string;
    grid?: unknown;
    npcs?: unknown;
    tileLayers?: unknown;
    tilesets?: unknown;
  }
) {
  if (!emit) return;
  if (isGoMmoSocketEnabled()) {
    // Go admin_reload alone does not read Next Prisma — push the doc so walk/collision match paint.
    emit('admin_save_map', {
      mapId,
      name: payload.name || mapId,
      gridData: payload.grid ?? [],
      npcsData: payload.npcs ?? [],
      tileLayersData: payload.tileLayers ?? [],
      tilesetsData: payload.tilesets ?? [],
    });
  } else {
    emit('admin_reload_map', { mapId });
  }
}

export const WorldBuilderPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const emitSocketEvent = useGameStore((state) => state.emitSocketEvent);
  const showToast = useGameStore((state) => state.showToast);
  const activeGameId = useEditorStore((state) => state.activeGameId);

  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [isCreatingNewMap, setIsCreatingNewMap] = useState(false);
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState(24);
  const [newMapHeight, setNewMapHeight] = useState(24);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [remoteMaps, setRemoteMaps] = useState<MapIndexEntry[]>([]);
  
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((state) => state.setActiveLayerIdx);
  const brushTileId = useEditorStore((state) => state.activeBrushTileId);
  const setBrushTileId = useEditorStore((state) => state.setActiveBrushTileId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/maps');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const entries: MapIndexEntry[] = (data.maps || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          category: 'Special' as const,
          recommendedLevel: 1,
          width: 24,
          height: 24,
          npcCount: 0,
          gateCount: 0,
          hasEncounters: false,
        }));
        setRemoteMaps(entries);
      } catch {
        /* ignore — local index still works */
      }
    })();
    return () => { cancelled = true; };
  }, [isCreating, isSaving]);

  // Legacy DEMO_SANDBOX (and similar) may load with tileLayers:[], tilesets:[].
  // Inject defaults in-memory so TilesetPicker + paint overlays work before Save.
  useEffect(() => {
    if (!activeMapData) return;
    const ensured = ensureMapHasStudioTilesets(activeMapData);
    if (ensured === activeMapData) return;
    // Leave activeLayerIdx alone: forcing it to 0 here used to silently drag the
    // creator off Logic (−1) mid-edit, so their next clicks painted GIDs.
    useGameStore.getState().setActiveMapData(ensured);
    // Do NOT force layer away from Logic (−1) — authors may be painting tags.
  }, [activeMapData]);

  const localIndex = searchMapIndex(mapSearchQuery);
  const q = mapSearchQuery.trim().toLowerCase();
  const remoteFiltered = remoteMaps.filter((m) =>
    !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
  const seen = new Set(localIndex.map((m) => m.id));
  const mapIndex = [
    ...localIndex,
    ...remoteFiltered.filter((m) => !seen.has(m.id)),
  ];
  const baseMapId = toBaseMapId(String(currentMapId || ''));
  // UI chrome (layer list / picker) may show an empty shell while loading —
  // Save Map never uses this shell; it requires activeMapData (live edits).
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
      const loaded = ensureMapHasStudioTilesets(await loadMap(targetMapId));
      useGameStore.setState({ currentMapId: targetMapId, activeMapData: loaded });
      setMapSearchQuery('');
      showToast(`Warped to map: ${targetMapId}`);
    } catch {
      useGameStore.setState({ currentMapId: targetMapId });
      setMapSearchQuery('');
      showToast(`Warped to map: ${targetMapId} (loading…)`);
    }
  };

  const handleSaveMap = async () => {
    if (!baseMapId) {
      showToast('No map loaded to save.');
      return;
    }
    // Never persist GAME_MAPS / empty shell — only the live Studio document.
    const live = useGameStore.getState().activeMapData;
    if (!live?.grid) {
      showToast('Map data not loaded yet — wait for the world to appear, then Save.');
      return;
    }
    const saveDoc = normalizeStudioMapVisuals(ensureMapHasStudioTilesets(live));
    // Keep store aligned with what we persist (repaired Ground/tilesets).
    if (saveDoc !== live) {
      useGameStore.getState().setActiveMapData(saveDoc);
    }
    setIsSaving(true);
    try {
      // Bible 17: never persist Studio-only overlay keys into runtime map JSON.
      const payload = stripEditorOverlaysFromMapPayload({
        name: saveDoc.name || baseMapId,
        gameId: saveDoc.gameId,
        grid: saveDoc.grid,
        gates: saveDoc.gates || {},
        npcs: saveDoc.npcs || [],
        encounterPool: saveDoc.encounterPool || [],
        tileLayers: saveDoc.tileLayers || [],
        tilesets: saveDoc.tilesets || [],
      });
      const res = await fetch(`/api/maps/${encodeURIComponent(baseMapId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(formatMapWriteError(res.status, err));
        return;
      }
      invalidateMapCache(baseMapId);
      notifyLiveMapSync(emitSocketEvent, baseMapId, payload);
      useEditorStore.getState().clearMapDirty();
      showToast(`Saved map ${baseMapId}`);
    } catch (e: any) {
      console.error('[Studio] Save map failed', e);
      showToast(e?.message || 'Save failed — network error.');
    } finally {
      setIsSaving(false);
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
      notifyLiveMapSync(emitSocketEvent, newMapData.id, {
        name: newMapData.name,
        grid: newMapData.grid,
        npcs: newMapData.npcs,
        tileLayers: newMapData.tileLayers,
        tilesets: newMapData.tilesets,
      });
      setIsCreatingNewMap(false);
      setNewMapSlug('');
      setNewMapName('');
      showToast(`Created & saved map: ${newMapData.id}`);
    } catch (e: any) {
      console.error('[Studio] Create map failed', e);
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
    showToast(`Added ${layers[nextIdx].name} — Save Map to persist.`);
  };

  const handleBrushSelect = (tileId: number) => {
    setBrushTileId(tileId);
  };

  return (
    <div className="space-y-4 text-xs font-mono">
      <div className="rounded border border-[#806f47]/35 bg-[#0b1320]/70 p-2.5 text-[10px] leading-relaxed text-slate-400">
        <p className="font-bold uppercase tracking-wider text-[#cbb26a]">World Builder</p>
        <p className="mt-1">
          Pick a map → choose <span className="text-[#e2d5b3]">Logic</span> or a visual layer → select a brush →{' '}
          <span className="text-[#e2d5b3]">click or drag</span> on the ground →{' '}
          <span className="text-[#e2d5b3]">Save Map</span>. Use Play to playtest.
        </p>
      </div>

      {/* MAP SELECTOR */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center justify-between text-[#cbb26a]">
          <span className="flex items-center gap-1.5 font-bold"><Compass className="w-3.5 h-3.5" /> World:</span>
          <span className="text-white px-2 py-0.5 rounded border border-[#806f47]/30 bg-[#050b14]">{baseMapId || currentMapId}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveMap()}
          disabled={isSaving || !activeMapData}
          className="w-full py-1.5 bg-[#cbb26a]/90 hover:bg-[#cbb26a] disabled:opacity-50 text-[#0a0a0f] rounded font-bold flex items-center justify-center gap-1.5"
          title={!activeMapData ? 'Wait for the map to load' : 'Persist grid, layers, and tilesets'}
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
        <div className="max-h-32 overflow-y-auto bg-[#050b14] border border-slate-700 rounded divide-y divide-slate-800 custom-scrollbar mt-2">
          {mapIndex.length === 0 ? (
            <div className="p-2 text-xs text-slate-500 text-center">No maps found</div>
          ) : (
            mapIndex.map((m) => (
              <div
                key={m.id}
                onClick={() => void handleWarpToMap(m.id)}
                className="px-2 py-1 hover:bg-white/10 cursor-pointer flex justify-between items-center"
              >
                <span>{m.name}</span>
                <span className="text-[9px] text-[#cbb26a]">{"category" in m && m.category ? String(m.category) : (m.id || "")}</span>
              </div>
            ))
          )}
        </div>

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
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400">W</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={newMapWidth}
                  onChange={(e) => setNewMapWidth(parseInt(e.target.value, 10) || 24)}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400">H</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={newMapHeight}
                  onChange={(e) => setNewMapHeight(parseInt(e.target.value, 10) || 24)}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
                />
              </div>
            </div>
            <button
              onClick={() => void handleCreateNewMapSubmit()}
              disabled={isCreating}
              className="w-full py-1 bg-green-600/80 hover:bg-green-500 disabled:opacity-50 text-white rounded font-bold"
            >
              {isCreating ? 'Creating…' : 'Generate'}
            </button>
          </div>
        )}
      </div>

      {/* LAYER SELECTOR */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Layers className="w-3.5 h-3.5" /> What are you painting?
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="text-rose-200">Logic</span> = collision & gameplay tags (colored overlay).{' '}
          <span className="text-[#e2d5b3]">Ground / layers</span> = visible tileset art.
        </p>
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

      {/* TILESET / LOGIC TAG PICKER */}
      <div className="bg-[#0b1320]/60 border border-[#806f47]/30 rounded p-2 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#cbb26a] border-b border-[#806f47]/30 pb-1">
          <Grid className="w-3.5 h-3.5" />
          {activeLayerIdx === -1 ? 'Logic Tags' : 'Asset Picker'}
        </div>
        {activeLayerIdx >= 0 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setBrushTileId(0)}
              className={`flex-1 py-1 rounded border flex items-center justify-center gap-1 ${
                brushTileId === 0
                  ? 'bg-rose-900/50 border-rose-400 text-rose-100'
                  : 'border-slate-700 text-slate-400 hover:bg-white/5'
              }`}
              title="Erase visual tile (GID 0)"
            >
              <Eraser className="w-3 h-3" /> Erase
            </button>
            <button
              type="button"
              onClick={() => setBrushTileId(DEFAULT_STUDIO_GROUND_GID)}
              className={`flex-1 py-1 rounded border text-[10px] ${
                brushTileId === DEFAULT_STUDIO_GROUND_GID
                  ? 'bg-[#806f47]/40 border-[#cbb26a] text-[#e2d5b3]'
                  : 'border-slate-700 text-slate-400 hover:bg-white/5'
              }`}
              title="Solid grass GID 17"
            >
              Grass ({DEFAULT_STUDIO_GROUND_GID})
            </button>
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
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
            />
          )}
        </div>
      </div>
    </div>
  );
};
