'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { Grid3X3, Layers, Sparkles, RefreshCw, Paintbrush, Box } from 'lucide-react';
import { DEFAULT_STUDIO_TILESETS, ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { normalizeStudioMapVisuals } from '@/shared/game/studioMapCreate';
import { TerrainBrushPalette } from './TerrainBrushPalette';
import { soundSynth } from '@/engine/sound-synth';

/**
 * Dedicated dockable window for the visual Tile Selector.
 * Allows creators to browse tilesets, pick GID brushes, and switch layers
 * without navigating away from the active map or atlas.
 * 
 * Now features tabbed navigation:
 *   Grid Tiles | Terrain Paint | Props
 */
export const TileSelectorPanel: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const setActiveMapData = useGameStore((s) => s.setActiveMapData);
  const showToast = useGameStore((s) => s.showToast);

  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const setActiveBrushPattern = useEditorStore((s) => s.setActiveBrushPattern);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const markMapDirty = useEditorStore((s) => s.markMapDirty);
  const activeLayerType = useEditorStore((s) => s.activeLayerType);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);

  const handleBrushSelect = React.useCallback((gid: number) => {
    setActiveBrushTileId(gid, true);
    if (useEditorStore.getState().activeLayerIdx === -1 && useEditorStore.getState().activeLayerType === 'grid') {
      setActiveLayerIdx(0);
    }
  }, [setActiveBrushTileId, setActiveLayerIdx]);

  const handleBrushSelectPattern = React.useCallback((pattern: { w: number; h: number; gids: number[][] } | null) => {
    setActiveBrushPattern(pattern);
    if (useEditorStore.getState().activeLayerIdx === -1 && useEditorStore.getState().activeLayerType === 'grid') {
      setActiveLayerIdx(0);
    }
  }, [setActiveBrushPattern, setActiveLayerIdx]);

  const handleSwitchTab = (tab: 'grid' | 'paint-splat' | 'free-form') => {
    soundSynth?.playSelectSound?.();
    setActiveLayerType(tab);
    showToast(
      tab === 'grid' ? 'Grid Tiles Mode' :
      tab === 'paint-splat' ? 'Terrain Paint Mode' :
      '2.5D Props Mode'
    );
  };

  if (!activeMapData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center font-mono text-xs text-muted-foreground bg-[#050b14]/50 backdrop-blur-md">
        <Grid3X3 className="h-8 w-8 mb-2 text-primary/60 animate-pulse" />
        <p className="font-bold text-foreground">No active map loaded</p>
        <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
          Open or select a map document to pick visual tiles.
        </p>
      </div>
    );
  }

  const currentMap = ensureMapHasStudioTilesets(activeMapData);
  const tilesets = currentMap.tilesets?.length ? currentMap.tilesets : DEFAULT_STUDIO_TILESETS;
  const tileLayers = currentMap.tileLayers || [];

  const handleAddLayer = () => {
    const width = currentMap.width || currentMap.grid?.[0]?.length || 24;
    const height = currentMap.height || currentMap.grid?.length || 24;
    const newGrid = Array.from({ length: height }, () => Array(width).fill(0));
    const nextLayers = [
      ...tileLayers,
      {
        name: `Visual Layer ${tileLayers.length}`,
        visible: true,
        opacity: 1,
        grid: newGrid,
      },
    ];
    const updated = { ...currentMap, tileLayers: nextLayers };
    setActiveMapData(updated);
    setActiveLayerIdx(nextLayers.length - 1);
    markMapDirty();
    showToast(`Added Visual Layer ${nextLayers.length - 1}`);
  };

  const handleDeleteLayer = (idx: number) => {
    if (tileLayers.length <= 1) {
      showToast('Cannot delete the primary ground layer.');
      return;
    }
    const nextLayers = tileLayers.filter((_: any, i: number) => i !== idx);
    const updated = { ...currentMap, tileLayers: nextLayers };
    setActiveMapData(updated);
    setActiveLayerIdx(Math.max(0, idx - 1));
    markMapDirty();
    showToast(`Deleted Layer ${idx}`);
  };

  const handleClearLayer = (idx: number) => {
    const layer = tileLayers[idx];
    if (!layer) return;
    const height = layer.grid.length;
    const width = layer.grid[0]?.length || 24;
    const clearedGrid = Array.from({ length: height }, () => Array(width).fill(0));
    const nextLayers = tileLayers.map((l: any, i: number) => (i === idx ? { ...l, grid: clearedGrid } : l));
    const updated = { ...currentMap, tileLayers: nextLayers };
    setActiveMapData(updated);
    markMapDirty();
    showToast(`Cleared Layer ${idx}`);
  };

  const handleFillLayer = (idx: number, gid: number) => {
    const layer = tileLayers[idx];
    if (!layer) return;
    const height = layer.grid.length;
    const width = layer.grid[0]?.length || 24;
    const filledGrid = Array.from({ length: height }, () => Array(width).fill(gid));
    const nextLayers = tileLayers.map((l: any, i: number) => (i === idx ? { ...l, grid: filledGrid } : l));
    const updated = { ...currentMap, tileLayers: nextLayers };
    setActiveMapData(updated);
    markMapDirty();
    showToast(`Filled Layer ${idx} with GID ${gid}`);
  };

  const handleUpdateTilesets = (nextTilesets: any[]) => {
    const updated = { ...currentMap, tilesets: nextTilesets };
    setActiveMapData(updated);
    markMapDirty();
    const engine = typeof window !== 'undefined' ? (window as any).__babylonEngine : null;
    if (engine?.loadTilemap) {
      engine.loadTilemap(updated);
    }
    showToast('Updated map tilesets');
  };

  const tabs: Array<{ id: 'grid' | 'paint-splat' | 'free-form'; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'grid', label: 'Grid Tiles', icon: <Grid3X3 className="w-3 h-3" />, color: 'purple' },
    { id: 'paint-splat', label: 'Terrain', icon: <Paintbrush className="w-3 h-3" />, color: 'amber' },
    { id: 'free-form', label: 'Props', icon: <Box className="w-3 h-3" />, color: 'emerald' },
  ];

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar font-mono text-xs bg-[#050b14]/50">
      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0.5 p-1.5 border-b border-border/30 bg-[#0a1628]/40">
        {tabs.map((tab) => {
          const isActive = activeLayerType === tab.id;
          const activeColors: Record<string, string> = {
            purple: 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-300',
            amber: 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300',
            emerald: 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300',
          };
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSwitchTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                isActive
                  ? activeColors[tab.color]
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-[#060e1c]/30">
        <div className="flex items-center gap-2">
          <Layers className="h-3 w-3 text-primary/60" />
          <span className="text-[10px] text-muted-foreground">
            {activeLayerType === 'paint-splat' ? 'Terrain Paint (Splat)'
              : activeLayerType === 'free-form' ? 'Foliage & Props (2.5D)'
              : activeLayerIdx === -1 ? 'Collision Layer'
              : `Layer ${activeLayerIdx}`
            }
          </span>
        </div>
        <span className="rounded bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">
          GID {activeBrushTileId}
        </span>
      </div>

      {/* ── Content ── */}
      <div className="p-3">
        {activeLayerType === 'paint-splat' ? (
          <TerrainBrushPalette />
        ) : (
          <TilesetPicker
            tilesets={tilesets}
            activeBrushTileId={activeBrushTileId}
            onBrushSelect={handleBrushSelect}
            onBrushSelectPattern={handleBrushSelectPattern}
            activeLayerIdx={activeLayerIdx}
            onLayerChange={(idx: number) => setActiveLayerIdx(idx)}
            tileLayers={tileLayers}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onClearLayer={handleClearLayer}
            onFillLayer={handleFillLayer}
            onUpdateTilesets={handleUpdateTilesets}
          />
        )}
      </div>
    </div>
  );
};
