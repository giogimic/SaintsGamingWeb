'use client';

import React, { useState } from 'react';
import { DraggablePanel } from '../DraggablePanel';
import { TerrainBrushPalette } from './TerrainBrushPalette';
import { SelectionPanel } from './SelectionPanel';
import { TransformPanel } from './TransformPanel';
import { Brush, MousePointer2, RotateCw } from 'lucide-react';

export const VoxelTerrainBrushPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BRUSH' | 'SELECT' | 'TRANSFORM'>('BRUSH');

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200 w-[340px]">
      
      {/* Navigation Tabs */}
      <div className="flex bg-[#0a1628]/80 border-b border-border/40 p-1">
        <button
          onClick={() => setActiveTab('BRUSH')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'BRUSH'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <Brush className="w-3.5 h-3.5" />
          <span>Brush</span>
        </button>
        
        <button
          onClick={() => setActiveTab('SELECT')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'SELECT'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Select</span>
        </button>
        
        <button
          onClick={() => setActiveTab('TRANSFORM')}
          className={`flex-1 py-1.5 px-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'TRANSFORM'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Transform</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'BRUSH' && <TerrainBrushPalette />}
        {activeTab === 'SELECT' && <div className="p-3"><SelectionPanel /></div>}
        {activeTab === 'TRANSFORM' && <div className="p-3"><TransformPanel /></div>}
      </div>
      
    </div>
  );
};
