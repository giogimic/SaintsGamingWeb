'use client';

import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import {
  Compass,
  ChevronDown,
  ChevronRight,
  Box,
  Sparkles,
  Layers,
  Save,
  ArrowUpRight,
  Globe,
  Plus,
  Brush,
  Trash2,
  Lock,
  Unlock,
  ListRestart
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { STUDIO_TRIGGER_SAVE_MAP_EVENT } from '@/shared/game/studioEvents';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { TerrainBrushPalette } from './TerrainBrushPalette';

export const VoxelStudioPanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const currentMapId = useGameStore((s) => s.currentMapId);
  const isMapDirty = useEditorStore((state) => state.mapDirty);
  const isSaving = useEditorStore((state) => state.isSavingMap);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const voxelBlockSizePx = useEditorStore((state) => state.voxelBlockSizePx);
  const showToast = useGameStore((s) => s.showToast);

  const baseMapId = activeMapData?.baseMapId;
  const currentMapData = activeMapData || { id: currentMapId, encounterPool: [], tileLayers: [], tilesets: [] };

  const [openSections, setOpenSections] = useState({
    overview: true,
    brush: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    soundSynth?.playUiClick?.();
  };



  if (!activeMapData) {
    return <div className="p-4 text-slate-500 font-bold text-center">No Realm Loaded</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-200">
      {/* MAC-STYLE MENU BAR */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Map"
          items={[
            {
              label: 'Save Map Data',
              icon: Save,
              shortcut: 'Ctrl+S',
              onClick: () => {
                if (!isSaving && activeMapData) {
                  window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                }
              },
            },
            { divider: true, label: '' },
            {
              label: 'Open Atlas Studio',
              icon: Globe,
              shortcut: 'Ctrl+Shift+M',
              onClick: () => setStudioMode('atlas'),
            },
          ]}
        />

        <WindowMenuDivider />
        <div className="flex-1" />
        <WindowMenuButton
          label={isSaving ? 'Saving...' : isMapDirty ? 'Save*' : 'Saved'}
          icon={Save}
          active={isMapDirty}
          onClick={() => {
            if (!isSaving && activeMapData) {
              window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
            }
          }}
          disabled={isSaving || !activeMapData}
          title="Save active map document"
        />
      </WindowMenuBar>

      <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 pb-16">
        {/* SECTION 1: Active Realm Overview & Voxel Volume */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" /> Active Voxel Realm: {baseMapId || currentMapId}
            </span>
            {openSections.overview ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {openSections.overview && (
            <div className="p-3 space-y-2.5 border-t border-[#806f47]/20 bg-[#050b14]/50">
              <div className="p-2 rounded-lg bg-[#040812] border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-primary font-bold flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-primary" />
                    <span>3D Voxel Volume:</span>
                  </span>
                  <span className="text-white font-mono font-bold bg-black/60 px-2 py-0.5 rounded border border-primary/30">
                    {Math.max(1, Math.ceil((currentMapData.grid?.[0]?.length || 32) / 32))} × {Math.max(1, Math.ceil((currentMapData.grid?.length || 32) / 32))} × 1 Chunks
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Block Scale Resolution:</span>
                  <div className="flex items-center gap-1">
                    {[16, 32, 48, 64, 128].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          soundSynth?.playUiClick?.();
                          useEditorStore.getState().setVoxelBlockSizePx(size);
                          showToast(`Block Scale set to ${size}px`);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                          voxelBlockSizePx === size
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'bg-black/40 text-muted-foreground hover:text-white'
                        }`}
                      >
                        {size}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Gunmetal Base Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundSynth?.playActionSound?.();
                    const wChunks = Math.max(1, Math.ceil((currentMapData.grid?.[0]?.length || 32) / 32));
                    const dChunks = Math.max(1, Math.ceil((currentMapData.grid?.length || 32) / 32));
                    const world = new (require('@/shared/game/voxel/VoxelWorldDoc').VoxelWorld)(
                      baseMapId || 'DEMO_SANDBOX',
                      baseMapId || 'DEMO_SANDBOX',
                      wChunks,
                      dChunks,
                      1,
                      useEditorStore.getState().voxelBlockSizePx || 64
                    );
                    world.generateDefaultWorld();
                    const doc = world.serializeToDoc();
                    if (activeMapData) {
                      useGameStore.setState({ activeMapData: { ...activeMapData, voxelDoc: doc } });
                    }
                    useEditorStore.getState().markMapDirty();
                    showToast('Generated Gunmetal Base 3D Voxel Volume');
                  }}
                  className="w-full py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Initialize 3D Voxel Gunmetal Foundation</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isSaving && activeMapData) {
                    window.dispatchEvent(new CustomEvent(STUDIO_TRIGGER_SAVE_MAP_EVENT));
                  }
                }}
                disabled={isSaving || !activeMapData}
                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isMapDirty
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-950/50 cursor-pointer'
                    : 'bg-[#cbb26a]/20 text-amber-300 border border-amber-500/30 hover:bg-[#cbb26a]/30'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving…' : isMapDirty ? 'Save Changes*' : 'Map Saved'}</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Brush Palette */}
        <div className="bg-[#0b1320]/80 border border-[#806f47]/40 rounded-xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => toggleSection('brush')}
            className="w-full flex items-center justify-between p-2.5 bg-black/50/40 text-[#cbb26a] font-bold text-left hover:bg-black/50/20 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Brush className="w-4 h-4 text-emerald-400" /> Terrain Brush
            </span>
            {openSections.brush ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          {openSections.brush && (
             <div className="border-t border-[#806f47]/20 bg-[#050b14]/50">
               <TerrainBrushPalette />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
