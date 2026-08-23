'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Map as MapIcon,
  Search,
  Plus,
  Trash2,
  Crosshair,
  Compass,
  Radio,
  Castle,
  Trees,
  Waves,
  Mountain,
  Flame,
  Navigation,
  Save,
  Grid,
  Grid3X3,
  Users,
  DoorOpen,
  ArrowRight,
  AlertTriangle,
  Check,
  Maximize2,
  RefreshCw,
  Layers,
  Settings2,
  Sliders,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { loadMap, invalidateClientAtlas } from '../data/maps';
import { MapIndexEntry, searchMapIndex, unregisterMap } from '../data/map-index';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { buildNewStudioMap, formatMapWriteError, resizeStudioMap } from '@/shared/game/studioMapCreate';
import { isGoMmoSocketEnabled } from '@/shared/net/goMmoSocket';
import { invalidateMapCache } from '@/shared/game/mapCache';
import { soundSynth } from '@/engine/sound-synth';
import { useSession } from 'next-auth/react';
import { canWriteStudioContent } from '@/shared/game/studioPermissions';
import {
  type AtlasNode,
  type AtlasGridData,
  createAtlasNodeId,
  normalizeAtlasGridData,
  getAdjacentAtlasNeighbors,
} from '@/shared/game/atlas/spatialAtlas';

// ─── Sub-Studio Workspaces ───────────────────────────────────────────────────
export type AtlasWorkspaceId = 'grid' | 'explorer' | 'generator' | 'boundaries';

interface AtlasWorkspaceMeta {
  label: string;
  icon: LucideIcon;
  blurb: string;
  color: string;
}

