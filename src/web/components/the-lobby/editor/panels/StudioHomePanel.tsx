import React from 'react';
import { DraggablePanel } from '../DraggablePanel';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';

export const StudioHomePanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels['studioHome']?.isOpen);
  const closePanel = useEditorStore((s) => s.closePanel);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  
  if (!isOpen) return null;

  return (
    <DraggablePanel
      id="studioHome"
      title="Saints Studio"
    >
      <div className="flex flex-col h-full bg-[#050811] overflow-hidden p-6 text-slate-300">
        <h2 className="text-2xl font-bold mb-4 sg-text-gradient">Welcome to Saints Studio</h2>
        <p className="mb-8 text-sm text-slate-400">
          This is your workspace for world-building, asset management, and game logic. 
          Select a tool to get started.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setStudioMode('tile')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-slate-900/50 hover:bg-white/5 hover:border-amber-500/50 transition-all"
          >
            <span className="text-lg font-semibold text-slate-200">Tile Mode</span>
            <span className="text-xs text-slate-500 text-center mt-2">Edit 2D maps and layers</span>
          </button>
          
          <button 
            onClick={() => setStudioMode('voxel')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-slate-900/50 hover:bg-white/5 hover:border-amber-500/50 transition-all"
          >
            <span className="text-lg font-semibold text-slate-200">Voxel Mode</span>
            <span className="text-xs text-slate-500 text-center mt-2">Sculpt 3D terrain and environments</span>
          </button>

          <button 
            onClick={() => setStudioMode('assets')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-slate-900/50 hover:bg-white/5 hover:border-amber-500/50 transition-all"
          >
            <span className="text-lg font-semibold text-slate-200">Asset Suite</span>
            <span className="text-xs text-slate-500 text-center mt-2">Upload and manage game assets</span>
          </button>
          
          <button 
            onClick={() => setStudioMode('hero')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-slate-900/50 hover:bg-white/5 hover:border-amber-500/50 transition-all"
          >
            <span className="text-lg font-semibold text-slate-200">Hero Studio</span>
            <span className="text-xs text-slate-500 text-center mt-2">Configure classes and archetypes</span>
          </button>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default StudioHomePanel;
