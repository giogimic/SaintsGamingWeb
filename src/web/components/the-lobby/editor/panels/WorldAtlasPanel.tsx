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
          setAtlasData(typeof data.atlas.atlasData === 'string' ? JSON.parse(data.atlas.atlasData) : data.atlas.atlasData);
          setLobbyMapId(data.atlas.lobbyMapId || 'LOBBY');
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
      if (res.ok) {
        showToast('Atlas saved successfully.');
      } else {
        showToast('Failed to save atlas.');
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
    <div className="flex flex-col h-full text-xs font-mono space-y-4">
      <div className="flex-none p-3 border-b border-[#806f47]/30 bg-[#0b1320]/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[#cbb26a] flex items-center gap-1.5">
            <MapIcon className="w-4 h-4" />
            Macro World Atlas
          </div>
          <button
            onClick={() => void handleSaveAtlas()}
            disabled={isSaving}
            className="px-3 py-1 bg-[#cbb26a] text-black font-bold rounded flex items-center gap-1 hover:bg-[#d8c078] disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Atlas'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-slate-400">Lobby Map ID:</label>
          <select 
            value={lobbyMapId}
            onChange={(e) => setLobbyMapId(e.target.value)}
            className="bg-[#050b14] border border-slate-700 rounded px-2 py-1 text-slate-200"
          >
            {allMaps.map(m => (
              <option key={m.id} value={m.id}>{m.id}</option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500 ml-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Players spawn here initially
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Map Palette */}
        <div className="w-64 flex-none border-r border-[#806f47]/30 bg-[#0b1320]/40 flex flex-col">
          <div className="p-2 border-b border-[#806f47]/30 font-bold text-slate-300">
            Available Maps
          </div>
          <div className="p-2 text-[10px] text-slate-500">
            Select a map, then click on the grid to place it.
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {allMaps.map(m => {
              const isSelected = selectedMapIdToPlace === m.id;
              const isPlaced = atlasData.nodes.some(n => n.mapId === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMapIdToPlace(isSelected ? null : m.id)}
                  className={`w-full text-left px-2 py-1.5 rounded border ${
                    isSelected 
                      ? 'bg-[#cbb26a]/20 border-[#cbb26a] text-[#cbb26a]' 
                      : 'border-slate-800 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{m.id}</span>
                    {isPlaced && <span className="text-[9px] text-emerald-500">Placed</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Grid Area */}
        <div className="flex-1 overflow-auto bg-[#050b14] p-4 relative custom-scrollbar">
          <div 
            className="relative" 
            style={{ 
              width: GRID_SIZE * 64, 
              height: GRID_SIZE * 64,
              backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
              backgroundSize: '64px 64px'
            }}
          >
            {/* Grid cells hitboxes */}
            {Array.from({ length: GRID_SIZE }).map((_, y) => 
              Array.from({ length: GRID_SIZE }).map((_, x) => (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleGridClick(x, y)}
                  className={`absolute w-[64px] h-[64px] border border-transparent hover:border-slate-500 cursor-pointer ${
                    selectedMapIdToPlace ? 'hover:bg-[#cbb26a]/10' : ''
                  }`}
                  style={{ left: x * 64, top: y * 64 }}
                />
              ))
            )}

            {/* Placed Nodes */}
            {atlasData.nodes.map((node) => (
              <div
                key={node.mapId}
                onClick={() => handleGridClick(node.x, node.y)}
                className="absolute w-[62px] h-[62px] m-[1px] bg-[#1e293b] border-2 border-[#806f47] rounded flex items-center justify-center p-1 text-center hover:border-rose-500 cursor-pointer"
                style={{ left: node.x * 64, top: node.y * 64 }}
                title="Click to remove"
              >
                <span className="text-[9px] text-slate-200 break-all leading-tight">
                  {node.mapId}
                </span>
                {node.mapId === lobbyMapId && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-black" title="Lobby Map" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
