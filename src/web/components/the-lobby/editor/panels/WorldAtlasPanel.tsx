'use client';

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { Save, Map as MapIcon, Plus, Trash2, Crosshair, HelpCircle } from 'lucide-react';
import { MapIndexEntry } from '../../data/maps';

export interface AtlasNode {
  mapId: string;
  x: number;
  y: number;
}

export interface WorldAtlasData {
  nodes: AtlasNode[];
  edges: any[];
  bufferPresets: any[];
  options: {
    defaultZoneSize: { w: number; h: number };
    bufferSize: { w: number; h: number };
    softTransition: boolean;
    zeroFade: boolean;
    renderNeighborStripTiles: number;
  };
}

export const WorldAtlasPanel: React.FC = () => {
  const activeGameId = useEditorStore((state) => state.activeGameId);
  const showToast = useGameStore((state) => state.showToast);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [atlasData, setAtlasData] = useState<WorldAtlasData | null>(null);
  const [lobbyMapId, setLobbyMapId] = useState<string>('LOBBY');
  
  const [allMaps, setAllMaps] = useState<MapIndexEntry[]>([]);
  const [selectedMapIdToPlace, setSelectedMapIdToPlace] = useState<string | null>(null);

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
            setAtlasData(parsedAtlas || { nodes: [], edges: [] });
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

  const handleSaveAtlas = async () => {
    if (!atlasData) return;
    setIsSaving(true);
    try {
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
    if (!atlasData) return;
    
    // Check if cell is occupied
    const existingNodeIdx = atlasData.nodes.findIndex(n => n.x === x && n.y === y);
    
    // If placing
    if (selectedMapIdToPlace) {
      const newNodes = [...atlasData.nodes];
      if (existingNodeIdx >= 0) {
        newNodes[existingNodeIdx] = { mapId: selectedMapIdToPlace, x, y };
      } else {
        newNodes.push({ mapId: selectedMapIdToPlace, x, y });
      }
      setAtlasData({ ...atlasData, nodes: newNodes });
      setSelectedMapIdToPlace(null);
    } else {
      // If clicking existing without placement selected, we could remove it or select it
      if (existingNodeIdx >= 0) {
        if (confirm(`Remove map ${atlasData.nodes[existingNodeIdx].mapId} from atlas?`)) {
          const newNodes = [...atlasData.nodes];
          newNodes.splice(existingNodeIdx, 1);
          setAtlasData({ ...atlasData, nodes: newNodes });
        }
      }
    }
  };

  if (isLoading || !atlasData) {
    return <div className="p-4 text-xs text-slate-400">Loading World Atlas...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 text-xs font-mono bg-[#070d18] select-none">
      <div className="flex-none p-3 border-b border-[#806f47]/30 bg-[#0b1320]/80 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-4">
          <div className="font-bold text-[#cbb26a] flex items-center gap-1.5 text-sm">
            <MapIcon className="w-4 h-4 text-[#eab308]" />
            Macro World Atlas
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-[11px]">Spawn / Hub Map:</label>
            <select 
              value={lobbyMapId}
              onChange={(e) => setLobbyMapId(e.target.value)}
              className="bg-[#050b14] border border-[#806f47]/40 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-[#cbb26a]"
            >
              {allMaps.map(m => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => void handleSaveAtlas()}
          disabled={isSaving}
          className="px-3 py-1.5 bg-[#cbb26a] text-black font-bold rounded flex items-center gap-1.5 hover:bg-[#d8c078] active:scale-95 transition-all shadow-md disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving...' : 'Save Atlas'}
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: Map Palette */}
        <div className="w-64 flex-none border-r border-[#806f47]/30 bg-[#0b1320]/50 flex flex-col min-h-0">
          <div className="p-2.5 border-b border-[#806f47]/30 font-bold text-slate-200 flex items-center justify-between">
            <span>Available Maps</span>
            <span className="text-[10px] text-slate-500 font-normal">{allMaps.length} maps</span>
          </div>
          <div className="p-2 text-[10px] text-slate-400 bg-black/20 border-b border-white/5">
            Select a map below, then click a grid cell to connect it.
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {allMaps.map(m => {
              const isSelected = selectedMapIdToPlace === m.id;
              const isPlaced = atlasData.nodes.some(n => n.mapId === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMapIdToPlace(isSelected ? null : m.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition-all ${
                    isSelected 
                      ? 'bg-[#cbb26a]/25 border-[#cbb26a] text-white shadow-lg' 
                      : isPlaced
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40'
                      : 'border-slate-800/80 bg-black/20 text-slate-400 hover:bg-white/5 hover:text-slate-200'
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
        <div className="flex-1 min-h-0 overflow-auto bg-[#050b14] p-6 relative custom-scrollbar">
          <div 
            className="relative rounded border border-[#806f47]/30 shadow-2xl" 
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
                    selectedMapIdToPlace ? 'hover:bg-[#cbb26a]/15' : ''
                  }`}
                  style={{ left: x * 72, top: y * 72 }}
                />
              ))
            )}

            {/* Placed Nodes */}
            {atlasData.nodes.map((node) => (
              <div
                key={node.mapId}
                onClick={() => handleGridClick(node.x, node.y)}
                className="absolute w-[70px] h-[70px] m-[1px] bg-[#0f172a]/95 border-2 border-[#cbb26a] rounded-lg flex flex-col items-center justify-center p-1.5 text-center hover:border-rose-500 hover:bg-rose-950/40 cursor-pointer shadow-xl transition-all group"
                style={{ left: node.x * 72, top: node.y * 72 }}
                title="Click to remove or edit location"
              >
                <MapIcon className="w-4 h-4 text-[#cbb26a] group-hover:text-rose-400 mb-0.5" />
                <span className="text-[9px] text-slate-200 break-all leading-tight font-bold group-hover:text-rose-200">
                  {node.mapId}
                </span>
                {node.mapId === lobbyMapId && (
                  <div className="absolute -top-1 -right-1 px-1 py-0.2 text-[8px] bg-emerald-500 text-black font-extrabold rounded-full border border-black" title="Spawn Hub">
                    HUB
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
