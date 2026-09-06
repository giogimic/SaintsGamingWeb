'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import {
  Compass,
  X,
  Globe,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { SheetSlicerPanel } from './SheetSlicerPanel';
import { TilePalettePanel } from './TilePalettePanel';
import { RegionPalettePanel } from './RegionPalettePanel';
import { REGION_LAYER_IDX, LOGIC_LAYER_IDX } from '@/shared/game/tilePaint';

export const TileStudioPanel: React.FC = () => {
  const currentMapId = useGameStore((state) => state.currentMapId);
  const activeMapData = useGameStore((state) => state.activeMapData);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const activeLayerIdx = useEditorStore((state) => state.activeLayerIdx);
  const [isSheetSlicerOpen, setIsSheetSlicerOpen] = useState(false);

  const baseMapId = typeof currentMapId === 'string' ? currentMapId.replace(/_.*/, '') : '';

  return (
    <div className="space-y-3 text-xs font-mono select-none -m-3 mb-0">
      <div className="p-3 space-y-3">
        
        {/* Active Realm Info */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg flex items-center justify-between p-2.5">
          <div className="flex items-center gap-1.5 text-[#cbb26a] font-bold">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="truncate">Realm: {baseMapId || currentMapId}</span>
          </div>
          <button
            type="button"
            onClick={() => setStudioMode('atlas')}
            className="flex items-center gap-1 text-[10px] text-amber-400/90 hover:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded-lg transition-all cursor-pointer shrink-0"
            title="Open Atlas Studio"
          >
            <Globe className="w-3 h-3 text-amber-400" />
            <span>Atlas</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Prop Sheet Slicer Toggle */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
           <button
            type="button"
            onClick={() => setIsSheetSlicerOpen(!isSheetSlicerOpen)}
            className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-purple-400 font-bold hover:bg-black/50/20 transition-colors cursor-pointer"
          >
            <span>Prop Sheet Slicer</span>
            {isSheetSlicerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {isSheetSlicerOpen && (
            <div className="p-2 border-t border-[#806f47]/20 bg-[#050b14]/50 relative">
              <SheetSlicerPanel />
            </div>
          )}
        </div>

        {/* Tile / Region Palette */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg flex flex-col h-[500px]">
          <div className="flex items-center justify-between p-2.5 bg-black/50/40 text-purple-400 font-bold border-b border-[#806f47]/20 shrink-0">
            <span>{activeLayerIdx === REGION_LAYER_IDX ? 'Region Palette' : activeLayerIdx === LOGIC_LAYER_IDX ? 'Logic Palette' : 'Tile Palette'}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeLayerIdx === REGION_LAYER_IDX ? <RegionPalettePanel /> : <TilePalettePanel />}
          </div>
        </div>

      </div>
    </div>
  );
};
