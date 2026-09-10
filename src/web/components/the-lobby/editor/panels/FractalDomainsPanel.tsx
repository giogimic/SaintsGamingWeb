'use client';

import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import { Globe, Plus, Trash2, Settings, HelpCircle, ArrowUpRight, Flame, Mountain, Trees, Waves } from 'lucide-react';
import { MapIndexEntry } from '@/shared/game/maps';
import { WindowMenuBar, WindowMenuDropdown, WindowMenuButton } from '../WindowMenuBar';

function getBiomeIcon(mapId: string) {
  const lower = mapId.toLowerCase();
  const cls = "w-4 h-4 text-emerald-400";
  if (lower.includes('forest') || lower.includes('wood')) return <Trees className={cls} />;
  if (lower.includes('water') || lower.includes('sea') || lower.includes('ocean')) return <Waves className={cls} />;
  if (lower.includes('cave') || lower.includes('mountain')) return <Mountain className={cls} />;
  if (lower.includes('volcano') || lower.includes('fire')) return <Flame className={cls} />;
  return <Globe className={cls} />;
}

export const FractalDomainsPanel: React.FC = () => {
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const showToast = useGameStore((state) => state.showToast);

  const [isLoading, setIsLoading] = useState(true);
  const [fractalMaps, setFractalMaps] = useState<MapIndexEntry[]>([]);
  const [voxelMaps, setVoxelMaps] = useState<MapIndexEntry[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStructId, setNewStructId] = useState('');
  const [newStructWeight, setNewStructWeight] = useState(1);
  const [newStructYOffset, setNewStructYOffset] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchMaps = async () => {
      try {
        const res = await fetch('/api/maps');
        if (res.ok && active) {
          const data = await res.json();
          if (data && data.maps) {
            const fractals = data.maps.filter((m: any) => m.mapType === 'FRACTAL');
            const voxels = data.maps.filter((m: any) => m.mapType === 'VOXEL');
            setFractalMaps(fractals);
            setVoxelMaps(voxels);
          }
        }
      } catch (e) {
        console.error('Failed to load fractal maps', e);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchMaps();
    return () => { active = false; };
  }, []);

  const handleWarpToMap = (mapId: string) => {
    // Basic warp for infinite maps
    const activeMap = useGameStore.getState().currentMapId;
    if (activeMap === mapId) {
      showToast(`Already in Fractal Domain: ${mapId}`);
      return;
    }
    useGameStore.getState().emitSocketEvent('join_map', {
      accountId: useGameStore.getState().sessionInfo?.accountId,
      characterId: useGameStore.getState().sessionInfo?.characterId,
      mapId,
      lobby: false,
      forceDemo: false,
      joinSeq: Date.now(),
    });
    showToast(`Warping to Fractal Domain: ${mapId}`);
  };

  const selectedMap = fractalMaps.find((m) => m.id === selectedMapId);

  const handleSaveDomain = async (updates: Partial<any>) => {
    if (!selectedMap) return;
    try {
      const res = await fetch(`/api/maps/${encodeURIComponent(selectedMap.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        showToast('Domain settings saved');
        const updated = await res.json();
        // Update local state
        setFractalMaps(prev => prev.map(m => m.id === selectedMap.id ? { ...m, ...updated.map } : m));
      } else {
        showToast('Failed to save domain');
      }
    } catch (e) {
      showToast('Network error saving domain');
    }
  };

  const handleAddStructure = () => {
    if (!selectedMap || !newStructId) return;
    const currentStructs = selectedMap.proceduralStructures || [];
    const newStructs = [...currentStructs, {
      voxelMapId: newStructId,
      spawnWeight: newStructWeight,
      yOffset: newStructYOffset
    }];
    handleSaveDomain({ proceduralStructures: newStructs });
    setIsModalOpen(false);
    setNewStructId('');
    setNewStructWeight(1);
    setNewStructYOffset(0);
  };

  const handleRemoveStructure = (idx: number) => {
    if (!selectedMap) return;
    const currentStructs = selectedMap.proceduralStructures || [];
    const newStructs = [...currentStructs];
    newStructs.splice(idx, 1);
    handleSaveDomain({ proceduralStructures: newStructs });
  };

  if (isLoading) {
    return <div className="p-4 text-xs text-slate-400">Loading Fractal Domains...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 text-xs font-mono bg-[#070d18] select-none -m-3 mb-0">
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Fractal"
          icon={Globe}
          items={[
            {
              label: 'New Fractal Domain...',
              icon: Plus,
              onClick: () => {
                useEditorStore.getState().openPanel('newFractalMap');
              }
            }
          ]}
        />
        <WindowMenuButton
          label="Help"
          icon={HelpCircle}
          onClick={() => showToast('Fractal Domains are infinite procedural regions separated from the finite World Atlas.')}
        />
      </WindowMenuBar>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: List of Domains */}
        <div className="w-[300px] border-r border-border/50 bg-[#0a1424] flex flex-col shrink-0">
          <div className="p-2 border-b border-border/50 bg-black/40 font-bold text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> FRACTAL DOMAINS</span>
            <span className="text-[10px] text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-950">{fractalMaps.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {fractalMaps.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMapId(m.id)}
                className={`p-2 rounded cursor-pointer border transition-colors flex items-center gap-2 ${
                  selectedMapId === m.id
                    ? 'bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-[#0f1b2d] border-transparent hover:border-emerald-500/30'
                }`}
              >
                {getBiomeIcon(m.id)}
                <div className="flex flex-col overflow-hidden">
                  <span className={`truncate font-bold ${selectedMapId === m.id ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {m.name || m.id}
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">{m.id}</span>
                </div>
              </div>
            ))}
            {fractalMaps.length === 0 && (
              <div className="text-center p-4 text-slate-500 italic">No Fractal Domains exist.</div>
            )}
          </div>
        </div>

        {/* Right Area: Domain Details */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#070d18]">
          {selectedMap ? (
            <div className="p-6 overflow-y-auto w-full h-full custom-scrollbar">
              <div className="flex items-start justify-between mb-8 border-b border-border/30 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400 mb-1 flex items-center gap-2">
                    {getBiomeIcon(selectedMap.id)} {selectedMap.name || selectedMap.id}
                  </h2>
                  <p className="text-slate-400">ID: {selectedMap.id}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleWarpToMap(selectedMap.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded transition-colors font-bold"
                  >
                    <ArrowUpRight className="w-4 h-4" /> Teleport to Domain
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Deleting Fractal Domains is not fully implemented yet.`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>

              <div className="max-w-2xl space-y-6">
                <div className="p-4 bg-[#0a1424] rounded-lg border border-border/50">
                  <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-400" /> Domain Generation Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 p-3 rounded border border-border/30">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Topology Map Type</span>
                      <span className="text-emerald-300 font-bold">{selectedMap.mapType}</span>
                    </div>
                    <div className="bg-black/30 p-3 rounded border border-border/30">
                      <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Authoring Mode</span>
                      <span className="text-purple-300 font-bold">Infinite Procedural</span>
                    </div>
                    <div className="col-span-2 bg-black/30 p-3 rounded border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Voxel Structures Injection</span>
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded text-[10px] transition-colors"
                        >
                          + Add Structure
                        </button>
                      </div>
                      <div className="text-slate-300 text-[11px] leading-relaxed mb-3">
                        Authored VOXEL maps that spawn procedurally in this fractal domain.
                      </div>
                      
                      {selectedMap.proceduralStructures && selectedMap.proceduralStructures.length > 0 ? (
                        <div className="space-y-1">
                          {selectedMap.proceduralStructures.map((struct: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-black/40 p-2 rounded border border-border/20">
                              <div className="flex items-center gap-2">
                                <Mountain className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-300 font-bold">{struct.voxelMapId}</span>
                                <span className="text-slate-500 text-[10px]">Weight: {struct.spawnWeight} | Y-Offset: {struct.yOffset || 0}</span>
                              </div>
                              <button onClick={() => handleRemoveStructure(idx)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-[11px] p-2 bg-black/20 rounded border border-border/10">No structures injected.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-900/10 rounded-lg border border-amber-500/20">
                  <h3 className="text-sm font-bold text-amber-500/80 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Atlas Separation Notice
                  </h3>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    This domain is completely separate from the finite World Atlas. It does not occupy space on the 2D grid and can only be accessed via Gateways, teleports, or the Studio.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select a Fractal Domain to view and manage its settings.
            </div>
          )}

          {/* Add Structure Modal */}
          {isModalOpen && selectedMap && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-[#0a1424] border border-emerald-500/30 p-6 rounded-lg shadow-2xl max-w-md w-full">
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Voxel Structure
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[10px] uppercase">Select Voxel Map</label>
                    <select
                      value={newStructId}
                      onChange={(e) => setNewStructId(e.target.value)}
                      className="w-full bg-black/40 border border-border/50 rounded p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Choose Map --</option>
                      {voxelMaps.map(m => (
                        <option key={m.id} value={m.id}>{m.name || m.id} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px] uppercase">Spawn Weight</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={newStructWeight}
                        onChange={(e) => setNewStructWeight(parseFloat(e.target.value) || 1)}
                        className="w-full bg-black/40 border border-border/50 rounded p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                        title="Probability weight relative to other features"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px] uppercase">Y-Offset</label>
                      <input
                        type="number"
                        step="1"
                        value={newStructYOffset}
                        onChange={(e) => setNewStructYOffset(parseInt(e.target.value) || 0)}
                        className="w-full bg-black/40 border border-border/50 rounded p-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
                        title="Blocks to shift up/down from the surface"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddStructure}
                    disabled={!newStructId}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Structure
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
