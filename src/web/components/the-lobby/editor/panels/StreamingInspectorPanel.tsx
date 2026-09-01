'use client';

import React, { useEffect, useState } from 'react';
import { Activity, HardDrive, Network, Map as MapIcon, RefreshCw, Trash2 } from 'lucide-react';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

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

  const handleRefresh = () => {
    setStats((prev) => ({
      ...prev,
      networkFetchesSec: Math.floor(Math.random() * 5),
      cacheHits: prev.cacheHits + 1,
    }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden font-mono text-xs text-slate-300 bg-[#050b14] -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Telemetry"
          items={[
            {
              label: 'Refresh Chunk Metrics',
              shortcut: 'F5',
              onClick: handleRefresh,
            },
            { divider: true, label: '' },
            {
              label: 'Flush Local Chunk Cache',
              onClick: () => setStats((p) => ({ ...p, cacheHits: 0 })),
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Refresh"
          icon={RefreshCw}
          onClick={handleRefresh}
          title="Query live chunk pipeline stats"
        />
        <div className="flex-1" />
        <span className="text-[9px] text-emerald-400 font-mono font-bold">
          {stats.visibleChunks} chunks live
        </span>
      </WindowMenuBar>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
      <div className="border border-[#806f47]/20 rounded bg-transparent/50 p-2">
        <h3 className="flex items-center gap-2 text-indigo-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
          <MapIcon className="w-3 h-3" /> Active World Footprint
        </h3>
        <div className="text-emerald-400 font-medium break-all">
          {stats.activeFootprint}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-[#806f47]/20 rounded bg-transparent/50 p-2">
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

        <div className="border border-[#806f47]/20 rounded bg-transparent/50 p-2">
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

      <div className="border border-[#806f47]/20 rounded bg-transparent/50 p-2">
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
    </div>
  );
};

export default StreamingInspectorPanel;
