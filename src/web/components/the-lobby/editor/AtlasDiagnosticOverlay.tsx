'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';
import {
  getClientAtlas,
  getPlacementCacheKey,
  invalidateClientAtlas,
  invalidateMapCache,
} from '../data/maps';
import {
  type AtlasGridData,
  type AtlasNode,
  getAdjacentAtlasNeighbors,
} from '@/shared/game/atlas/spatialAtlas';
import { Compass, RefreshCw, Layers, MapPin, ChevronDown, ChevronUp, Activity, Terminal } from 'lucide-react';

export const AtlasDiagnosticOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [atlas, setAtlas] = useState<AtlasGridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentMapId = useGameStore((s) => s.currentMapId);
  const activeAtlasNodeId = useGameStore((s) => s.activeAtlasNodeId);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const fetchAtlasData = async (force = false) => {
    setIsLoading(true);
    try {
      if (force) {
        invalidateClientAtlas();
      }
      const data = await getClientAtlas(force);
      setAtlas(data);
    } catch (e) {
      console.warn('[AtlasDiagnostic] Failed to fetch atlas:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAtlasData();
    }
  }, [isOpen, currentMapId, activeAtlasNodeId]);

  const activePlacementKey = getPlacementCacheKey(currentMapId, activeAtlasNodeId || undefined);

  return (
    <div className="fixed bottom-12 right-4 z-50 font-mono text-xs select-none pointer-events-auto">
      {/* Minimized / Toggle Bar */}
      <div className="flex items-center gap-1.5 bg-[#0b1320]/95 border border-amber-500/40 rounded-lg p-1.5 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded font-bold transition-all cursor-pointer"
          title="Toggle Atlas Diagnostics Inspector"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span className="text-[11px]">Atlas Inspector</span>
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        <div className="text-[10px] text-slate-400 px-1 border-l border-amber-500/20">
          <span className="text-amber-400 font-bold">{currentMapId}</span>
          {activeAtlasNodeId && (
            <span className="text-cyan-300 ml-1">@{activeAtlasNodeId}</span>
          )}
        </div>
      </div>

      {/* Expanded Diagnostic Modal / Tray */}
      {isOpen && (
        <div className="mt-2 w-[420px] max-h-[500px] bg-[#070e1a]/98 border border-amber-500/40 rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-[#0c1626]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white text-xs">Atlas Diagnostics Payload</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchAtlasData(true)}
                disabled={isLoading}
                className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Force Refresh Atlas State"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  invalidateMapCache();
                  invalidateClientAtlas();
                  fetchAtlasData(true);
                  showToast('Atlas & Placement Caches Invalidated');
                }}
                className="text-[10px] px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded font-bold cursor-pointer"
                title="Wipe map placement and client atlas memory caches"
              >
                Flush Cache
              </button>
            </div>
          </div>

          {/* Active Context */}
          <div className="p-3 bg-black/40 border-b border-amber-500/10 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Active Map:</span>
              <span className="text-amber-300 font-bold">{currentMapId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Node ID:</span>
              <span className="text-cyan-300 font-bold">{activeAtlasNodeId || 'none (unbound)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cache Key:</span>
              <span className="text-emerald-300 font-bold">{activePlacementKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Loaded Chunks:</span>
              <span className="text-slate-200">
                {activeMapData?.chunks ? `${activeMapData.chunks.length} seamless chunks` : 'Monolithic (1)'}
              </span>
            </div>
          </div>

          {/* Placed Nodes & Topology */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar text-[10px]">
            <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
              <span>Atlas Topology</span>
              <span>{atlas?.nodes?.length || 0} Nodes Placed</span>
            </div>

            {!atlas || !atlas.nodes || atlas.nodes.length === 0 ? (
              <div className="text-slate-500 text-center py-4">No nodes placed in Atlas</div>
            ) : (
              atlas.nodes.map((node: AtlasNode) => {
                const isCurrent = activeAtlasNodeId
                  ? node.id === activeAtlasNodeId
                  : node.mapId === currentMapId;
                const neighbors = getAdjacentAtlasNeighbors(atlas, node);

                return (
                  <div
                    key={node.id}
                    className={`p-2 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-amber-950/40 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-[#0a1220]/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        <MapPin className={`w-3 h-3 ${isCurrent ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span className={isCurrent ? 'text-amber-300' : 'text-slate-200'}>
                          {node.mapId}
                        </span>
                        <span className="text-slate-500 font-normal">({node.id})</span>
                      </div>
                      <span className="text-cyan-400">
                        [{node.x}, {node.y}]
                      </span>
                    </div>

                    {/* Cardinal Neighbors */}
                    <div className="grid grid-cols-2 gap-1 mt-1.5 text-[9px] bg-black/30 p-1.5 rounded border border-white/5">
                      <div>
                        <span className="text-slate-500">N: </span>
                        {neighbors.north ? (
                          <span className="text-cyan-300 font-semibold">{neighbors.north.mapId} <span className="text-slate-500">({neighbors.north.id})</span></span>
                        ) : (
                          <span className="text-slate-600">none</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">S: </span>
                        {neighbors.south ? (
                          <span className="text-cyan-300 font-semibold">{neighbors.south.mapId} <span className="text-slate-500">({neighbors.south.id})</span></span>
                        ) : (
                          <span className="text-slate-600">none</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">E: </span>
                        {neighbors.east ? (
                          <span className="text-cyan-300 font-semibold">{neighbors.east.mapId} <span className="text-slate-500">({neighbors.east.id})</span></span>
                        ) : (
                          <span className="text-slate-600">none</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">W: </span>
                        {neighbors.west ? (
                          <span className="text-cyan-300 font-semibold">{neighbors.west.mapId} <span className="text-slate-500">({neighbors.west.id})</span></span>
                        ) : (
                          <span className="text-slate-600">none</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
