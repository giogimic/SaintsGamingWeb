'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { Grid3X3, Layers, Plus, Trash2, Paintbrush, Box, RefreshCw, Layers2 } from 'lucide-react';
import { DEFAULT_STUDIO_TILESETS, ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { TerrainBrushPalette } from './TerrainBrushPalette';
import { soundSynth } from '@/engine/sound-synth';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';

/**
 * Dedicated dockable window for the visual Tile Selector.
 * Allows creators to browse tilesets, pick GID brushes, and switch layers
 * with a standardized application sub-menu bar under the title bar.
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

  const handleSwitchTab = (tab: string) => {
    soundSynth?.playSelectSound?.();
    setActiveLayerType(tab as any);
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

  const tabs = [
    { id: 'grid', label: 'Grid Tiles', icon: Grid3X3 },
    { id: 'paint-splat', label: 'Terrain', icon: Paintbrush },
    { id: 'free-form', label: 'Props', icon: Box },
  ];

  return (
    <div className="h-full w-full flex flex-col font-mono text-xs bg-[#050b14]/50 -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuTabGroup
          tabs={tabs}
          activeTab={activeLayerType}
          onChange={handleSwitchTab}
        />
        <WindowMenuDivider />
        <WindowMenuDropdown
          label="Layers"
          icon={Layers2}
          items={[
            { label: 'Add Visual Layer', icon: Plus, onClick: handleAddLayer },
            { label: `Clear Layer ${activeLayerIdx}`, icon: Trash2, onClick: () => handleClearLayer(activeLayerIdx), danger: true },
            { label: `Fill Layer ${activeLayerIdx} with GID #${activeBrushTileId}`, onClick: () => handleFillLayer(activeLayerIdx, activeBrushTileId) },
            { divider: true, label: '' },
            { label: 'Re-sync Default Tilesets', icon: RefreshCw, onClick: () => handleUpdateTilesets(DEFAULT_STUDIO_TILESETS) },
          ]}
        />
        <div className="flex-1" />
        <span className="rounded bg-primary/15 border border-primary/40 px-2 py-0.5 text-[9px] font-bold text-primary shrink-0">
          GID #{activeBrushTileId}
        </span>
      </WindowMenuBar>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
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
