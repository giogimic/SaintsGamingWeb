'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Search, Globe, Plus, Trash2, ArrowRight, Grid3X3, Layers, Compass,
  DoorOpen, Users, Swords, AlertTriangle, Check, Shield, UploadCloud, History,
  RotateCcw, Sparkles, Dices, Box, Mountain, Trees, Waves
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
  WindowMenuButton,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';

type SizePreset = 'tiny' | 'small' | 'standard' | 'large' | 'custom';

export const MapListPanel: React.FC = () => {
  const { data: session } = useSession();
  const userPermission = session?.user?.permissionLevel ?? 0;
  const canEdit = canWriteStudioContent(userPermission);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const showToast = useGameStore((s) => s.showToast);
  const activeGameId = useEditorStore((s) => s.activeGameId);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { maps: remoteMaps, isLoading: loading, mutateMaps } = useMapIndex();
  const { settings: realmSettings } = useRealmSettings();
  const spawnMapId = (realmSettings?.spawnMapId || DEFAULT_SPAWN_MAP_ID).toUpperCase();

  // Create Map Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [newMapW, setNewMapW] = useState(64);
  const [newMapH, setNewMapH] = useState(64);
  const [genMode, setGenMode] = useState<VoxelGenerationMode>('procedural');
  const [terrainProfile, setTerrainProfile] = useState<VoxelTerrainProfile>('rolling_hills');
  const [seed, setSeed] = useState<string>(() => Math.floor(Math.random() * 1000000).toString());
  const [baseMaterial, setBaseMaterial] = useState<number>(VOXEL_MAT_GRASS);
  const [blockSizePx, setBlockSizePx] = useState<number>(64);
  const [baseElevation, setBaseElevation] = useState<number>(14);
  const [elevationRange, setElevationRange] = useState<number>(8);
  const [isCreating, setIsCreating] = useState(false);

  // Version History Modal State
  const [versionModalMapId, setVersionModalMapId] = useState<string | null>(null);
  const [versionList, setVersionList] = useState<MapVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Delete confirm state
  const [deleteTargetMapId, setDeleteTargetMapId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        else if (versionModalMapId) setVersionModalMapId(null);
        else if (deleteTargetMapId) setDeleteTargetMapId(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCreateModal, versionModalMapId, deleteTargetMapId]);

  const localList = searchMapIndex(debouncedSearchQuery);
  const q = debouncedSearchQuery.trim().toLowerCase();
  const remoteFiltered = remoteMaps.filter(
    (m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
  );
  const seen = new Set(localList.map((m) => m.id));
  const combined = [...localList, ...remoteFiltered.filter((m) => !seen.has(m.id))];

  const categories = ['ALL', 'Town', 'Route', 'Cave', 'Dungeon', 'House', 'Special'];
  const filtered = selectedCategory === 'ALL'
    ? combined
    : combined.filter((m) => m.category === selectedCategory);

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
      showToast(`Warped to ${mapId}`);
      useEditorStore.getState().closePanel('maps');
    } catch {
      useGameStore.setState({ currentMapId: mapId });
      showToast(`Warped to ${mapId} (loading…)`);
      useEditorStore.getState().closePanel('maps');
    }
  };

  const executeDelete = async (deleteTargetMapId: string) => {
    if (!deleteTargetMapId) return;
    setIsDeleting(true);
    try {
      unregisterMap(deleteTargetMapId);
      const res = await fetch(`/api/maps/${encodeURIComponent(deleteTargetMapId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete map');
      }
      showToast(`Deleted map: ${deleteTargetMapId}`);
      mutateMaps();
      setDeleteTargetMapId(null);
      if (currentMapId === deleteTargetMapId) {
        useGameStore.setState({ currentMapId: undefined, activeMapData: null });
      }
    } catch (e: any) {
      mutateMaps();
      showToast(e?.message || 'Network error deleting map');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewMap = async () => {
    const slug = newMapSlug.trim().toUpperCase();
    if (!slug) {
      showToast('Please enter a map ID slug.');
      return;
    }

    const widthChunks = Math.max(1, Math.ceil(newMapW / 16));
    const depthChunks = Math.max(1, Math.ceil(newMapH / 16));

    const generatedVoxelDoc = generateVoxelWorldDoc({
      id: slug,
      name: newMapName.trim() || slug,
      widthChunks,
      depthChunks,
      heightChunks: 1,
      blockSizePx,
      mode: genMode,
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
          grid: newMapData.grid,
          gates: newMapData.gates,
          npcs: newMapData.npcs,
          encounterPool: newMapData.encounterPool,
          tileLayers: newMapData.tileLayers,
          tilesets: newMapData.tilesets,
          voxelDoc: generatedVoxelDoc,
          blockSizePx,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create map');
      }

      showToast(`Created map: ${slug} (${genMode})`);
      setShowCreateModal(false);
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
        showToast(`Published v${res.publishedVersion} successfully! Live shards updated.`);
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
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden -m-3 mb-0">
      {/* ── SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Map"
          icon={Globe}
          items={[
            {
              label: 'Create New Map',
              icon: Plus,
              onClick: () => setShowCreateModal(true),
              disabled: !canEdit,
            },
            {
              label: 'Reload Map Index',
              icon: ArrowRight,
              onClick: () => mutateMaps(),
            },
            { divider: true, label: '' },
            {
              label: 'Publish Active Draft',
              icon: UploadCloud,
              onClick: () => currentMapId && handlePublish(currentMapId),
              disabled: !canEdit || !currentMapId,
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuTabGroup
          tabs={categories.map((c) => ({ id: c, label: c }))}
          activeTab={selectedCategory}
          onChange={setSelectedCategory}
        />
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground font-mono">
          {filtered.length} of {combined.length} maps
        </span>
      </WindowMenuBar>

      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-primary/30 bg-[#050b14]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/40 text-primary shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-primary flex items-center gap-2">
              WORLD ATLAS & MAP EXPLORER
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-amber-300 font-normal">
                {filtered.length} Maps
              </span>
            </h1>
            <p className="text-xs text-slate-400">Continuous voxel world regions, procedural generation, and version releases.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-xs hover:from-amber-500 hover:to-amber-400 shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-primary/20 bg-black/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by map name, ID, or slug..."
            className="w-full pl-9 pr-4 py-2 bg-[#050b14] border border-primary/30 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-primary shadow-inner"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary/30 text-amber-300 border border-primary/50 shadow'
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
              const isSpawnHub = map.id.toUpperCase() === spawnMapId;
              const widthChunks = Math.ceil((map.width || 32) / 16);
              const depthChunks = Math.ceil((map.height || 32) / 16);
              const pubVersion = (map as any).publishedVersion || (map as any).version || 1;

              return (
                <div
                  key={map.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'border-slate-800 bg-[#050b14]/80 hover:border-primary/40 hover:bg-[#0b1320]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                          {map.name || map.id}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-amber-500/80">{map.id}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            v{pubVersion}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-black/60 border border-slate-700 text-slate-400">
                          {map.category}
                        </span>
                        <span className="text-[8px] font-mono text-cyan-400/80">VOXEL V3</span>
                      </div>
                    </div>

                    {isSpawnHub && (
                      <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 w-fit">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider">Spawn Hub</span>
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80" title="Voxel Chunks (16x16 blocks each)">
                        <Box className="w-3 h-3 text-amber-400" />
                        <span>{widthChunks}x{depthChunks} Chk</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80" title="Total block dimensions">
                        <Grid3X3 className="w-3 h-3 text-sky-400" />
                        <span>{map.width}x{map.height}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 rounded-lg p-1.5 border border-slate-800/80">
                        <DoorOpen className="w-3 h-3 text-purple-400" />
                        <span>{map.gateCount} Gates</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        {map.id.toUpperCase() !== spawnMapId && (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVersions(map.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title="Published Version History & Rollback"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-1 justify-end">
                      {isCurrent && canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePublish(map.id);
                          }}
                          disabled={isPublishing}
                          className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-500/30 transition-all cursor-pointer"
                          title="Publish current draft as immutable release version"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{isPublishing ? 'Publishing…' : 'Publish'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleWarp(map.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-600 text-white font-black shadow-lg shadow-amber-950/50'
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Version History & Rollback Modal */}
      {versionModalMapId && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <History className="w-4 h-4" /> Version History: {versionModalMapId}
              </h3>
              <button onClick={() => setVersionModalMapId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Published releases create immutable snapshots. Rollback safely restores the world to an earlier state.
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingVersions ? (
                <div className="text-center py-6 text-xs text-slate-500">Loading version snapshots…</div>
              ) : versionList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No published releases yet for this map. Use the &quot;Publish&quot; button to create immutable snapshots.
                </div>
              ) : (
                versionList.map((ver) => (
                  <div
                    key={ver.version}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0b1320] border border-slate-800 hover:border-primary/40 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">v{ver.version}</span>
                        <span className="text-slate-200 font-semibold">{ver.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ver.description || 'Published snapshot'} · by {ver.publishedBy || 'Admin'}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {new Date(ver.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleRollback(ver.version)}
                        disabled={isRollingBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600/30 hover:bg-amber-600 text-amber-200 border border-amber-500/40 transition-all cursor-pointer disabled:opacity-50"
                        title="Rollback world to this exact snapshot"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-primary/20">
              <button
                type="button"
                onClick={() => setVersionModalMapId(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetMapId && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-slate-100">Delete Realm Map</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete <span className="text-rose-400 font-bold">{deleteTargetMapId}</span>? This action cannot be undone.
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
                onClick={() => executeDelete(deleteTargetMapId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete Map'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgraded Procedural Map Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-primary/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Procedural Voxel Map Generator
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Identity */}
              <div className="grid grid-cols-2 gap-3">
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
              </div>

              {/* Size Presets */}
              <div>
                <label className="block text-slate-400 mb-1.5">Size Preset:</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'tiny', label: 'Tiny', desc: '16x16 (1x1 chk)' },
                    { id: 'small', label: 'Small', desc: '32x32 (2x2 chk)' },
                    { id: 'standard', label: 'Standard', desc: '64x64 (4x4 chk)' },
                    { id: 'large', label: 'Large', desc: '128x128 (8x8 chk)' },
                    { id: 'custom', label: 'Custom', desc: 'Custom size' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id as SizePreset)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        sizePreset === preset.id
                          ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                          : 'border-slate-800 bg-[#0b1320] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs">{preset.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dimensions if selected */}
              {sizePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-slate-800">
                  <div>
                    <label className="block text-slate-400 mb-1">Width (tiles/blocks):</label>
                    <input
                      type="number"
                      min={16}
                      max={256}
                      step={16}
                      value={newMapW}
                      onChange={(e) => setNewMapW(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Height / Depth (tiles/blocks):</label>
                    <input
                      type="number"
                      min={16}
                      max={256}
                      step={16}
                      value={newMapH}
                      onChange={(e) => setNewMapH(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Generation Mode */}
              <div>
                <label className="block text-slate-400 mb-1.5">World Generation Mode:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'procedural', label: 'Procedural', desc: 'Multi-octave noise & biomes' },
                    { id: 'foundation', label: 'Solid Flat', desc: 'Flat foundation slab' },
                    { id: 'blank', label: 'Blank Canvas', desc: 'Empty canvas volume' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setGenMode(m.id as VoxelGenerationMode)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        genMode === m.id
                          ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                          : 'border-slate-800 bg-[#0b1320] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs">{m.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Procedural Terrain Profile (if procedural) */}
              {genMode === 'procedural' && (
                <div className="space-y-3 p-3 rounded-xl bg-black/40 border border-slate-800">
                  <div>
                    <label className="block text-slate-400 mb-1.5">Terrain Profile:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'rolling_hills', label: 'Rolling Hills' },
                        { id: 'mountains', label: 'Mountains & Peaks' },
                        { id: 'islands', label: 'Islands & Ocean' },
                        { id: 'canyon', label: 'Canyon & Ridges' },
                        { id: 'plateau', label: 'Plateau & Mesas' },
                        { id: 'flat', label: 'Flat Plains' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTerrainProfile(p.id as VoxelTerrainProfile)}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            terrainProfile === p.id
                              ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                              : 'border-slate-800 bg-[#0b1320] text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-xs">{p.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seed Input with Randomize */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400">Deterministic Generation Seed:</label>
                      <button
                        type="button"
                        onClick={handleRandomizeSeed}
                        className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        <Dices className="w-3 h-3" /> Randomize
                      </button>
                    </div>
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      placeholder="e.g. golden_summit_42"
                      className="w-full bg-[#0b1320] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Base Elevation & Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Base Elevation ({baseElevation} blocks):</label>
                      <input
                        type="range"
                        min={4}
                        max={24}
                        value={baseElevation}
                        onChange={(e) => setBaseElevation(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Height Variation (±{elevationRange} blocks):</label>
                      <input
                        type="range"
                        min={2}
                        max={16}
                        value={elevationRange}
                        onChange={(e) => setElevationRange(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Base Surface Material */}
              {genMode !== 'blank' && (
                <div>
                  <label className="block text-slate-400 mb-1.5">Primary Surface Material:</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { id: VOXEL_MAT_GRASS, label: 'Grass' },
                      { id: VOXEL_MAT_STONE, label: 'Stone' },
                      { id: VOXEL_MAT_SAND, label: 'Sand' },
                      { id: VOXEL_MAT_DIRT, label: 'Dirt' },
                      { id: VOXEL_MAT_SNOW, label: 'Snow' },
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setBaseMaterial(mat.id)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          baseMaterial === mat.id
                            ? 'border-amber-400 bg-amber-500/20 text-white font-bold'
                            : 'border-slate-800 bg-[#0b1320] text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs">{mat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-primary/20">
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 shadow-lg shadow-amber-950/50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isCreating ? 'Generating World…' : 'Generate & Warp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
