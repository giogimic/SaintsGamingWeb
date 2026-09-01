'use client';

import React from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import TilesetPicker from '../TilesetPicker';
import { Grid3X3, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { DEFAULT_STUDIO_TILESETS, ensureMapHasStudioTilesets } from '@/shared/game/studioTilesetBootstrap';
import { normalizeStudioMapVisuals } from '@/shared/game/studioMapCreate';

/**
 * Dedicated dockable window for the visual Tile Selector.
 * Allows creators to browse tilesets, pick GID brushes, and switch layers
 * without navigating away from the active map or atlas.
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
  const brushShape = useEditorStore((s) => s.brushShape);
  const setBrushShape = useEditorStore((s) => s.setBrushShape);

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

  if (!activeMapData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center font-mono text-xs text-slate-400 bg-card/80 backdrop-blur-md">
        <Grid3X3 className="h-8 w-8 mb-2 text-amber-400/60 animate-pulse" />
        <p className="font-bold text-slate-200">No active map loaded</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
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

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar p-3 font-mono text-xs bg-card/90 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-primary" />
          <span className="font-bold text-foreground">Tile Selector</span>
          <span className="rounded bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            GID {activeBrushTileId}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Layers className="h-3 w-3" />
          <span>Layer: {activeLayerType !== 'grid' ? (activeLayerType === 'paint-splat' ? 'Terrain Paint (Splat)' : activeLayerType === 'free-form' ? 'Foliage & Props (2.5D)' : 'Polygon') : (activeLayerIdx === -1 ? 'Collision Layer' : `Layer ${activeLayerIdx}`)}</span>
        </div>
      </div>

      {/* Shape Cutout Mask for tile selection stamping */}
      <div className="mb-2 flex items-center gap-1 text-[9px]">
        <span className="text-muted-foreground font-bold mr-1">Brush Shape:</span>
        {(['circle', 'square', 'diamond', 'splat-star'] as const).map((shape) => {
          const isActive = brushShape === shape;
          return (
            <button
              key={shape}
              type="button"
              onClick={() => setBrushShape(shape)}
              className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer capitalize ${
                isActive
                  ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                  : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30'
              }`}
              title={`Stamp cutout shape: ${shape}`}
            >
              {shape === 'splat-star' ? 'Star' : shape}
            </button>
          );
        })}
      </div>

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
    </div>
  );
};