const WORKSPACE_META: Record<AtlasWorkspaceId, AtlasWorkspaceMeta> = {
  grid: {
    label: 'Macro World Atlas',
    icon: Compass,
    blurb: 'Interactive 2D world layout, drag-and-drop map placement, and 4-way seam synchronization.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  explorer: {
    label: 'Map Library',
    icon: Globe,
    blurb: 'Browse all maps, filter by zone category, inspect stats, warp, and manage server zones.',
    color: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
  generator: {
    label: 'Realm Creator',
    icon: Plus,
    blurb: 'Generate new maps with custom dimensions, default biome layers, and tilesets.',
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  boundaries: {
    label: 'Seams & Bounds',
    icon: Sliders,
    blurb: 'Resize map dimensions, configure global server spawn hubs, and audit edge connectivity.',
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
};

const WORKSPACE_ORDER: AtlasWorkspaceId[] = ['grid', 'explorer', 'generator', 'boundaries'];

export type { AtlasNode };

export interface WorldAtlasData extends AtlasGridData {
  edges: any[];
  bufferPresets?: any[];
  options?: {
    defaultZoneSize?: { w: number; h: number };
    bufferSize?: { w: number; h: number };
    softTransition?: boolean;
    zeroFade?: boolean;
    renderNeighborStripTiles?: number;
  };
}

function getBiomeIcon(mapId: string, isSelected: boolean) {
  const lower = mapId.toLowerCase();
  const cls = `w-4 h-4 mb-0.5 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`;
  if (lower.includes('lobby') || lower.includes('town') || lower.includes('village') || lower.includes('hub')) {
    return <Castle className={cls} />;
  }
  if (lower.includes('forest') || lower.includes('wood') || lower.includes('garden') || lower.includes('farm') || lower.includes('grass')) {
    return <Trees className={cls} />;
  }
  if (lower.includes('water') || lower.includes('sea') || lower.includes('ocean') || lower.includes('port') || lower.includes('beach')) {
    return <Waves className={cls} />;
  }
  if (lower.includes('cave') || lower.includes('dungeon') || lower.includes('mine') || lower.includes('mountain') || lower.includes('pass')) {
    return <Mountain className={cls} />;
  }
  if (lower.includes('boss') || lower.includes('raid') || lower.includes('volcano') || lower.includes('fire')) {
    return <Flame className={cls} />;
  }
  return <MapIcon className={cls} />;
}

export function AtlasStudioSuite() {
  const { data: session } = useSession();
  const userPermission = session?.user?.permissionLevel ?? 0;
  const canEdit = canWriteStudioContent(userPermission);

  const activeGameId = useEditorStore((state) => state.activeGameId);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const showToast = useGameStore((state) => state.showToast);

  const [activeWorkspace, setActiveWorkspace] = useState<AtlasWorkspaceId>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [atlasData, setAtlasData] = useState<WorldAtlasData>({ nodes: [], edges: [] });
  const [lobbyMapId, setLobbyMapId] = useState<string>('LOBBY');
  const [allMaps, setAllMaps] = useState<MapIndexEntry[]>([]);

  // Selection & Placement
  const [selectedMapIdToPlace, setSelectedMapIdToPlace] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);

  // Search & Filters in Explorer
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Generator form
  const [newMapSlug, setNewMapSlug] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapW, setNewMapW] = useState(64);
  const [newMapH, setNewMapH] = useState(64);
  const [isCreating, setIsCreating] = useState(false);

  // Resize form
  const [resizeTargetMapId, setResizeTargetMapId] = useState<string>('');
  const [resizeW, setResizeW] = useState(64);
  const [resizeH, setResizeH] = useState(64);

  // Delete modal
  const [deleteTargetMapId, setDeleteTargetMapId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const GRID_SIZE = 20;

  const fetchAtlasAndMaps = async () => {
    try {
      const [atlasRes, mapsRes] = await Promise.all([
        fetch(`/api/world/atlas?gameId=${encodeURIComponent(activeGameId)}`),
        fetch('/api/maps'),
      ]);

      if (atlasRes.ok) {
        const data = await atlasRes.json();
        if (data?.atlas) {
          let parsed = data.atlas.atlasData;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = { nodes: [], edges: [] };
            }
          }
          const normalized = normalizeAtlasGridData(parsed);
          setAtlasData(normalized as WorldAtlasData);
          setLobbyMapId(data.atlas.lobbyMapId || 'LOBBY');
        }
      }

      if (mapsRes.ok) {
        const mapsData = await mapsRes.json();
        setAllMaps(mapsData.maps || []);
      }
    } catch (err) {
      console.error('Failed to load atlas data', err);
      showToast('Failed to load atlas data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAtlasAndMaps();
  }, [activeGameId]);

  useEffect(() => {
    if (currentMapId && !resizeTargetMapId) {
      setResizeTargetMapId(currentMapId);
    }
  }, [currentMapId, resizeTargetMapId]);

  const handleWarpToMap = async (targetMapId: string, targetNodeId?: string) => {
    soundSynth?.playActionSound?.();
    try {
      const loaded = ensureMapHasStudioTilesets(await loadMap(targetMapId, 0, targetNodeId));
      const mw = loaded.grid?.[0]?.length || loaded.width || 24;
      const mh = loaded.grid?.length || loaded.height || 24;
      const cx = Math.max(1, Math.min(mw - 2, Math.floor(mw / 2)));
      const cy = Math.max(1, Math.min(mh - 2, Math.floor(mh / 2)));
      useGameStore.setState({
        currentMapId: targetMapId,
        activeAtlasNodeId: targetNodeId || loaded.atlasNodeId || null,
        activeMapData: loaded,
      });
      useGameStore.getState().setPlayerPosition({ x: cx, y: cy }, 'down', false);
      showToast(`Warped to ${targetMapId}`);
    } catch {
      useGameStore.setState({ currentMapId: targetMapId, activeAtlasNodeId: targetNodeId || null });
      showToast(`Warped to ${targetMapId} (loading…)`);
    }
  };

  const handleSaveAtlas = async () => {
    if (!atlasData) return;
    setIsSaving(true);
    try {
      soundSynth?.playActionSound?.();
      const res = await fetch('/api/world/atlas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: activeGameId,
          lobbyMapId,
          atlasData,
        }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        if (result.atlas?.atlasData) {
          const raw = typeof result.atlas.atlasData === 'string' ? JSON.parse(result.atlas.atlasData) : result.atlas.atlasData;
          const normalized = normalizeAtlasGridData(raw);
          setAtlasData(normalized as WorldAtlasData);
        }
        useEditorStore.getState().clearMapDirty();
        invalidateMapCache();
        invalidateClientAtlas();
        showToast('Atlas saved successfully.');
      } else {
        showToast(result.error || 'Failed to save atlas.');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error saving atlas.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGridClick = (x: number, y: number) => {
    const existingNode = atlasData.nodes.find((n) => n.x === x && n.y === y);

    if (selectedMapIdToPlace) {
      soundSynth?.playActionSound?.();
      const existingNodeIdx = atlasData.nodes.findIndex((n) => n.x === x && n.y === y);
      const newNodes = [...atlasData.nodes];
      if (existingNodeIdx >= 0) {
        const ex = atlasData.nodes[existingNodeIdx];
        const id = ex.mapId === selectedMapIdToPlace && ex.id ? ex.id : createAtlasNodeId(selectedMapIdToPlace);
        const updatedNode: AtlasNode = { id, mapId: selectedMapIdToPlace, x, y };
        newNodes[existingNodeIdx] = updatedNode;
        setSelectedNode(updatedNode);
      } else {
        const id = createAtlasNodeId(selectedMapIdToPlace);
        const newNode: AtlasNode = { id, mapId: selectedMapIdToPlace, x, y };
        newNodes.push(newNode);
        setSelectedNode(newNode);
      }
      setAtlasData({ ...atlasData, nodes: newNodes });
      setSelectedMapIdToPlace(null);
      useEditorStore.getState().markMapDirty();
    } else if (existingNode) {
      soundSynth?.playSelectSound?.();
      setSelectedNode(existingNode);
    } else {
      setSelectedNode(null);
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
        showToast(formatMapWriteError(res.status, err));
        return;
      }

      invalidateMapCache(newMapData.id);
      useGameStore.setState({ currentMapId: newMapData.id, activeMapData: newMapData });
      useEditorStore.getState().clearMapDirty();

      setNewMapSlug('');
      setNewMapName('');
      const backendUsed = isGoMmoSocketEnabled() ? 'Go MMO' : 'TS Server';
      showToast(`Created & saved map: ${newMapData.id} (Synced to ${backendUsed})`);
      void fetchAtlasAndMaps();
      setActiveWorkspace('explorer');
    } catch (e: any) {
      showToast(e?.message || 'Create failed — network error.');
    } finally {
      setIsCreating(false);
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
      setDeleteTargetMapId(null);
      // Remove from atlas nodes if present
      const filteredNodes = atlasData.nodes.filter((n) => n.mapId !== mapId);
      setAtlasData({ ...atlasData, nodes: filteredNodes });
      showToast(`Deleted map: ${mapId}`);
      void fetchAtlasAndMaps();
    } catch (e: any) {
      showToast(e?.message || 'Network error deleting map');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimaryLobby = async (mapId: string) => {
    try {
      soundSynth?.playActionSound?.();
      setLobbyMapId(mapId);
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
      void handleSaveAtlas();
    } catch {
      showToast('Network error setting lobby.');
    }
  };

  const handleResizeMapSubmit = async () => {
    if (!activeMapData) {
      showToast('Load the map first in viewport before resizing.');
      return;
    }
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
    showToast(`Map resized to ${resizeW}x${resizeH} — Save Map to persist.`);
  };

  // Categories & Filtering for Map Explorer
  const localList: MapIndexEntry[] = searchMapIndex(searchQuery);
  const q = searchQuery.trim().toLowerCase();
  const remoteFiltered = allMaps.filter(
    (m: MapIndexEntry) => !q || m.id.toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q)
  );
  const seen = new Set(localList.map((m: MapIndexEntry) => m.id));
  const combinedMaps = [...localList, ...remoteFiltered.filter((m: MapIndexEntry) => !seen.has(m.id))];

  const categories = ['ALL', 'Town', 'Route', 'Cave', 'Dungeon', 'House', 'Special'];
  const filteredMaps =
    selectedCategory === 'ALL'
      ? combinedMaps
      : combinedMaps.filter((m) => m.category === selectedCategory);

  const meta = WORKSPACE_META[activeWorkspace];
  const Icon = meta.icon;
  const adjacentNeighbors = selectedNode ? getAdjacentAtlasNeighbors(atlasData, selectedNode) : null;
  const activeConnections = adjacentNeighbors ? {
    north: adjacentNeighbors.north?.mapId,
    south: adjacentNeighbors.south?.mapId,
    east: adjacentNeighbors.east?.mapId,
    west: adjacentNeighbors.west?.mapId,
  } : null;

  // ─── Render Sub-Studio Content ──────────────────────────────────────────────
  const renderContent = () => {
    switch (activeWorkspace) {
      case 'grid':
        return (
          <div className="flex flex-1 h-full min-h-0 overflow-hidden">
            {/* Left Drawer: Available Maps Palette */}
            <div className="w-64 flex-none border-r border-amber-500/20 bg-[#080e1a]/95 flex flex-col min-h-0">
              <div className="p-3 border-b border-amber-500/20 font-bold text-slate-200 flex items-center justify-between">
                <span className="text-amber-400 text-xs">Available Maps</span>
                <span className="text-[10px] text-slate-500 font-normal">{allMaps.length} maps</span>
              </div>
              <div className="p-2.5 text-[10px] text-slate-400 bg-black/40 border-b border-amber-500/10">
                Select a map below, then click any grid cell to place it. Adjacent cells auto-wire 4-way edge connections.
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {allMaps.map((m) => {
                  const isSelected = selectedMapIdToPlace === m.id;
                  const isPlaced = atlasData.nodes.some((n) => n.mapId === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        soundSynth?.playSelectSound?.();
                        setSelectedMapIdToPlace(isSelected ? null : m.id);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/25 border-amber-400 text-white shadow-lg'
                          : isPlaced
                          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                          : 'border-slate-800/80 bg-black/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-xs truncate">{m.name || m.id}</span>
                        {isPlaced && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            Placed
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{m.id}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Canvas & Grid */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#050b14]">
              <div className="flex-1 min-h-0 overflow-auto p-6 relative custom-scrollbar">
                <div
                  className="relative rounded-xl border border-amber-500/30 shadow-2xl"
                  style={{
                    width: GRID_SIZE * 76,
                    height: GRID_SIZE * 76,
                    backgroundImage:
                      'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                    backgroundSize: '76px 76px',
                  }}
                >
                  {/* Grid Hitboxes */}
                  {Array.from({ length: GRID_SIZE }).map((_, y) =>
                    Array.from({ length: GRID_SIZE }).map((_, x) => (
                      <div
                        key={`${x}-${y}`}
                        onClick={() => handleGridClick(x, y)}
                        className={`absolute w-[76px] h-[76px] border border-transparent hover:border-amber-400/50 cursor-pointer transition-colors ${
                          selectedMapIdToPlace ? 'hover:bg-amber-500/15' : ''
                        }`}
                        style={{ left: x * 76, top: y * 76 }}
                      />
                    ))
                  )}

                  {/* Placed Map Nodes */}
                  {atlasData.nodes.map((node) => {
                    const isSelected = selectedNode?.x === node.x && selectedNode?.y === node.y;
                    const hasNorth = atlasData.nodes.some((n) => n.x === node.x && n.y === node.y - 1);
                    const hasSouth = atlasData.nodes.some((n) => n.x === node.x && n.y === node.y + 1);
                    const hasWest = atlasData.nodes.some((n) => n.x === node.x - 1 && n.y === node.y);
                    const hasEast = atlasData.nodes.some((n) => n.x === node.x + 1 && n.y === node.y);

                    return (
                      <div
                        key={node.id || `${node.x}_${node.y}`}
                        onClick={() => handleGridClick(node.x, node.y)}
                        onDoubleClick={() => handleWarpToMap(node.mapId, node.id)}
                        className={`absolute w-[74px] h-[74px] m-[1px] rounded-lg flex flex-col items-center justify-center p-1.5 text-center cursor-pointer shadow-xl transition-all group ${
                          isSelected
                            ? 'bg-amber-950/90 border-2 border-amber-400 scale-105 z-10 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                            : 'bg-[#0f172a]/95 border-2 border-amber-500/40 hover:border-amber-400'
                        }`}
                        style={{ left: node.x * 76, top: node.y * 76 }}
                        title="Click to select node · Double-click to teleport"
                      >
                        {/* Directional Connection Pips */}
                        {hasNorth && (
                          <div
                            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]"
                            title="North Seam Connected"
                          />
                        )}
                        {hasSouth && (
                          <div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]"
                            title="South Seam Connected"
                          />
                        )}
                        {hasWest && (
                          <div
                            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]"
                            title="West Seam Connected"
                          />
                        )}
                        {hasEast && (
                          <div
                            className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]"
                            title="East Seam Connected"
                          />
                        )}

                        {getBiomeIcon(node.mapId, isSelected)}
                        <span className="text-[9px] text-slate-200 break-all leading-tight font-bold">
                          {node.mapId}
                        </span>
                        {node.mapId === lobbyMapId && (
                          <div
                            className="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] bg-emerald-500 text-black font-extrabold rounded-full border border-black"
                            title="Primary Server Spawn Hub"
                          >
                            HUB
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWarpToMap(node.mapId, node.id);
                          }}
                          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-amber-500 text-black hover:bg-amber-400 transition-opacity shadow"
                          title="Teleport to map"
                        >
                          <Navigation className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Selected Node Bar */}
              {selectedNode && (
                <div className="flex-none p-3 bg-[#080e1a] border-t border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <MapIcon className="w-4 h-4 text-amber-400" />
                      Selected: <span className="text-white">{selectedNode.mapId}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({selectedNode.id})</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Grid Coordinate: [{selectedNode.x}, {selectedNode.y}]
                    </span>
                    {activeConnections && (
                      <div className="flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[10px]">
                        <span className="text-slate-400 font-bold">Seams:</span>
                        <span className={activeConnections.north ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
                          N: {activeConnections.north || '—'}
                        </span>
                        <span className={activeConnections.east ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
                          E: {activeConnections.east || '—'}
                        </span>
                        <span className={activeConnections.south ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
                          S: {activeConnections.south || '—'}
                        </span>
                        <span className={activeConnections.west ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
                          W: {activeConnections.west || '—'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await handleWarpToMap(selectedNode.mapId, selectedNode.id);
                        setStudioMode('develop');
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold rounded-lg shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Warp and switch to Edit Mode to paint this map"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Edit Realm</span>
                    </button>
                    <button
                      onClick={() => handleWarpToMap(selectedNode.mapId, selectedNode.id)}
                      className="px-3 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-cyan-300 font-bold rounded-lg border border-cyan-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Open map in Viewport"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Open in Viewport</span>
                    </button>
                    <button
                      onClick={() => handleSetPrimaryLobby(selectedNode.mapId)}
                      className="px-3 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-emerald-300 font-bold rounded-lg border border-emerald-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Designate as primary server spawn hub"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Set as Spawn Hub</span>
                    </button>
                    <button
                      onClick={() => {
                        soundSynth?.playUiClick?.();
                        const newNodes = atlasData.nodes.filter(
                          (n) => n.id !== selectedNode.id && !(n.x === selectedNode.x && n.y === selectedNode.y)
                        );
                        setAtlasData({ ...atlasData, nodes: newNodes });
                        setSelectedNode(null);
                        useEditorStore.getState().markMapDirty();
                        showToast(`Removed ${selectedNode.mapId} from atlas`);
                      }}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold rounded-lg border border-rose-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Remove this node from the atlas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Node</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'explorer':
        return (
          <div className="flex flex-col flex-1 h-full min-h-0 bg-[#050b14]">
            {/* Search and Category Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-amber-500/20 bg-black/40">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search maps by name, slug, or category..."
                  className="w-full pl-9 pr-4 py-2 bg-[#080e1a] border border-amber-500/30 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400 shadow-inner"
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

            {/* Maps Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {filteredMaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                  <Compass className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                  <p className="text-sm font-bold">No maps found matching &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs text-slate-600 mt-1">Try another search keyword or create a new realm.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMaps.map((map) => {
                    const isCurrent = (currentMapId || '').toUpperCase() === map.id.toUpperCase();
                    const isHub = map.id === lobbyMapId;
                    const isPlacedInAtlas = atlasData.nodes.some((n) => n.mapId === map.id);

                    return (
                      <div
                        key={map.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                          isCurrent
                            ? 'border-amber-400 bg-amber-950/25 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                            : 'border-slate-800 bg-[#080e1a]/90 hover:border-amber-500/40 hover:bg-[#0b1320]'
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
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider bg-black/60 border border-slate-700 text-slate-400">
                                {map.category || 'Map'}
                              </span>
                              {isHub && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  SPAWN HUB
                                </span>
                              )}
                              {isPlacedInAtlas && !isHub && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                                  ATLAS
                                </span>
                              )}
                            </div>
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
                            onClick={() => handleWarpToMap(map.id)}
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
          </div>
        );

      case 'generator':
        return (
          <div className="flex-1 flex items-center justify-center p-8 bg-[#050b14] overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-amber-500/40 bg-[#080e1a] p-6 shadow-2xl space-y-5">
              <div className="border-b border-amber-500/20 pb-3">
                <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Generate & Author New Map
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create a new playable realm map with initialized layers, GID visual ground, and server socket synchronization.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Map Slug / Unique ID (UPPERCASE):</label>
                  <input
                    type="text"
                    value={newMapSlug}
                    onChange={(e) => setNewMapSlug(e.target.value.toUpperCase())}
                    placeholder="e.g. EMERALD_VALLEY, CRYSTAL_CAVERN"
                    className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Alphanumeric and underscores only. Used as the internal identifier.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Display Name:</label>
                  <input
                    type="text"
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    placeholder="e.g. Emerald Valley (Route 1)"
                    className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Width (Tiles):</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={newMapW}
                      onChange={(e) => setNewMapW(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1.5">Height (Tiles):</label>
                    <input
                      type="number"
                      min={8}
                      max={128}
                      value={newMapH}
                      onChange={(e) => setNewMapH(parseInt(e.target.value, 10) || 64)}
                      className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                  ⚡ New maps are automatically populated with default Studio ground tilesets (GID 17) and registered in the active realm database.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/20">
                <button
                  type="button"
                  disabled={isCreating || !newMapSlug.trim()}
                  onClick={handleCreateNewMap}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Generating Map…' : 'Create & Save Realm'}</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'boundaries':
        return (
          <div className="flex-1 p-8 bg-[#050b14] overflow-y-auto space-y-6 max-w-4xl mx-auto custom-scrollbar">
            {/* Primary Spawn Hub Settings */}
            <div className="rounded-2xl border border-amber-500/30 bg-[#080e1a] p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" /> Primary Spawn / World Hub
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    The designated spawn map for newly registered users, character creation, and realm returns.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={lobbyMapId}
                    onChange={(e) => void handleSetPrimaryLobby(e.target.value)}
                    className="bg-[#050b14] border border-amber-500/40 rounded-xl px-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer font-bold"
                  >
                    {allMaps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.id} ({m.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Resize Map Dimensions Tool */}
            <div className="rounded-2xl border border-sky-500/30 bg-[#080e1a] p-5 shadow-xl space-y-4">
              <div>
                <h3 className="font-bold text-sm text-sky-400 flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-400" /> Resize Map Dimensions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Expand or crop the current map&apos;s tile grid. Expanded areas receive default solid ground.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Width (8-128 tiles):</label>
                  <input
                    type="number"
                    min={8}
                    max={128}
                    value={resizeW}
                    onChange={(e) => setResizeW(parseInt(e.target.value, 10) || 64)}
                    className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Target Height (8-128 tiles):</label>
                  <input
                    type="number"
                    min={8}
                    max={128}
                    value={resizeH}
                    onChange={(e) => setResizeH(parseInt(e.target.value, 10) || 64)}
                    className="w-full bg-[#050b14] border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleResizeMapSubmit}
                className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Apply Resize to Active Map ({activeMapData?.id || 'None'})
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex h-full pointer-events-auto select-none overflow-hidden font-mono">
      {/* ─── Left Sidebar: Atlas Workspaces ─── */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-[#030810]/95 border-r border-slate-800/60 overflow-y-auto">
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[11px] font-black tracking-wider text-amber-400 uppercase">
                Atlas Studio
              </h2>
              <p className="text-[9px] text-slate-500">World & Map Management</p>
            </div>
          </div>
        </div>

        {/* Workspaces List */}
        <div className="flex-1 py-2 px-2 space-y-1">
          {WORKSPACE_ORDER.map((id) => {
            const ws = WORKSPACE_META[id];
            const WsIcon = ws.icon;
            const isActive = activeWorkspace === id;

            return (
              <button
                key={id}
                onClick={() => setActiveWorkspace(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer group ${
                  isActive
                    ? `${ws.color} border shadow-lg`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <WsIcon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? '' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-bold truncate ${
                      isActive ? '' : 'group-hover:text-slate-200'
                    }`}
                  >
                    {ws.label}
                  </div>
                  {isActive && (
                    <div className="text-[9px] text-inherit opacity-70 mt-0.5 line-clamp-2">
                      {ws.blurb}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-2 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-600">
          <span>Ctrl+Shift+M</span>
          <span>{allMaps.length} Realms</span>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#050b14]/90">
        {/* Workspace Top Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-[#050b14]/80">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${meta.color.split(' ')[0]}`} />
            <h1 className={`text-sm font-black tracking-wider uppercase ${meta.color.split(' ')[0]}`}>
              {meta.label}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {activeWorkspace === 'grid' && (
              <button
                onClick={() => void handleSaveAtlas()}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-amber-400 text-black font-bold rounded-lg flex items-center gap-1.5 hover:bg-amber-300 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving…' : 'Save Atlas & Sync Seams'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">{renderContent()}</div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetMapId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-[#050b14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Delete Map &ldquo;{deleteTargetMapId}&rdquo;?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This action is permanent and will remove all layers, tiles, NPC spawns, and gate hooks.
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
                onClick={() => handleDeleteMap(deleteTargetMapId)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete Map'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
