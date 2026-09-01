'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import {
  Grid3X3,
  Layers,
  Plus,
  Trash2,
  Paintbrush,
  Box,
  RefreshCw,
  Layers2,
  Sparkles,
  Sliders,
  Wand2,
} from 'lucide-react';
import { DEFAULT_STUDIO_TILESETS, ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { TerrainBrushPalette } from './TerrainBrushPalette';
import { TerrainAtlasEditor } from './TerrainAtlasEditor';
import { BrushSettingsBar } from './BrushSettingsBar';
import { SheetSlicerPanel } from './SheetSlicerPanel';
import { PropLibraryPanel } from './PropLibraryPanel';
import { soundSynth } from '@/engine/sound-synth';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { TreePine, Scissors } from 'lucide-react';

/**
 * Reworked Unified Tile & Terrain Selector Panel.
 *
 * Provides a unified 2.5D/3D-first painting suite where creators can:
 * - Pick textures once from visual tilesets, material swatches, or sliced spritesheets.
 * - Switch between Grid Paint, Continuous Splat, Props & Foliage, Sheet Slicer, and Smart Border.
 * - Customize brush geometry (Circle, Square, Diamond, Star, Polygon), radius, scatter, and opacity.
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

  const [toolView, setToolView] = React.useState<'tileset' | 'splat' | 'props' | 'slicer' | 'smart-border'>('tileset');

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
    if (tab === 'grid') {
      setToolView('tileset');
      setActiveLayerType('grid');
      showToast('Switched to Grid Tile Paint Mode');
    } else if (tab === 'paint-splat') {
      setToolView('splat');
      setActiveLayerType('paint-splat');
      showToast('Switched to Continuous Terrain Splat Mode');
    } else if (tab === 'free-form') {
      setToolView('props');
      setActiveLayerType('free-form');
      showToast('Switched to 2.5D Props & Foliage Mode');
    } else if (tab === 'slicer') {
      setToolView('slicer');
      showToast('Opened Sheet Slicer & Cutter');
    } else if (tab === 'smart-border') {
      setToolView('smart-border');
      setActiveLayerType('grid');
      showToast('Switched to Smart Border (Auto-Tiling) Mode');
    }
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

  const currentTabId =
    toolView === 'splat'
      ? 'paint-splat'
      : toolView === 'props'
      ? 'free-form'
      : toolView === 'slicer'
      ? 'slicer'
      : toolView === 'smart-border'
      ? 'smart-border'
      : 'grid';

  const tabs = [
    { id: 'grid', label: 'Grid Paint', icon: Grid3X3 },
    { id: 'paint-splat', label: 'Terrain Splat', icon: Paintbrush },
    { id: 'free-form', label: 'Props & Foliage', icon: TreePine },
    { id: 'slicer', label: 'Sheet Slicer', icon: Scissors },
    { id: 'smart-border', label: 'Smart Border', icon: Wand2 },
  ];

  return (
    <div className="h-full w-full flex flex-col font-mono text-xs bg-[#050b14]/50 -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuTabGroup
          tabs={tabs}
          activeTab={currentTabId}
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {/* Unified Brush Settings Controls (shown for painting modes) */}
        {toolView !== 'slicer' && <BrushSettingsBar />}

        {/* Mode-Specific Content */}
        {toolView === 'splat' ? (
          <div className="space-y-3">
            <TerrainBrushPalette onOpenSlicer={() => setToolView('slicer')} />
          </div>
        ) : toolView === 'props' ? (
          <div className="space-y-3">
            <PropLibraryPanel onOpenSlicer={() => setToolView('slicer')} />
          </div>
        ) : toolView === 'slicer' ? (
          <div className="h-[600px] rounded-lg overflow-hidden border border-border/40">
            <SheetSlicerPanel />
          </div>
        ) : toolView === 'smart-border' ? (
          <div className="space-y-3">
            <TerrainAtlasEditor />
            <div className="p-2.5 rounded-lg bg-[#070e1c] border border-border/30 text-[9px] text-muted-foreground space-y-1">
              <div className="font-bold text-primary flex items-center gap-1">
                <Wand2 className="w-3 h-3 text-primary" /> Auto-Edge Active
              </div>
              <p>
                When painting on the map with Smart Border active, neighboring tiles automatically adapt their edge variants (corners, caps, and borders) to match the selected 9-slice terrain matrix.
              </p>
            </div>
          </div>
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
