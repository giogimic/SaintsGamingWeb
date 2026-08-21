'use client';

import React, { useEffect, useState } from 'react';
import { Activity, HardDrive, Network, Map as MapIcon } from 'lucide-react';
// import { getCachedContentChunk } from '@/shared/game/chunkCache'; // Future integration
// import { useEditorStore } from '../editor-store'; // Future integration

export const StreamingInspectorPanel: React.FC = () => {
  // Mock data for Phase 1 UI setup
  const [stats, setStats] = useState({
    visibleChunks: 9,
    loadingChunks: 0,
    evictingChunks: 0,
    networkFetchesSec: 0,
    cacheHits: 0,
    chunkBuildMs: 12,
    activeFootprint: 'DEMO_SANDBOX'
  });

  // Future: Effect to poll or subscribe to chunkCache / BabylonEngine events

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 font-mono text-xs text-slate-300 gap-4 bg-[#050b14]">
      <div className="border border-slate-800 rounded bg-slate-900/50 p-2">
        <h3 className="flex items-center gap-2 text-indigo-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
          <MapIcon className="w-3 h-3" /> Active World Footprint
        </h3>
        <div className="text-emerald-400 font-medium break-all">
          {stats.activeFootprint}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-slate-800 rounded bg-slate-900/50 p-2">
          <h3 className="flex items-center gap-2 text-sky-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
            <Activity className="w-3 h-3" /> Streaming
          </h3>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">Visible</span>
            <span className="text-white">{stats.visibleChunks}</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">Loading</span>
            <span className="text-amber-400">{stats.loadingChunks}</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">Evicting</span>
            <span className="text-red-400">{stats.evictingChunks}</span>
          </div>
        </div>

        <div className="border border-slate-800 rounded bg-slate-900/50 p-2">
          <h3 className="flex items-center gap-2 text-fuchsia-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
            <Network className="w-3 h-3" /> Network
          </h3>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">Fetches/s</span>
            <span className="text-white">{stats.networkFetchesSec}</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-500">Cache Hits</span>
            <span className="text-emerald-400">{stats.cacheHits}</span>
          </div>
        </div>
      </div>

      <div className="border border-slate-800 rounded bg-slate-900/50 p-2">
        <h3 className="flex items-center gap-2 text-amber-500 font-semibold mb-2 uppercase tracking-wider text-[10px]">
          <HardDrive className="w-3 h-3" /> Rendering
        </h3>
        <div className="flex justify-between items-center py-0.5">
          <span className="text-slate-500">Chunk Build Time</span>
          <span className="text-white">{stats.chunkBuildMs} ms</span>
        </div>
      </div>
      
      <div className="text-[10px] text-slate-500 italic px-1">
        * Hooked up to mock data for Phase 1 setup. Engine integration pending.
      </div>
    </div>
  );
};

export default StreamingInspectorPanel;
