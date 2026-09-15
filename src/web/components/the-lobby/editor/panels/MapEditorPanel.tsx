'use client';

import React, { useState } from 'react';
import { Layers, Grid3X3, Globe } from 'lucide-react';
import { VoxelMapBrowserView } from './VoxelMapBrowserView';
import { TileMapBrowserView } from './TileMapBrowserView';
import { FractalDomainsView } from './FractalDomainsView';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';

type MapEditorTab = 'VOXEL' | 'TILE' | 'FRACTAL';

export const MapEditorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MapEditorTab>('VOXEL');
  const activeGameId = useEditorStore((s) => s.activeGameId);
  
  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 font-mono select-none overflow-hidden">
      {/* ── HEADER TABS ── */}
      <div className="flex items-center shrink-0 border-b border-border/20 bg-black/60 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('VOXEL')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-colors ${
            activeTab === 'VOXEL' 
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          Voxel Maps
        </button>
        <button
          onClick={() => setActiveTab('TILE')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-colors ${
            activeTab === 'TILE' 
              ? 'border-blue-500 text-blue-400 bg-blue-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          Tile Maps
        </button>
        <button
          onClick={() => setActiveTab('FRACTAL')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-colors ${
            activeTab === 'FRACTAL' 
              ? 'border-purple-500 text-purple-400 bg-purple-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          Fractal Domains
        </button>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'VOXEL' && <VoxelMapBrowserView />}
        {activeTab === 'TILE' && <TileMapBrowserView />}
        {activeTab === 'FRACTAL' && <FractalDomainsView />}
      </div>
    </div>
  );
};
