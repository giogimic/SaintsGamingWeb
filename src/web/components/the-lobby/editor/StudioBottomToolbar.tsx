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
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Activity,
  Radio,
  Users,
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';
import { LOGIC_COMPONENT_PRESETS } from '@/shared/game/logicComponents';

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
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
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

  const activeMapData = useGameStore((s) => s.activeMapData);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const latencyMs = useGameStore((s) => s.latencyMs);
  const otherPlayers = useGameStore((s) => s.otherPlayers);
  const showToast = useGameStore((s) => s.showToast);

  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const selectedCount = useEditorStore.getState().getSelectedCount();
  const bounds = useEditorStore.getState().getSelectedBounds();
  const peerCount = Object.keys(otherPlayers || {}).length;

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
  const layerName = isLogic ? 'Logic (−1)' : `Layer ${activeLayerIdx}`;
  const logicMeta = isLogic
    ? logicTiles[activeLogicTileId] || LOGIC_COMPONENT_PRESETS.find((p) => p.paintTileId === activeLogicTileId)
    : null;

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-9 z-[110] bg-card/85 border-t border-border/60 flex items-center justify-between px-3 select-none backdrop-blur-xl shadow-lg font-mono text-xs text-foreground">
      {/* ─── ZONE 1: Active Tool, Brush Size & Transforms ─── */}
      <div className="flex items-center gap-2 border-r border-border/40 pr-3">
        {/* Brush Mode Buttons */}
        <div className="flex items-center gap-0.5 bg-background/50 border border-border/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setBrushMode('paint')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'paint'
                ? 'bg-primary text-primary-foreground font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Paint Brush (B)"
          >
            <Brush className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('erase')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'erase'
                ? 'bg-destructive text-destructive-foreground font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('eyedropper')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'eyedropper'
                ? 'bg-cyan-500 text-black font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Eyedropper (I)"
          >
            <Pipette className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('select')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'select'
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Marquee Selection (M)"
          >
            <SquareDashed className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setBrushMode('prefab')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'prefab'
                ? 'bg-primary text-primary-foreground font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
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
            className={`p-1 rounded transition-colors cursor-pointer ${
              brushMode === 'gate'
                ? 'bg-purple-600 text-white font-bold shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Warp Gate Tool"
          >
            <DoorOpen className="h-3.5 w-3.5" />
          </button>
        </div>

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
      <div className="flex items-center gap-2">
        {/* Layer Chip */}
        <div
          onClick={() => setActiveLayerIdx(isLogic ? 0 : -1)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
            isLogic
              ? 'border-cyan-500/50 bg-cyan-950/60 text-cyan-200'
              : 'border-primary/50 bg-primary/20 text-primary'
          }`}
          title="Click to toggle Logic (−1) / Visual layer"
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
      <div className="flex items-center gap-2 border-l border-border/40 pl-3">
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
