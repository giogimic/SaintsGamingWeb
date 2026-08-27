'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Search, Globe, Plus, Trash2, ArrowRight, Grid3X3, Layers, Compass,
  DoorOpen, Users, Swords, AlertTriangle, Check
} from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { MapIndexEntry, searchMapIndex, unregisterMap } from '../../data/map-index';
import { loadMap } from '../../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { buildNewStudioMap } from '@/shared/game/studioMapCreate';
import { soundSynth } from '@/engine/sound-synth';
import { useSession } from 'next-auth/react';
import { canWriteStudioContent } from '@/shared/game/studioPermissions';

export const MapListPanel: React.FC = () => {
  const { data: session } = useSession();
  const userPermission = session?.user?.permissionLevel ?? 0;
  const canEdit = canWriteStudioContent(userPermission);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [remoteMaps, setRemoteMaps] = useState<MapIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // New map state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapW, setNewMapW] = useState(64);
  const [newMapH, setNewMapH] = useState(64);
  const [isCreating, setIsCreating] = useState(false);

  // Delete confirm state
  const [deleteTargetMapId, setDeleteTargetMapId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMaps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maps');
      if (res.ok) {
        const data = await res.json();
        const entries: MapIndexEntry[] = (data.maps || []).map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          category: 'Special',
          recommendedLevel: 1,
          width: m.width || 24,
          height: m.height || 24,
          npcCount: m.npcCount || 0,
          gateCount: m.gateCount || 0,
          hasEncounters: false,
        }));
        setRemoteMaps(entries);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMaps();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        else if (deleteTargetMapId) setDeleteTargetMapId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCreateModal, deleteTargetMapId]);

  const localList = searchMapIndex(searchQuery);
  const q = searchQuery.trim().toLowerCase();
  const remoteFiltered = remoteMaps.filter(
    (m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
  const seen = new Set(localList.map((m) => m.id));
  const combined = [...localList, ...remoteFiltered.filter((m) => !seen.has(m.id))];

  const categories = ['ALL', 'Town', 'Route', 'Cave', 'Dungeon', 'House', 'Special'];
  const filtered = selectedCategory === 'ALL'
    ? combined
    : combined.filter((m) => m.category === selectedCategory);

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
      showToast(`Warped to ${mapId}`);
      useEditorStore.getState().closePanel('maps');
    } catch {
      useGameStore.setState({ currentMapId: mapId });
      showToast(`Warped to ${mapId} (loading…)`);
      useEditorStore.getState().closePanel('maps');
    }
  };

  const handleDelete = async (mapId: string) => {
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
      setDeleteTargetMapId(null);
      showToast(`Deleted map: ${mapId}`);
      void fetchMaps();
    } catch (e: any) {
      showToast(e?.message || 'Network error deleting map');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewMap = async () => {
    const built = buildNewStudioMap({
      slug: newMapSlug,
      name: newMapName,
      gameId: activeGameId,
      width: newMapW,
      height: newMapH,
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
        showToast(err.error || 'Failed to create map');
        return;
      }
      showToast(`Created map: ${newMapData.id}`);
      setShowCreateModal(false);
      setNewMapSlug('');
      setNewMapName('');
      void fetchMaps();
      handleWarp(newMapData.id);
    } catch (e: any) {
      showToast(e?.message || 'Error creating map');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden rounded-b-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-[#050b14]/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-amber-400 flex items-center gap-2">
              WORLD ATLAS & MAP EXPLORER
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-normal">
                {filtered.length} Maps
              </span>
            </h1>
            <p className="text-xs text-slate-400">Explore, search, warp, create, and manage realm maps.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-amber-500/20 bg-black/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by map name, ID, or slug..."
            className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-amber-500/30 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Maps Grid Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
            <Compass className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
            <p className="text-sm font-bold">No maps found matching &ldquo;{searchQuery}&rdquo;</p>
            <p className="text-xs text-slate-600 mt-1">Try another search keyword or create a new map.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((map) => {
              const isCurrent = (currentMapId || '').toUpperCase() === map.id.toUpperCase();
              return (
                <div
                  key={map.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'border-slate-800 bg-[#050b14]/80 hover:border-amber-500/40 hover:bg-[#0b1320]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                          {map.name || map.id}
                        </h2>
                        <span className="font-mono text-[10px] text-amber-500/80">{map.id}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-black/60 border border-slate-700 text-slate-400">
                        {map.category}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80">
                        <Grid3X3 className="w-3 h-3 text-sky-400" />
                        <span>{map.width}x{map.height}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>{map.npcCount} NPCs</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80">
                        <DoorOpen className="w-3 h-3 text-purple-400" />
                        <span>{map.gateCount} Gates</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {canEdit && map.id !== 'DEMO_SANDBOX' && map.id !== 'LOBBY' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetMapId(map.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Map"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleWarp(map.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-black font-black'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Active Map
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3.5 h-3.5" /> Warp Here
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetMapId && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Delete Map &ldquo;{deleteTargetMapId}&rdquo;?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This action is permanent and will remove all tiles, layers, spawns, and gates.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetMapId(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteTargetMapId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete Map'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Map Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <h3 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create New Map
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Map ID / Slug (UPPERCASE):</label>
                <input
                  type="text"
                  value={newMapSlug}
                  onChange={(e) => setNewMapSlug(e.target.value.toUpperCase())}
                  placeholder="e.g. EMERALD_VALLEY"
                  className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Display Name:</label>
                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="e.g. Emerald Valley"
                  className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Width (tiles):</label>
                  <input
                    type="number"
                    min={8}
                    max={128}
                    value={newMapW}
                    onChange={(e) => setNewMapW(parseInt(e.target.value, 10) || 64)}
                    className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Height (tiles):</label>
                  <input
                    type="number"
                    min={8}
                    max={128}
                    value={newMapH}
                    onChange={(e) => setNewMapH(parseInt(e.target.value, 10) || 64)}
                    className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreating || !newMapSlug.trim()}
                onClick={handleCreateNewMap}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-950/50"
              >
                {isCreating ? 'Generating…' : 'Create & Warp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
