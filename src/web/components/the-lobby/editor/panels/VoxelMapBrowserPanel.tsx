'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Globe, Plus, Trash2, ArrowRight, Grid3X3, Layers, Compass,
  DoorOpen, Users, Swords, AlertTriangle, Check, Shield, UploadCloud, History,
  RotateCcw, Sparkles, Dices, Box, Mountain, Trees, Waves, List, LayoutGrid,
  CheckSquare, Square, Download, Copy, ArrowUpDown, Settings
} from 'lucide-react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import { MapIndexEntry, searchMapIndex, unregisterMap } from '../../data/map-index';
import { loadMap } from '../../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { buildNewStudioMap, formatMapWriteError } from '@/shared/game/studioMapCreate';
import { soundSynth } from '@/engine/sound-synth';
import { useSession } from 'next-auth/react';
import { canWriteStudioContent } from '@/shared/game/studioPermissions';
import { useDebounce } from '@/web/hooks/useDebounce';
import { useMapIndex, useRealmSettings } from '@/web/hooks/studio-data';
import { DEFAULT_SPAWN_MAP_ID } from '@/shared/game/realmSettings';
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
  VOXEL_MAT_WATER,
} from '@/shared/game/voxel/VoxelMaterialDefinition';
import { MapPersistenceService, type MapVersionItem } from '../services/MapPersistenceService';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';

import { MapSettingsModal } from './MapSettingsModal';

type SizePreset = 'tiny' | 'small' | 'standard' | 'large' | 'custom';
type ViewMode = 'list' | 'grid';
type SortField = 'name' | 'id' | 'size' | 'category';

