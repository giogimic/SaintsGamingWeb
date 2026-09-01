'use client';

import React, { useState, useEffect } from 'react';
import {
  Brush,
  Eraser,
  Pipette,
  SquareDashed,
  Box,
  DoorOpen,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Camera,
  Grid3X3,
  Shield,
  Circle,
  Square,
  Diamond,
  Star,
  Hexagon,
  Lasso,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Activity,
  Radio,
  Users,
  Compass,
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { LOGIC_COMPONENT_PRESETS } from '@/shared/game/logicComponents';
import { getClientAtlas } from '../data/maps';
import { type AtlasGridData, getAdjacentAtlasNeighbors } from '@/shared/game/atlas/spatialAtlas';
import { savePrefab, listPrefabs, type PrefabTileData } from '@/app/actions/prefabs';

const InlineAtlasStatus = () => {
  const currentMapId = useGameStore((s) => s.currentMapId);
  const activeAtlasNodeId = useGameStore((s) => s.activeAtlasNodeId);
  const [atlas, setAtlas] = useState<AtlasGridData | null>(null);

  useEffect(() => {
    getClientAtlas().then(setAtlas).catch(() => {});
  }, [currentMapId, activeAtlasNodeId]);

  const node = atlas?.nodes.find((n) => (activeAtlasNodeId ? n.id === activeAtlasNodeId : n.mapId === currentMapId));
  const neighbors = node && atlas ? getAdjacentAtlasNeighbors(atlas, node) : null;

  if (!node) {
    return (
      <div
        onClick={() => useEditorStore.getState().openPanel('atlas')}
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-background/50 border border-border/40 text-[9px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        title="Unbound Map — Click to open World Atlas"
      >
        <Compass className="w-3 h-3 text-amber-500/50" />
        <span>Unbound</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => useEditorStore.getState().openPanel('atlas')}
      className="hidden md:flex items-center gap-2 text-[9px] bg-background/50 border border-border/40 hover:border-amber-500/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
      title={`World Atlas Spatial Node: ${node.mapId} — Click to edit World Atlas`}
    >
      <Compass className="w-3 h-3 text-amber-400" />
      <span className="text-amber-400 font-bold truncate max-w-[140px]">{node.mapId}</span>
      <div className="flex gap-1.5 text-muted-foreground border-l border-border/40 pl-1.5">
        <span title={`North: ${neighbors?.north?.mapId || 'none'}`}>N:{neighbors?.north ? '✓' : '×'}</span>
        <span title={`East: ${neighbors?.east?.mapId || 'none'}`}>E:{neighbors?.east ? '✓' : '×'}</span>
        <span title={`South: ${neighbors?.south?.mapId || 'none'}`}>S:{neighbors?.south ? '✓' : '×'}</span>
        <span title={`West: ${neighbors?.west?.mapId || 'none'}`}>W:{neighbors?.west ? '✓' : '×'}</span>
      </div>
    </div>
  );
};
interface StudioBottomToolbarProps {
  layoutRef?: React.RefObject<any>;
  model?: any;
  onOpenMapBrowser?: () => void;
  onOpenAssetBrowser?: () => void;
  onOpenHeroStudio?: () => void;
}

export const StudioBottomToolbar: React.FC<StudioBottomToolbarProps> = () => {
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const brushShape = useEditorStore((s) => s.brushShape);
  const setBrushShape = useEditorStore((s) => s.setBrushShape);
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const paintMode = useEditorStore((s) => s.paintMode);
  const setPaintMode = useEditorStore((s) => s.setPaintMode);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const activeLayerType = useEditorStore((s) => s.activeLayerType);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const activeLogicTileId = useEditorStore((s) => s.activeLogicTileId);
  const showEditorCoords = useEditorStore((s) => s.showEditorCoords);
  const setShowEditorCoords = useEditorStore((s) => s.setShowEditorCoords);
  const showWarpOverlays = useEditorStore((s) => s.showWarpOverlays);
  const setShowWarpOverlays = useEditorStore((s) => s.setShowWarpOverlays);
  const showSpawnOverlays = useEditorStore((s) => s.showSpawnOverlays);
  const setShowSpawnOverlays = useEditorStore((s) => s.setShowSpawnOverlays);
  const stampTransform = useEditorStore((s) => s.stampTransform);
  const flipStampH = useEditorStore((s) => s.flipStampH);
  const flipStampV = useEditorStore((s) => s.flipStampV);
  const rotateStampCW = useEditorStore((s) => s.rotateStampCW);
  const isStudioFreeCam = useEditorStore((s) => s.isStudioFreeCam);
  const setStudioFreeCam = useEditorStore((s) => s.setStudioFreeCam);
  const hoveredTile = useEditorStore((s) => s.hoveredTile);
  const activeBrushPattern = useEditorStore((s) => s.activeBrushPattern);
  const prefabStampMode = useEditorStore((s) => s.prefabStampMode);
  const setPrefabStampMode = useEditorStore((s) => s.setPrefabStampMode);
  const stampScale = useEditorStore((s) => s.stampScale);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const setPrefabs = useEditorStore((s) => s.setPrefabs);
  const setActivePrefabId = useEditorStore((s) => s.setActivePrefabId);
  const openPanel = useEditorStore((s) => s.openPanel);
  const showToast = useGameStore((s) => s.showToast);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const otherPlayers = useGameStore((s) => s.otherPlayers);

  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [atlasInspectorOpen, setAtlasInspectorOpen] = useState<boolean>(false);

  const selectedCount = useEditorStore.getState().getSelectedCount();
  const bounds = useEditorStore.getState().getSelectedBounds();
  const peerCount = Object.keys(otherPlayers || {}).length;

  const handleSwitchLayerType = (type: 'grid' | 'paint-splat' | 'free-form') => {
    soundSynth?.playUiClick?.();
    const liveMap = useGameStore.getState().activeMapData;
    if (!liveMap) return;
    if (type === 'grid') {
      setActiveLayerType('grid');
      setActiveLayerIdx(0);
      showToast('Switched to Grid Mode (Standard Tiled Grid)');
      return;
    }
    const layers = Array.isArray(liveMap.freeformLayers) ? [...liveMap.freeformLayers] : [];
    const layerName = type === 'paint-splat' ? 'Terrain Paint (Splats)' : 'Foliage & Props (2.5D)';
    let idx = layers.findIndex((l: any) => l.name === layerName || l.type === type);
    if (idx === -1) {
      idx = layers.length;
      layers.push({
        id: `layer_${type}_${Date.now()}`,
        name: layerName,
        type,
        data: {},
        objects: [],
        regions: []
      });
      const nextMap = { ...liveMap, freeformLayers: layers };
      useGameStore.getState().setActiveMapData(nextMap);
      useEditorStore.getState().markMapDirty();
    }
    setActiveLayerIdx(idx);
    setActiveLayerType(type);
    showToast(`Switched to ${type === 'paint-splat' ? 'Splat Paint' : '2.5D Prop'} Mode`);
  };

  useEffect(() => {
    const handleZoomChanged = (e: Event) => {
      const custom = e as CustomEvent<{ ortho: number; percent: number }>;
      if (custom.detail?.percent) {
        setZoomPercent(custom.detail.percent);
      }
    };
    window.addEventListener('studio_zoom_changed', handleZoomChanged);
    return () => window.removeEventListener('studio_zoom_changed', handleZoomChanged);
  }, []);

  const handleSetPresetZoom = (percent: number) => {
    soundSynth?.playUiClick?.();
    setZoomPercent(percent);
    window.dispatchEvent(new CustomEvent('studio_set_zoom', { detail: { percent } }));
  };

  const handleZoomIn = () => {
    soundSynth?.playUiClick?.();
    const next = Math.min(400, Math.round(zoomPercent * 1.25));
    handleSetPresetZoom(next);
  };

  const handleZoomOut = () => {
    soundSynth?.playUiClick?.();
    const next = Math.max(15, Math.round(zoomPercent * 0.8));
    handleSetPresetZoom(next);
  };

  const isLogic = activeLayerIdx === -1;
  const layerName = isLogic ? 'Collision Layer' : `Layer ${activeLayerIdx}`;
  const logicMeta = isLogic
    ? logicTiles[activeLogicTileId] || LOGIC_COMPONENT_PRESETS.find((p) => p.paintTileId === activeLogicTileId)
    : null;

  return (
    <div className="pointer-events-auto fixed bottom-0 left-0 right-0 h-9 z-[110] bg-card/90 border-t border-border/60 flex items-center justify-between px-3 select-none backdrop-blur-xl shadow-lg font-mono text-xs text-foreground overflow-x-auto no-scrollbar gap-2">
      {/* ─── ZONE 1: Active Tool, Brush Size & Transforms ─── */}
      <div className="flex items-center gap-2 border-r border-border/40 pr-3 shrink-0">
        {/* Mode Selector: Grid vs Splat vs Prop */}
        <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleSwitchLayerType('grid')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
              activeLayerType === 'grid'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Grid Mode: Standard Tiled Grid Painting"
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayerType('paint-splat')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
              activeLayerType === 'paint-splat'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Terrain Paint Mode: 2.5D MS-Paint Freehand Splats"
          >
            Splat
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayerType('free-form')}
            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
              activeLayerType === 'free-form'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-300'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="2.5D Prop Mode: Free-form Billboard Props"
          >
            Prop
          </button>
        </div>

        {/* Brush Mode Buttons */}
        <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setBrushMode('paint')}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'paint'
                ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(203,178,106,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Brush Tool (B)"
          >
            <Brush className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('erase')}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'erase'
                ? 'bg-destructive text-destructive-foreground font-bold shadow-[0_0_12px_rgba(239,68,68,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('eyedropper')}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'eyedropper'
                ? 'bg-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Eyedropper (I)"
          >
            <Pipette className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('select')}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'select'
                ? 'bg-amber-600 text-white font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Marquee Selection (M)"
          >
            <SquareDashed className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('prefab')}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'prefab'
                ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(203,178,106,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Prefab Stamp (G)"
          >
            <Box className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setBrushMode('gate');
              setShowWarpOverlays(true);
            }}
            className={`p-1.5 rounded transition-all duration-100 cursor-pointer ${
              brushMode === 'gate'
                ? 'bg-purple-600 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-105'
                : 'text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95'
            }`}
            title="Warp Gate Tool"
          >
            <DoorOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Paint Mode Toggle (Stamp vs Paste) */}
        {brushMode === 'paint' && (
          <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5 text-[9px] font-bold">
            <button
              type="button"
              onClick={async () => {
                soundSynth?.playUiClick?.();
                if (!activeBrushPattern || activeBrushPattern.w * activeBrushPattern.h <= 1) {
                  showToast('Select a larger pattern in the Tileset first to save as a stamp.');
                  return;
                }
                
                const visualData: PrefabTileData[] = [];
                for (let r = 0; r < activeBrushPattern.h; r++) {
                  for (let c = 0; c < activeBrushPattern.w; c++) {
                    const tileId = activeBrushPattern.gids[r][c];
                    if (tileId > 0) {
                      visualData.push({ layerOffset: 0, r, c, tileId });
                    }
                  }
                }
                
                if (visualData.length === 0) {
                  showToast('Selected pattern is empty.');
                  return;
                }
                
                const prefabName = `Custom Stamp (${activeBrushPattern.w}x${activeBrushPattern.h})`;
                const res = await savePrefab({
                  name: prefabName,
                  category: 'decor',
                  width: activeBrushPattern.w,
                  height: activeBrushPattern.h,
                  visualData,
                  logicData: [],
                });

                if (res.success) {
                  showToast(`Saved stamp: ${prefabName}`);
                  const listRes = await listPrefabs();
                  if (listRes.success && listRes.data) {
                    setPrefabs(listRes.data);
                    const newPrefab = listRes.data.find((p: any) => p.name === prefabName);
                    if (newPrefab) {
                      setActivePrefabId(newPrefab.id);
                    }
                  }
                  setBrushMode('prefab');
                  openPanel('prefab');
                } else {
                  showToast(`Failed to save stamp: ${res.error}`);
                }
              }}
              className="px-2 py-1 rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              title="Save selection as a reusable stamp"
            >
              SAVE STAMP
            </button>
            <button
              type="button"
              onClick={() => {
                setPaintMode('paste');
                soundSynth?.playUiClick?.();
              }}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                paintMode === 'paste'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Paste / Tiling (drag to paint full region)"
            >
              PATTERN
            </button>
          </div>
        )}

        {/* Stamp Mode Toggle: Multi-Tile Size vs 1-Tile & Scale */}
        {brushMode === 'paint' && activeBrushPattern && activeBrushPattern.w * activeBrushPattern.h > 1 && (
          <div className="flex items-center gap-1 bg-background/50 border border-border/60 rounded-lg p-0.5 text-[9px] font-bold">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setPrefabStampMode('footprint');
                  showToast(`Stamp Size: ${Math.max(1, Math.round(activeBrushPattern.w * stampScale))}×${Math.max(1, Math.round(activeBrushPattern.h * stampScale))} Tiles (${stampScale}x)`);
                }}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  prefabStampMode === 'footprint'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Stamp full pattern footprint across multiple tiles"
              >
                STAMP ({Math.max(1, Math.round(activeBrushPattern.w * stampScale))}×{Math.max(1, Math.round(activeBrushPattern.h * stampScale))})
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setPrefabStampMode('1tile');
                  showToast('1-Tile Brush equipped');
                }}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  prefabStampMode === '1tile'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Fit into 1 single tile cell"
              >
                1-TILE BRUSH
              </button>
            </div>

            {/* Stamp Scale Presets (0.25x, 0.5x, 1x, 2x) */}
            {prefabStampMode === 'footprint' && (
              <div className="flex items-center gap-0.5 border-l border-border/60 pl-1">
                <span className="text-muted-foreground text-[8px] mr-0.5">SCALE:</span>
                {[0.25, 0.5, 1, 2].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      setStampScale(sc);
                      showToast(`Stamp Scale: ${sc}x (${Math.max(1, Math.round(activeBrushPattern.w * sc))}×${Math.max(1, Math.round(activeBrushPattern.h * sc))} tiles)`);
                    }}
                    className={`px-1 py-0.5 rounded text-[8px] font-mono transition-colors cursor-pointer ${
                      stampScale === sc
                        ? 'bg-amber-600 text-white font-bold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                    title={`Scale stamp to ${sc}x (${Math.max(1, Math.round(activeBrushPattern.w * sc))}×${Math.max(1, Math.round(activeBrushPattern.h * sc))} scene tiles)`}
                  >
                    {sc}x
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brush Size */}
        <div className="flex items-center gap-1 bg-background/50 border border-border/60 rounded-lg px-2 py-0.5 text-[10px]">
          <span className="text-muted-foreground">Size</span>
          <button
            onClick={() => {
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 1;
              idx = (idx - 1 + SIZES.length) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-primary font-bold px-0.5 cursor-pointer"
          >
            −
          </button>
          <span className="font-bold text-primary">{brushRadius}</span>
          <button
            onClick={() => {
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 0;
              idx = (idx + 1) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-primary font-bold px-0.5 cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Brush Shape Cycler */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            const shapes: Array<'circle' | 'square' | 'diamond' | 'splat-star' | 'polygon'> = ['circle', 'square', 'diamond', 'splat-star', 'polygon'];
            const idx = shapes.indexOf(brushShape);
            const next = shapes[(idx + 1) % shapes.length];
            setBrushShape(next);
          }}
          className={`flex items-center gap-1 bg-background/50 border border-border/60 hover:border-primary/50 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
            brushShape !== 'circle' ? 'text-amber-400 bg-amber-500/10 border-amber-500/40' : 'text-primary'
          }`}
          title={`Brush Shape: ${brushShape} — Click to cycle (Circle → Square → Diamond → Star → Polygon)`}
        >
          {brushShape === 'circle' && <Circle className="h-3 w-3" />}
          {brushShape === 'square' && <Square className="h-3 w-3" />}
          {brushShape === 'diamond' && <Diamond className="h-3 w-3" />}
          {brushShape === 'splat-star' && <Star className="h-3 w-3" />}
          {brushShape === 'polygon' && <Hexagon className="h-3 w-3" />}
          <span className="capitalize">{brushShape === 'splat-star' ? 'Star' : brushShape}</span>
        </button>

        {/* Selection Shape Picker (only in select mode) */}
        {brushMode === 'select' && (
          <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5 text-[9px] font-bold">
            <span className="text-muted-foreground text-[8px] px-1">SEL:</span>
            {(['box', 'circle', 'lasso', 'polygon'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  useEditorStore.getState().setSelectionMode(mode);
                }}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  useEditorStore.getState().selectionMode === mode
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`Selection Mode: ${mode}`}
              >
                {mode === 'box' && <Square className="h-2.5 w-2.5 inline" />}
                {mode === 'circle' && <Circle className="h-2.5 w-2.5 inline" />}
                {mode === 'lasso' && <Lasso className="h-2.5 w-2.5 inline" />}
                {mode === 'polygon' && <Hexagon className="h-2.5 w-2.5 inline" />}
              </button>
            ))}
          </div>
        )}

        {/* Stamp Transform Controls */}
        <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              flipStampH();
              showToast(`Stamp Flip H: ${!stampTransform.flipH ? 'ON' : 'OFF'} (X)`);
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              stampTransform.flipH
                ? 'bg-primary text-primary-foreground font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Flip Stamp Horizontally (X)"
          >
            <FlipHorizontal className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              flipStampV();
              showToast(`Stamp Flip V: ${!stampTransform.flipV ? 'ON' : 'OFF'} (Y)`);
            }}
            className={`p-1 rounded transition-colors cursor-pointer ${
              stampTransform.flipV
                ? 'bg-primary text-primary-foreground font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Flip Stamp Vertically (Y)"
          >
            <FlipVertical className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              rotateStampCW();
              const nextRot = (stampTransform.rotation + 90) % 360;
              showToast(`Stamp Rotate: ${nextRot}° (Z)`);
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Rotate Stamp 90° CW (Z)"
          >
            <RotateCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ─── ZONE 2: Contextual Selection, Coordinates & Layer Info ─── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Layer Chip */}
        <div
          onClick={() => {
            soundSynth?.playUiClick?.();
            setStudioMode(isLogic ? 'develop' : 'logic');
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
            isLogic
              ? 'border-cyan-500/50 bg-cyan-950/60 text-cyan-200'
              : 'border-primary/50 bg-primary/20 text-primary'
          }`}
          title="Click to toggle Paint (Visual) / Logic Mode"
        >
          {isLogic ? <Shield className="h-3 w-3" /> : <Grid3X3 className="h-3 w-3" />}
          <span>{layerName}</span>
        </div>

        {/* Brush Info Chip */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-border/60 bg-background/50 text-[10px]">
          <Brush className="h-3 w-3 text-primary" />
          {logicMeta ? (
            <span className="font-bold text-cyan-300 truncate max-w-[90px]">{logicMeta.name}</span>
          ) : (
            <span className="font-bold text-foreground">GID {activeBrushTileId}</span>
          )}
        </div>

        {/* Live Hover Coordinates */}
        <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-background/50 border border-border/60 text-[10px] text-muted-foreground">
          <span>Pos:</span>
          <span className="font-bold text-foreground">
            [{hoveredTile ? `${hoveredTile.c}, ${hoveredTile.r}` : '—, —'}]
          </span>
        </div>

        {/* Selection info if active */}
        {selectedCount > 0 && (
          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-[10px] text-primary">
            <span>
              {bounds
                ? `Sel: [${bounds.minC},${bounds.minR}]..[${bounds.maxC},${bounds.maxR}] (${bounds.maxC - bounds.minC + 1}×${bounds.maxR - bounds.minR + 1})`
                : `${selectedCount} selected`}
            </span>
          </div>
        )}
      </div>

      {/* ─── ZONE 3: Viewport Controls, Zoom, FreeCam & Diagnostics ─── */}
      <div className="flex items-center gap-2 border-l border-border/40 pl-3 shrink-0">
        {/* Overlay Toggles */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowEditorCoords(!showEditorCoords)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
              showEditorCoords
                ? 'border-sky-500/50 bg-sky-950/50 text-sky-200'
                : 'border-border/40 bg-background/40 text-muted-foreground'
            }`}
            title="Toggle Tile XY Coordinates overlay"
          >
            XY
          </button>
          <button
            type="button"
            onClick={() => setShowWarpOverlays(!showWarpOverlays)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
              showWarpOverlays
                ? 'border-purple-500/50 bg-purple-950/50 text-purple-200'
                : 'border-border/40 bg-background/40 text-muted-foreground'
            }`}
            title="Toggle Warp Gate overlays"
          >
            Gates
          </button>
          <button
            type="button"
            onClick={() => setShowSpawnOverlays(!showSpawnOverlays)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
              showSpawnOverlays
                ? 'border-emerald-500/50 bg-emerald-950/50 text-emerald-200'
                : 'border-border/40 bg-background/40 text-muted-foreground'
            }`}
            title="Toggle Monster / Entity Spawn overlays"
          >
            Spawns
          </button>
        </div>

        {/* Camera Toggle */}
        <button
          onClick={() => {
            setStudioFreeCam(!isStudioFreeCam);
            showToast(isStudioFreeCam ? 'Camera locked to Player' : 'Studio Free-Cam unlocked (WASD / Pan)');
          }}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
            isStudioFreeCam
              ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-200'
              : 'border-border/40 bg-background/40 text-muted-foreground hover:text-foreground'
          }`}
          title="Studio Free-Cam (Pan independently of player avatar)"
        >
          <Camera className="w-3 h-3" />
          <span className="hidden sm:inline">{isStudioFreeCam ? 'FreeCam' : 'Locked'}</span>
        </button>

        {/* Inline Atlas Status */}
        <InlineAtlasStatus />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-background/50 border border-border/60 rounded-lg px-1.5 py-0.5 text-[10px]">
          <button onClick={handleZoomOut} className="hover:text-primary px-0.5 cursor-pointer font-bold" title="Zoom Out">
            <ZoomOut className="w-3 h-3" />
          </button>
          <span
            onClick={() => handleSetPresetZoom(100)}
            className="cursor-pointer font-bold text-foreground hover:text-primary text-[9px]"
            title="Click to reset zoom to 100% (Ctrl+0)"
          >
            {zoomPercent}%
          </span>
          <button onClick={handleZoomIn} className="hover:text-primary px-0.5 cursor-pointer font-bold" title="Zoom In">
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('studio_fit_map'))}
            className="hover:text-primary px-0.5 cursor-pointer font-bold"
            title="Fit map in view (Home)"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Network & Performance */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-muted-foreground border-l border-border/40 pl-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span>{latencyMs ? `${latencyMs}ms` : '60 FPS'}</span>
          {peerCount > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400">
              <Users className="w-2.5 h-2.5" /> {peerCount}
            </span>
          )}
        </div>
      </div>


    </div>
  );
};
