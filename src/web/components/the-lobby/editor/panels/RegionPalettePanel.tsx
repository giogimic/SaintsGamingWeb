'use client';

import React from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';

// A predefined set of Region IDs (1-255).
const REGIONS = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `Region ${i + 1}`,
  color: `hsl(${i * 25}, 70%, 50%)`
}));

export const RegionPalettePanel: React.FC = () => {
  const activeRegionId = useEditorStore((s) => s.activeLogicTileId); // We can reuse logic ID or create a new activeRegionId. Using logic ID for now.
  const setActiveRegionId = useEditorStore((s) => s.setActiveLogicTileId);
  const showToast = useGameStore((s) => s.showToast);

  return (
    <div className="flex flex-col h-full bg-[#050b14]/50 border border-border/40 rounded overflow-hidden">
      <div className="p-2 border-b border-border/30 bg-[#081222]/80">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Regions (1-255)</h3>
        <p className="text-[9px] text-muted-foreground mt-1">Select a region ID to paint encounter zones, music triggers, etc.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <div className="grid grid-cols-4 gap-1.5">
          {REGIONS.map((region) => {
            const isSelected = activeRegionId === region.id;
            return (
              <button
                key={region.id}
                onClick={() => {
                  setActiveRegionId(region.id);
                  showToast(`Selected Region ${region.id}`);
                }}
                className={`flex flex-col items-center justify-center p-2 rounded border cursor-pointer transition-all ${
                  isSelected ? 'border-primary bg-primary/20 shadow-[0_0_8px_rgba(var(--primary),0.5)]' : 'border-border/40 bg-black/40 hover:bg-white/5 hover:border-white/20'
                }`}
                title={region.name}
              >
                <div 
                  className="w-4 h-4 rounded-sm mb-1" 
                  style={{ backgroundColor: region.color }} 
                />
                <span className="text-[9px] text-foreground font-mono">{region.id}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-2 text-[10px] text-muted-foreground border-t border-border/30 bg-[#081222]/80 flex justify-between items-center">
        <span>Selected Region: <span className="text-primary font-bold">{activeRegionId}</span></span>
      </div>
    </div>
  );
};