export const VoxelMapBrowserPanel: React.FC = () => {
  const { data: session } = useSession();
  const userPermission = (session?.user as any)?.permissionLevel ?? 0;
  const canEdit = canWriteStudioContent(userPermission);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const studioMode = useEditorStore((s) => s.studioMode);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Multi-Selection State
  const [selectedMapIds, setSelectedMapIds] = useState<Set<string>>(new Set());
  const [isBatchOperating, setIsBatchOperating] = useState(false);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  const { maps: remoteMaps, isLoading: loading, mutateMaps } = useMapIndex();
  const { settings: realmSettings } = useRealmSettings();
  const spawnMapId = (realmSettings?.spawnMapId || DEFAULT_SPAWN_MAP_ID).toUpperCase();


  // Version History Modal State
  const [versionModalMapId, setVersionModalMapId] = useState<string | null>(null);
  const [versionList, setVersionList] = useState<MapVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Single Delete confirm state
  const [deleteTargetMapId, setDeleteTargetMapId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map Settings Modal State
  const [settingsModalMapId, setSettingsModalMapId] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (versionModalMapId) setVersionModalMapId(null);
        else if (deleteTargetMapId) setDeleteTargetMapId(null);
        else if (batchDeleteModalOpen) setBatchDeleteModalOpen(false);
        else if (settingsModalMapId) setSettingsModalMapId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [versionModalMapId, deleteTargetMapId, batchDeleteModalOpen, settingsModalMapId]);

  // Combined & Filtered Map list
  const localList = searchMapIndex(debouncedSearchQuery);
  const q = debouncedSearchQuery.trim().toLowerCase();
  const remoteFiltered = remoteMaps.filter(
    (m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
  const seen = new Set(localList.map((m) => m.id));
  const combined = [...localList, ...remoteFiltered.filter((m) => !seen.has(m.id))];

  const categories = ['ALL', 'Town', 'Route', 'Cave', 'Dungeon', 'House', 'Special'];
  const filtered = useMemo(() => {
    let list = selectedCategory === 'ALL'
      ? combined
      : combined.filter((m) => m.category === selectedCategory);

    // Isolate by map type (strictly Voxel/Fractal maps only)
    list = list.filter((m) => m.mapType === 'VOXEL' || m.mapType === 'FRACTAL' || m.mapType === 'HYBRID');

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = (a.name || a.id).localeCompare(b.name || b.id);
      } else if (sortField === 'id') {
        cmp = a.id.localeCompare(b.id);
      } else if (sortField === 'size') {
        const sizeA = (a.width || 32) * (a.height || 32);
        const sizeB = (b.width || 32) * (b.height || 32);
        cmp = sizeA - sizeB;
      } else if (sortField === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [combined, selectedCategory, sortField, sortAsc, studioMode]);

  // Multi-select helpers
  const isAllSelected = filtered.length > 0 && filtered.every((m) => selectedMapIds.has(m.id));
  const isSomeSelected = filtered.some((m) => selectedMapIds.has(m.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMapIds(new Set());
    } else {
      setSelectedMapIds(new Set(filtered.map((m) => m.id)));
    }
  };

  const toggleSelectMap = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      if (loaded.mapType === 'VOXEL' || loaded.mapType === 'FRACTAL') {
        useEditorStore.getState().setStudioMode('voxel');
      } else {
        useEditorStore.getState().setStudioMode('tile');
      }
      showToast(`Switched to ${mapId}`);
      useEditorStore.getState().closePanel('voxelBrowser');
    } catch {
      useGameStore.setState({ currentMapId: mapId });
      showToast(`Switched to ${mapId} (loading…)`);
      useEditorStore.getState().closePanel('voxelBrowser');
    }
  };

  const executeDelete = async (targetId: string) => {
    if (!targetId) return;
    setIsDeleting(true);
    try {
      unregisterMap(targetId);
      const res = await fetch(`/api/maps/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete map');
      }
      showToast(`Deleted map: ${targetId}`);
      setSelectedMapIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      mutateMaps();
      setDeleteTargetMapId(null);
      if (currentMapId === targetId) {
        useGameStore.setState({ currentMapId: undefined, activeMapData: null });
      }
    } catch (e: any) {
      mutateMaps();
      showToast(e?.message || 'Network error deleting map');
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Operations
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedMapIds).filter((id) => id.toUpperCase() !== spawnMapId);
    if (ids.length === 0) return;

    setIsBatchOperating(true);
    let deletedCount = 0;
    try {
      await Promise.allSettled(
        ids.map(async (id) => {
          unregisterMap(id);
          const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, { method: 'DELETE' });
          if (res.ok) deletedCount++;
        })
      );
      showToast(`Deleted ${deletedCount} maps`);
      setSelectedMapIds(new Set());
      setBatchDeleteModalOpen(false);
      mutateMaps();
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchPublish = async () => {
    const ids = Array.from(selectedMapIds);
    if (ids.length === 0) return;

    setIsBatchOperating(true);
    let publishedCount = 0;
    try {
      await Promise.allSettled(
        ids.map(async (id) => {
          const res = await fetch(`/api/maps/${encodeURIComponent(id)}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'Batch published from Map Browser' }),
          });
          if (res.ok) publishedCount++;
        })
      );
      showToast(`Batch published ${publishedCount} of ${ids.length} maps`);
      mutateMaps();
    } finally {
      setIsBatchOperating(false);
    }
  };

  const handleBatchExport = async () => {
    const ids = Array.from(selectedMapIds);
    if (ids.length === 0) return;

    setIsBatchOperating(true);
    try {
      const exportedMaps: Record<string, any> = {};
      await Promise.allSettled(
        ids.map(async (id) => {
          try {
            const data = await loadMap(id);
            exportedMaps[id] = data;
          } catch {
            // Ignore unresolvable maps
          }
        })
      );

      const blob = new Blob([JSON.stringify(exportedMaps, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saints_maps_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${Object.keys(exportedMaps).length} maps`);
    } finally {
      setIsBatchOperating(false);
    }
  };


  const handleOpenVersions = async (mapId: string) => {
    setVersionModalMapId(mapId);
    setLoadingVersions(true);
    try {
      const history = await MapPersistenceService.fetchVersionHistory(mapId);
      setVersionList(history);
    } catch {
      setVersionList([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handlePublish = async (mapId: string) => {
    setIsPublishing(true);
    try {
      const res = await MapPersistenceService.publishActiveMap(`Release published from Map Browser`);
      if (res.ok) {
        showToast(`Published v${res.publishedVersion}! Live shards updated.`);
        mutateMaps();
      } else {
        showToast(res.error || 'Publish failed');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (!versionModalMapId) return;
    setIsRollingBack(true);
    try {
      const res = await MapPersistenceService.rollbackActiveMap(targetVersion);
      if (res.ok) {
        showToast(`Rolled back map to published v${targetVersion}`);
        setVersionModalMapId(null);
        mutateMaps();
      } else {
        showToast(res.error || 'Rollback failed');
      }
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden">
      {/* ── SIDEBAR HEADER ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#081220] border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Voxel Maps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => mutateMaps()} className="p-1 rounded text-muted-foreground hover:text-slate-200 hover:bg-white/10" title="Reload">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="p-2 shrink-0 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maps..."
            className="w-full pl-7 pr-2 py-1 bg-black/40 border border-border/40 rounded text-xs text-slate-200 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* ── DIRECTORY TREE ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {categories.filter(c => c !== 'ALL').map(cat => {
          const catMaps = filtered.filter(m => (m.category || 'Town') === cat);
          if (catMaps.length === 0) return null;
          return (
            <div key={cat} className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-3 h-3 flex items-center justify-center"><ArrowRight className="w-2 h-2" /></div>
                {cat} ({catMaps.length})
              </div>
              <div className="flex flex-col">
                {catMaps.map(map => {
                  const isCurrent = (currentMapId || '').toUpperCase() === map.id.toUpperCase();
                  const pubVersion = (map as any).publishedVersion || (map as any).version || 1;
                  return (
                    <div
                      key={map.id}
                      onClick={() => handleWarp(map.id)}
                      className={`group flex items-center justify-between px-2 py-1 mx-1 rounded cursor-pointer transition-colors ${
                        isCurrent ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Compass className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                        <div className="min-w-0">
                          <div className={`text-xs truncate ${isCurrent ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                            {map.name || map.id}
                          </div>
                          <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="truncate">{map.id}</span>
                            <span className="px-1 rounded bg-black/30 text-amber-500/80">v{pubVersion}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 bg-[#050b14]/80 px-1 rounded" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <button onClick={() => setSettingsModalMapId(map.id)} className="p-1 text-slate-400 hover:text-white" title="Settings">
                            <Settings className="w-3 h-3" />
                          </button>
                        )}
                        <button onClick={() => handleOpenVersions(map.id)} className="p-1 text-slate-400 hover:text-amber-300" title="History">
                          <History className="w-3 h-3" />
                        </button>
                        {canEdit && map.id.toUpperCase() !== spawnMapId && (
                          <button onClick={() => setDeleteTargetMapId(map.id)} className="p-1 text-slate-400 hover:text-rose-400" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No maps found.
          </div>
        )}
      </div>



      {/* ═══════════════════════════════════════════════════════════
          POPOUT WINDOW: VERSION HISTORY & ROLLBACK
         ═══════════════════════════════════════════════════════════ */}
      {versionModalMapId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
          <div className="w-full max-w-lg rounded-2xl border border-primary/50 bg-[#050b14] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <History className="w-4 h-4" /> Version History: {versionModalMapId}
              </h3>
              <button onClick={() => setVersionModalMapId(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Immutable version releases. Rollback safely restores the realm map to any published snapshot.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingVersions ? (
                <div className="text-center py-6 text-xs text-muted-foreground">Loading versions…</div>
              ) : versionList.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No published snapshots yet. Use &quot;Publish&quot; on the active map to create an immutable version.
                </div>
              ) : (
                versionList.map((ver) => (
                  <div
                    key={ver.version}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0b1626] border border-border/40 hover:border-primary/40 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">v{ver.version}</span>
                        <span className="text-slate-200 font-semibold">{ver.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {ver.description || 'Snapshot'} · by {ver.publishedBy || 'Admin'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {new Date(ver.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleRollback(ver.version)}
                        disabled={isRollingBack}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50"
                        title="Restore this published snapshot"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setVersionModalMapId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════
          POPOUT WINDOW: SINGLE MAP DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════ */}
      {deleteTargetMapId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#050b14] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">Delete Realm Map</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="text-rose-400 font-bold">{deleteTargetMapId}</span>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setDeleteTargetMapId(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => executeDelete(deleteTargetMapId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete Map'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════
          POPOUT WINDOW: BATCH DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════ */}
      {batchDeleteModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#050b14] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">Batch Delete Maps</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete {selectedMapIds.size} selected maps? (The spawn map will be protected).
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto custom-scrollbar p-2 rounded-lg bg-black/40 border border-border/30 text-[11px] text-slate-300 space-y-1">
              {Array.from(selectedMapIds).map((id) => (
                <div key={id} className="flex items-center justify-between">
                  <span>{id}</span>
                  {id.toUpperCase() === spawnMapId && (
                    <span className="text-emerald-400 text-[9px]">Spawn Protected</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBatchOperating}
                onClick={handleBatchDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 disabled:opacity-50 cursor-pointer"
              >
                {isBatchOperating ? 'Deleting…' : `Delete ${selectedMapIds.size} Maps`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Map Settings Modal */}
      {settingsModalMapId && (
        <MapSettingsModal
          mapId={settingsModalMapId}
          onClose={() => setSettingsModalMapId(null)}
        />
      )}
    </div>
  );
};
