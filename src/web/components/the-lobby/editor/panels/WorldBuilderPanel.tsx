'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { searchMapIndex, registerNewMap } from '../../data/map-index';
import { invalidateMapCache, loadMap, type MapIndexEntry } from '../../data/maps';
import { toBaseMapId } from '@/shared/net/mapIds';
import { Compass, Plus, Search, Layers, Grid, Save, Shield, Eraser, DoorOpen, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { LogicTagPalette } from '../LogicTagPalette';
import { CheckCircle2, Circle } from 'lucide-react';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_GROUND_GID } from '@/shared/game/studioTilesetBootstrap';
import { stripEditorOverlaysFromMapPayload } from '@/shared/game/mapLayers';
import { normalizeGatesToArray } from '@/shared/game/mapGates';
import { normalizeGates, removeWarpGateAt, upsertWarpGate } from '@/shared/game/logicComponents';
import {
  buildNewStudioMap,
  formatMapWriteError,
  normalizeStudioMapVisuals,
  resizeStudioMap
} from '@/shared/game/studioMapCreate';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';


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
  const [newMapWidth, setNewMapWidth] = useState(64);
  const [newMapHeight, setNewMapHeight] = useState(64);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [remoteMaps, setRemoteMaps] = useState<MapIndexEntry[]>([]);
  
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
      useEditorStore.getState().clearMapDirty();
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';
      showToast(`Saved map ${baseMapId} (Synced to ${backendUsed})`);
    } catch (e: any) {
      console.error('[Studio] Save map failed', e);
      showToast(e?.message || 'Save failed — network error.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const onTriggerSave = () => {
      void handleSaveMap();
    };
    window.addEventListener(STUDIO_TRIGGER_SAVE_MAP_EVENT, onTriggerSave);
    return () => window.removeEventListener(STUDIO_TRIGGER_SAVE_MAP_EVENT, onTriggerSave);
  }, [baseMapId]);

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
                  onChange={(e) => setNewMapWidth(parseInt(e.target.value, 10) || 64)}
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
                  onChange={(e) => setNewMapHeight(parseInt(e.target.value, 10) || 64)}
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

        {/* RESIZE UI */}
        <button
          onClick={() => {
            setIsResizingMap(!isResizingMap);
            if (!isResizingMap && activeMapData?.grid) {
              setResizeW(activeMapData.grid[0]?.length || 64);
              setResizeH(activeMapData.grid.length || 64);
            }
          }}
          disabled={!activeMapData}
          className="w-full py-1 border border-dashed border-sky-500/30 hover:bg-sky-500/20 text-slate-300 disabled:opacity-50 rounded flex items-center justify-center gap-1 mt-2"
        >
          <Grid className="w-3 h-3" /> Resize Map
        </button>

        {isResizingMap && (
          <div className="p-2 bg-[#050b14] border border-sky-500/30 rounded space-y-2 mt-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400">New W</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={resizeW}
                  onChange={(e) => setResizeW(parseInt(e.target.value, 10) || 64)}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400">New H</label>
                <input
                  type="number"
                  min={8}
                  max={128}
                  value={resizeH}
                  onChange={(e) => setResizeH(parseInt(e.target.value, 10) || 64)}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1"
                />
              </div>
            </div>
            <button
              onClick={handleResizeMapSubmit}
              className="w-full py-1 bg-sky-600/80 hover:bg-sky-500 text-white rounded font-bold"
            >
              Apply Resize
            </button>
          </div>
        )}

        {/* CONNECTIONS & WARP GATES UI */}
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between border-b border-[#806f47]/30 pb-1">
            <div className="flex items-center gap-1.5 font-bold text-[#cbb26a]">
              <Compass className="w-3.5 h-3.5" /> Edge Connections & Warp Gates
            </div>
            <button
              type="button"
              onClick={() => {
                useEditorStore.getState().setBrushMode('gate');
                useEditorStore.getState().setShowWarpOverlays(true);
                showToast('Warp Gate tool active: Click any tile on the map to place a gate.');
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/50 text-[10px] text-purple-200 hover:bg-purple-900/80 font-bold transition-all"
            >
              <DoorOpen className="w-3 h-3 text-purple-400" /> Gate Tool
            </button>
          </div>

          {/* 4 Cardinal Edge Connections */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">Continuous Edge Transitions</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] text-slate-400">North Edge (y &lt; 0)</label>
                <input
                  type="text"
                  placeholder="e.g. ROUTE_1"
                  value={activeMapData?.connections?.north || ''}
                  onChange={(e) => {
                    if (activeMapData) {
                      useGameStore.setState({
                        activeMapData: {
                          ...activeMapData,
                          connections: { ...activeMapData.connections, north: e.target.value || undefined }
                        }
                      });
                      useEditorStore.setState({ mapDirty: true });
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1 text-xs text-cyan-100"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400">South Edge (y &gt;= H)</label>
                <input
                  type="text"
                  placeholder="e.g. SAINTS_TOWN"
                  value={activeMapData?.connections?.south || ''}
                  onChange={(e) => {
                    if (activeMapData) {
                      useGameStore.setState({
                        activeMapData: {
                          ...activeMapData,
                          connections: { ...activeMapData.connections, south: e.target.value || undefined }
                        }
                      });
                      useEditorStore.setState({ mapDirty: true });
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1 text-xs text-cyan-100"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400">East Edge (x &gt;= W)</label>
                <input
                  type="text"
                  placeholder="e.g. CAVE_ENTRANCE"
                  value={activeMapData?.connections?.east || ''}
                  onChange={(e) => {
                    if (activeMapData) {
                      useGameStore.setState({
                        activeMapData: {
                          ...activeMapData,
                          connections: { ...activeMapData.connections, east: e.target.value || undefined }
                        }
                      });
                      useEditorStore.setState({ mapDirty: true });
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1 text-xs text-cyan-100"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400">West Edge (x &lt; 0)</label>
                <input
                  type="text"
                  placeholder="e.g. PROFESSOR_LAB"
                  value={activeMapData?.connections?.west || ''}
                  onChange={(e) => {
                    if (activeMapData) {
                      useGameStore.setState({
                        activeMapData: {
                          ...activeMapData,
                          connections: { ...activeMapData.connections, west: e.target.value || undefined }
                        }
                      });
                      useEditorStore.setState({ mapDirty: true });
                    }
                  }}
                  className="w-full bg-[#0b1320] border border-slate-800 rounded px-2 py-1 text-xs text-cyan-100"
                />
              </div>
            </div>
          </div>

          {/* Specific Warp Gates List */}
          <div className="space-y-1 pt-1 border-t border-[#806f47]/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-purple-400" /> Placed Warp Gates ({normalizeGates(activeMapData?.gates).length})
              </span>
              <button
                type="button"
                onClick={() => {
                  const clicked = useEditorStore.getState().clickedTile;
                  const x = clicked ? clicked.c : 5;
                  const y = clicked ? clicked.r : 5;
                  if (!activeMapData) return;
                  const newGate = {
                    id: `gate_${x}_${y}`,
                    position: { x, y },
                    targetMapId: 'DEMO_SANDBOX',
                    spawnPoint: { x: 6, y: 2 }
                  };
                  const updatedGates = upsertWarpGate(activeMapData.gates, newGate);
                  useGameStore.setState({
                    activeMapData: { ...activeMapData, gates: updatedGates }
                  });
                  useEditorStore.setState({ mapDirty: true });
                  useEditorStore.getState().setShowWarpOverlays(true);
                  showToast(`Added warp gate at [${x}, ${y}] → DEMO_SANDBOX`);
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200"
              >
                + Add Gate At Selection
              </button>
            </div>

            {normalizeGates(activeMapData?.gates).length === 0 ? (
              <p className="text-[9px] text-slate-500 italic py-1">
                No warp gates placed yet. Select a tile on the map or click Gate Tool above to add one.
              </p>
            ) : (
              <div className="max-h-32 space-y-1 overflow-y-auto custom-scrollbar">
                {normalizeGates(activeMapData?.gates).map((gate, idx) => (
                  <div
                    key={`${gate.id || idx}_${gate.position.x}_${gate.position.y}`}
                    className="flex items-center justify-between gap-1 p-1 rounded bg-[#050b14] border border-slate-800 text-[10px]"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono text-purple-300 font-bold">
                        ({gate.position.x},{gate.position.y})
                      </span>
                      <span className="text-slate-500">→</span>
                      <input
                        type="text"
                        value={gate.targetMapId}
                        onChange={(e) => {
                          if (!activeMapData) return;
                          const updated = { ...gate, targetMapId: e.target.value };
                          const nextGates = upsertWarpGate(activeMapData.gates, updated);
                          useGameStore.setState({
                            activeMapData: { ...activeMapData, gates: nextGates }
                          });
                          useEditorStore.setState({ mapDirty: true });
                        }}
                        className="bg-transparent border-b border-slate-700 text-slate-200 text-[10px] px-1 w-28 focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!activeMapData) return;
                        const nextGates = removeWarpGateAt(activeMapData.gates, gate.position.x, gate.position.y);
                        useGameStore.setState({
                          activeMapData: { ...activeMapData, gates: nextGates }
                        });
                        useEditorStore.setState({ mapDirty: true });
                        showToast(`Removed gate at (${gate.position.x}, ${gate.position.y})`);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove gate"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

        {activeLayerIdx === -1 && (
          <div className="rounded border border-rose-900/50 bg-rose-950/20 p-2 text-[10px] space-y-1">
            <div className="font-bold text-rose-200 border-b border-rose-900/30 pb-1 mb-1">Smoke Checklist</div>
            <div className="flex flex-col gap-1 text-slate-300">
              <div className="flex items-center gap-1.5">
                {activeLayerIdx === -1 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
                <span className={activeLayerIdx === -1 ? "text-emerald-400" : ""}>Layer is Logic (−1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeLogicTileId ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
                <span className={activeLogicTileId ? "text-emerald-400" : ""}>Logic Tag selected</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeLayerIdx === -1 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
                <span className={activeLayerIdx === -1 ? "text-emerald-400" : ""}>Overlay is ON</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isDevEditorOpen ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
                <span className={isDevEditorOpen ? "text-emerald-400" : ""}>Tools toggle ON</span>
              </div>
              <div className="flex items-center gap-1.5">
                {!isMapDirty ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Circle className="w-3 h-3 text-slate-600" />}
                <span className={!isMapDirty ? "text-emerald-400" : ""}>Map Saved</span>
              </div>
            </div>
          </div>
        )}

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
