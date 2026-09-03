'use client';

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Save, Map as MapIcon, Plus, Trash2, Crosshair, HelpCircle, Compass, Radio,
  Castle, Trees, Waves, Mountain, Flame, Navigation, ArrowUpRight, Globe, Sparkles
} from 'lucide-react';
import { MapIndexEntry, loadMap, invalidateMapCache, invalidateClientAtlas } from '../../data/maps';
import { ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { STUDIO_MAP_HOT_RELOAD_EVENT } from '@/shared/game/studioEvents';
import { soundSynth } from '@/engine/sound-synth';
import {
  type AtlasNode,
  type AtlasGridData,
  createAtlasNodeId,
  normalizeAtlasGridData,
  getAdjacentAtlasNeighbors,
} from '@/shared/game/atlas/spatialAtlas';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

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

export const WorldAtlasPanel: React.FC = () => {
  const activeGameId = useEditorStore((state) => state.activeGameId);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const showToast = useGameStore((state) => state.showToast);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [atlasData, setAtlasData] = useState<WorldAtlasData | null>(null);
  const [lobbyMapId, setLobbyMapId] = useState<string>('LOBBY');
  
  const [allMaps, setAllMaps] = useState<MapIndexEntry[]>([]);
  const [selectedMapIdToPlace, setSelectedMapIdToPlace] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AtlasNode | null>(null);

  // 20x20 grid
  const GRID_SIZE = 20;

  useEffect(() => {
    let active = true;
    const fetchAtlas = async () => {
      try {
        const [atlasRes, mapsRes] = await Promise.all([
          fetch(`/api/world/atlas?gameId=${encodeURIComponent(activeGameId)}`),
          fetch('/api/maps')
        ]);
        
        if (!active) return;
        
        if (atlasRes.ok) {
          const data = await atlasRes.json();
          if (data?.atlas) {
            let parsedAtlas = data.atlas.atlasData;
            if (typeof parsedAtlas === 'string') {
              try {
                parsedAtlas = JSON.parse(parsedAtlas);
              } catch {
                parsedAtlas = { nodes: [], edges: [] };
              }
            }
            const normalized = normalizeAtlasGridData(parsedAtlas);
            setAtlasData(normalized as WorldAtlasData);
            setLobbyMapId(data.atlas.lobbyMapId || 'LOBBY');
          }
        }
        
        if (mapsRes.ok) {
          const mapsData = await mapsRes.json();
          setAllMaps(mapsData.maps || []);
        }
      } catch (err) {
        console.error('Failed to load atlas', err);
        showToast('Failed to load atlas data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAtlas();
    return () => { active = false; };
  }, [activeGameId, showToast]);

  const handleWarpToMap = async (targetMapId: string, targetNodeId?: string) => {
    try {
      soundSynth?.playActionSound?.();
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
      showToast(`Warped to map: ${targetMapId}`);
    } catch {
      useGameStore.setState({ currentMapId: targetMapId, activeAtlasNodeId: targetNodeId || null });
      showToast(`Warped to map: ${targetMapId} (loading…)`);
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
        })
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

        // Hot-reload active map so new connections and neighbor chunks take effect immediately
        const curMapId = useGameStore.getState().currentMapId;
        const curAtlasNodeId = useGameStore.getState().activeAtlasNodeId;
        if (curMapId) {
          try {
            const reloaded = ensureMapHasStudioTilesets(await loadMap(curMapId, 0, curAtlasNodeId || undefined));
            useGameStore.getState().setActiveMapData(reloaded);
            window.dispatchEvent(new CustomEvent(STUDIO_MAP_HOT_RELOAD_EVENT, { detail: { mapDoc: reloaded } }));
          } catch (reloadErr) {
            console.warn('[WorldAtlasPanel] Error refreshing active map data after save:', reloadErr);
          }
        }

        const syncCount = typeof result.syncedMapCount === 'number' ? ` (${result.syncedMapCount} map seams synced)` : '';
        showToast(`Atlas & connection seams saved successfully${syncCount}.`);
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
    if (!atlasData) return;
    
    const existingNode = atlasData.nodes.find(n => n.x === x && n.y === y);
    
    // If placing
    if (selectedMapIdToPlace) {
      soundSynth?.playActionSound?.();
      const existingNodeIdx = atlasData.nodes.findIndex(n => n.x === x && n.y === y);
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

  if (isLoading || !atlasData) {
    return <div className="p-4 text-xs text-slate-400">Loading World Atlas...</div>;
  }

  const adjacentNeighbors = selectedNode ? getAdjacentAtlasNeighbors(atlasData, selectedNode) : null;
  const activeConnections = adjacentNeighbors ? {
    north: adjacentNeighbors.north?.mapId,
    south: adjacentNeighbors.south?.mapId,
    east: adjacentNeighbors.east?.mapId,
    west: adjacentNeighbors.west?.mapId,
  } : null;

  return (
    <div className="flex flex-col h-full w-full min-h-0 text-xs font-mono bg-[#070d18] select-none -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Atlas"
          icon={Globe}
          items={[
            {
              label: 'Save Atlas Document',
              icon: Save,
              shortcut: 'Ctrl+S',
              onClick: () => void handleSaveAtlas(),
              disabled: isSaving,
            },
            {
              label: 'Invalidate Client Cache',
              onClick: () => {
                invalidateClientAtlas();
                showToast('Invalidated client atlas cache');
              },
            },
            { divider: true, label: '' },
            {
              label: 'Exit to Realm Editor',
              onClick: () => setStudioMode('develop'),
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label={isSaving ? 'Saving...' : 'Save Atlas'}
          icon={Save}
          onClick={() => void handleSaveAtlas()}
          disabled={isSaving}
          title="Save macro world layout and auto-stitch 4-way borders"
        />
        {selectedNode && (
          <WindowMenuButton
            label={`Warp to ${selectedNode.mapId}`}
            icon={ArrowUpRight}
            onClick={() => void handleWarpToMap(selectedNode.mapId, selectedNode.id)}
            title="Open active map in 2.5D Studio"
          />
        )}
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground font-mono">
          {atlasData.nodes.length} realms linked ({GRID_SIZE}x{GRID_SIZE})
        </span>
      </WindowMenuBar>

      <div className="flex-none p-3 border-b border-amber-500/20 bg-[#0b1320] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
            <Compass className="w-4 h-4 text-amber-400" />
            Macro World Atlas
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px]">Spawn / Hub Map:</label>
            <select 
              value={lobbyMapId}
              onChange={(e) => {
                soundSynth?.playUiClick?.();
                setLobbyMapId(e.target.value);
              }}
              className="bg-[#050b14] border border-amber-500/30 rounded-lg px-2.5 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {allMaps.map(m => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => void handleSaveAtlas()}
            disabled={isSaving}
            className="px-3.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1.5 hover:bg-amber-500 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Atlas & Sync Edge Seams'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: Map Palette */}
        <div className="w-64 flex-none border-r border-amber-500/20 bg-[#0b1320]/60 flex flex-col min-h-0">
          <div className="p-2.5 border-b border-amber-500/20 font-bold text-slate-200 flex items-center justify-between">
            <span className="text-amber-400">Available Maps</span>
            <span className="text-[10px] text-slate-500 font-normal">{allMaps.length} maps</span>
          </div>
          <div className="p-2 text-[10px] text-slate-400 bg-black/50/40 border-b border-amber-500/10">
            Select a map below, then click a grid cell to place it. Adjacent cells auto-wire 4-way border transitions.
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {allMaps.map(m => {
              const isSelected = selectedMapIdToPlace === m.id;
              const isPlaced = atlasData.nodes.some(n => n.mapId === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    setSelectedMapIdToPlace(isSelected ? null : m.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg' 
                      : isPlaced
                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
                      : 'border-[#806f47]/20/80 bg-black/50/40 text-slate-400 hover:bg-white/5 hover:text-slate-200'
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

        {/* Main Grid Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#050b14]">
          <div className="flex-1 min-h-0 overflow-auto p-6 relative custom-scrollbar">
            <div 
              className="relative rounded-xl border border-amber-500/30 shadow-2xl" 
              style={{ 
                width: GRID_SIZE * 72, 
                height: GRID_SIZE * 72,
                backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                backgroundSize: '72px 72px'
              }}
            >
              {/* Grid cells hitboxes */}
              {Array.from({ length: GRID_SIZE }).map((_, y) => 
                Array.from({ length: GRID_SIZE }).map((_, x) => (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => handleGridClick(x, y)}
                    className={`absolute w-[72px] h-[72px] border border-transparent hover:border-amber-400/50 cursor-pointer transition-colors ${
                      selectedMapIdToPlace ? 'hover:bg-amber-500/15' : ''
                    }`}
                    style={{ left: x * 72, top: y * 72 }}
                  />
                ))
              )}

              {/* Active Connection Conduits / Bridges Between Adjacent Nodes */}
              {atlasData.nodes.map((node) => {
                const eastNeighbor = atlasData.nodes.find(n => n.x === node.x + 1 && n.y === node.y);
                const southNeighbor = atlasData.nodes.find(n => n.x === node.x && n.y === node.y + 1);

                return (
                  <React.Fragment key={`conduit_${node.id || `${node.x}_${node.y}`}`}>
                    {eastNeighbor && (
                      <div
                        className="absolute z-0 pointer-events-none flex items-center justify-center"
                        style={{
                          left: node.x * 72 + 65,
                          top: node.y * 72 + 28,
                          width: 14,
                          height: 14,
                        }}
                        title={`Seamless East-West Connection: ${node.mapId} ↔ ${eastNeighbor.mapId}`}
                      >
                        <div className="w-full h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.95)] border border-cyan-200" />
                      </div>
                    )}
                    {southNeighbor && (
                      <div
                        className="absolute z-0 pointer-events-none flex items-center justify-center"
                        style={{
                          left: node.x * 72 + 28,
                          top: node.y * 72 + 65,
                          width: 14,
                          height: 14,
                        }}
                        title={`Seamless North-South Connection: ${node.mapId} ↔ ${southNeighbor.mapId}`}
                      >
                        <div className="h-full w-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.95)] border border-cyan-200" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Placed Nodes */}
              {atlasData.nodes.map((node) => {
                const isSelected = selectedNode?.x === node.x && selectedNode?.y === node.y;
                const nodeType = node.nodeType || 'authored';
                const hasNorth = atlasData.nodes.some(n => n.x === node.x && n.y === node.y - 1);
                const hasSouth = atlasData.nodes.some(n => n.x === node.x && n.y === node.y + 1);
                const hasWest = atlasData.nodes.some(n => n.x === node.x - 1 && n.y === node.y);
                const hasEast = atlasData.nodes.some(n => n.x === node.x + 1 && n.y === node.y);

                const borderClass =
                  nodeType === 'procedural'
                    ? isSelected ? 'border-emerald-400 bg-emerald-950/90 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-emerald-500/50 bg-[#061816]/95 hover:border-emerald-400'
                    : nodeType === 'hybrid'
                    ? isSelected ? 'border-purple-400 bg-purple-950/90 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-purple-500/50 bg-[#160b24]/95 hover:border-purple-400'
                    : isSelected ? 'border-amber-400 bg-amber-950/90 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'border-amber-500/40 bg-[#0f172a]/95 hover:border-amber-400';

                return (
                  <div
                    key={node.id || `${node.x}_${node.y}`}
                    onClick={() => handleGridClick(node.x, node.y)}
                    onDoubleClick={() => {
                      if (nodeType === 'procedural') {
                        useEditorStore.getState().togglePanel('biome');
                        showToast(`Opened Biome Configurator for ${node.mapId}`);
                      } else {
                        handleWarpToMap(node.mapId, node.id);
                        setStudioMode('voxel');
                        showToast(`Loading 3D Voxel Studio for ${node.mapId}`);
                      }
                    }}
                    className={`absolute w-[70px] h-[70px] m-[1px] rounded-lg flex flex-col items-center justify-center p-1.5 text-center cursor-pointer shadow-xl transition-all group ${
                      isSelected ? 'scale-105 z-10' : ''
                    } border-2 ${borderClass}`}
                    style={{ left: node.x * 72, top: node.y * 72 }}
                    title={`[${nodeType.toUpperCase()}] ${node.mapId} · Double-click to open ${nodeType === 'procedural' ? 'Biome Config' : '3D Voxel Studio'}`}
                  >
                    {/* Neighbor edge indicator pips */}
                    {hasNorth && <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.9)] border border-cyan-100" title="North Connected" />}
                    {hasSouth && <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.9)] border border-cyan-100" title="South Connected" />}
                    {hasWest && <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-300 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.9)] border border-cyan-100" title="West Connected" />}
                    {hasEast && <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-300 rounded-full shadow-[0_0_6px_rgba(34,211,238,0.9)] border border-cyan-100" title="East Connected" />}

                    {getBiomeIcon(node.mapId, isSelected)}
                    <span className="text-[9px] text-slate-200 break-all leading-tight font-bold">
                      {node.mapId}
                    </span>

                    {/* Node class badge */}
                    <div className="text-[7px] uppercase font-bold tracking-wider opacity-75">
                      {nodeType === 'procedural' ? 'PROC' : nodeType === 'hybrid' ? 'HYBR' : 'AUTH'}
                    </div>

                    {node.mapId === lobbyMapId && (
                      <div className="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] bg-emerald-600 text-white font-extrabold rounded-full border border-black shadow-[0_0_8px_rgba(0,0,0,0.8)] [text-shadow:_0_1px_2px_rgb(0_0_0)]" title="Spawn Hub">
                        HUB
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWarpToMap(node.mapId, node.id);
                      }}
                      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-amber-600 text-white hover:bg-amber-500 transition-opacity shadow"
                      title="Teleport to map"
                    >
                      <Navigation className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Context Action Bar when a node is selected */}
          {selectedNode && (
            <div className="flex-none p-3 bg-[#0b1320] border-t border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <MapIcon className="w-4 h-4 text-amber-400" />
                  Selected Node: <span className="text-white">{selectedNode.mapId}</span>
                  <span className="text-[10px] text-slate-500 font-normal">({selectedNode.id})</span>
                </span>
                
                {/* Node Class Selector */}
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-border/40">
                  <label className="text-[10px] text-muted-foreground font-bold">Class:</label>
                  <select
                    value={selectedNode.nodeType || 'authored'}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      const updatedNodes = atlasData.nodes.map(n => n.id === selectedNode.id ? { ...n, nodeType: newType } : n);
                      setAtlasData({ ...atlasData, nodes: updatedNodes });
                      setSelectedNode({ ...selectedNode, nodeType: newType });
                      useEditorStore.getState().markMapDirty();
                    }}
                    className="bg-transparent text-foreground text-[11px] focus:outline-none cursor-pointer font-sans"
                  >
                    <option value="authored" className="bg-[#0b1320] text-amber-400">Authored Fixed Map</option>
                    <option value="procedural" className="bg-[#0b1320] text-emerald-400">Generated Procedural Region</option>
                    <option value="hybrid" className="bg-[#0b1320] text-purple-400">Hybrid Anchor Map</option>
                  </select>
                </div>

                {/* Hybrid Seam Threshold */}
                {(selectedNode.nodeType === 'hybrid') && (
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-purple-500/40 text-[10px]">
                    <span className="text-purple-300 font-bold">Seam:</span>
                    <input
                      type="number"
                      min="2"
                      max="16"
                      value={selectedNode.seamThreshold ?? 4}
                      onChange={(e) => {
                        const val = Math.max(2, Math.min(16, Number(e.target.value)));
                        const updatedNodes = atlasData.nodes.map(n => n.id === selectedNode.id ? { ...n, seamThreshold: val } : n);
                        setAtlasData({ ...atlasData, nodes: updatedNodes });
                        setSelectedNode({ ...selectedNode, seamThreshold: val });
                        useEditorStore.getState().markMapDirty();
                      }}
                      className="w-10 bg-transparent text-white font-mono text-center border-b border-purple-400/50 focus:outline-none"
                    />
                    <span className="text-muted-foreground">blocks</span>
                  </div>
                )}

                <span className="text-slate-400 text-[11px]">
                  Grid Position: [{selectedNode.y}, {selectedNode.x}]
                </span>
                {allMaps.find(m => m.id === selectedNode.mapId) && (
                  <span className="text-amber-400/90 text-[11px] bg-black/40 px-2 py-0.5 rounded border border-amber-500/20">
                    Region: {allMaps.find(m => m.id === selectedNode.mapId)!.name || selectedNode.mapId}
                  </span>
                )}
                {activeConnections && (
                  <div className="flex items-center gap-2 bg-black/50/20 px-2.5 py-1 rounded-lg border border-amber-500/20 text-[10px]">
                    <span className="text-slate-400 font-bold">Adjacency:</span>
                    <span className={activeConnections.north ? 'text-cyan-300 font-bold' : 'text-slate-600'}>N: {activeConnections.north || '—'}</span>
                    <span className={activeConnections.east ? 'text-cyan-300 font-bold' : 'text-slate-600'}>E: {activeConnections.east || '—'}</span>
                    <span className={activeConnections.south ? 'text-cyan-300 font-bold' : 'text-slate-600'}>S: {activeConnections.south || '—'}</span>
                    <span className={activeConnections.west ? 'text-cyan-300 font-bold' : 'text-slate-600'}>W: {activeConnections.west || '—'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(selectedNode.nodeType === 'procedural' || selectedNode.nodeType === 'hybrid') && (
                  <button
                    onClick={() => {
                      useEditorStore.getState().togglePanel('biome');
                      showToast(`Configuring Biome for ${selectedNode.mapId}`);
                    }}
                    className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 font-bold rounded-lg border border-emerald-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                    title="Open Biome Configurator Panel"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Biome Config</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleWarpToMap(selectedNode.mapId, selectedNode.id);
                    setStudioMode('voxel');
                    showToast(`Loaded 3D Voxel Studio for ${selectedNode.mapId}`);
                  }}
                  className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 font-bold rounded-lg border border-amber-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow"
                  title="Open in 3D Voxel Studio canvas"
                >
                  <Castle className="w-3.5 h-3.5 text-amber-400" />
                  <span>3D Voxel Studio</span>
                </button>
                <button
                  onClick={() => handleWarpToMap(selectedNode.mapId, selectedNode.id)}
                  className="px-3 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-cyan-300 font-bold rounded-lg border border-cyan-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Warp to this map in Viewport"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Open in Viewport</span>
                </button>
                <button
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    setLobbyMapId(selectedNode.mapId);
                    useEditorStore.getState().markMapDirty();
                    showToast(`Set ${selectedNode.mapId} as spawn hub`);
                  }}
                  className="px-3 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-emerald-300 font-bold rounded-lg border border-emerald-500/40 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Designate as primary server spawn hub"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Set as Spawn Hub</span>
                </button>
                <button
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    const newNodes = atlasData.nodes.filter(n => n.id !== selectedNode.id && !(n.x === selectedNode.x && n.y === selectedNode.y));
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
    </div>
  );
};

