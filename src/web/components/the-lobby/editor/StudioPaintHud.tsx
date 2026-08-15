'use client';

import React from 'react';
import {
  Brush,
  Grid3X3,
  Shield,
  DoorOpen,
  MapPin,
  Eraser,
  Pipette,
  Hand,
  SquareDashed,
  Box,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useEditorStore } from './editor-store';
import { useGameStore } from '../store';
import { soundSynth } from '@/engine/sound-synth';

/**
 * Always-visible paint status and quick-tool HUD while in Editor mode.
 * Quick-switch between Paint, Erase, Sample, Pan, Select, Prefabs, Undo/Redo & Zoom.
 */
export function StudioPaintHud() {
  const isCreationMode = useEditorStore((s) => s.isCreationMode);
  const layerIdx = useEditorStore((s) => s.activeLayerIdx);
  const brushId = useEditorStore((s) => s.activeBrushTileId);
  const logicId = useEditorStore((s) => s.activeLogicTileId);
  const lastPainted = useEditorStore((s) => s.lastPaintedTile);
  const clicked = useEditorStore((s) => s.clickedTile);
  const hovered = useEditorStore((s) => s.hoveredTile);
  const mapDirty = useEditorStore((s) => s.mapDirty);
  const showEditorCoords = useEditorStore((s) => s.showEditorCoords);
  const setShowEditorCoords = useEditorStore((s) => s.setShowEditorCoords);
  const showWarpOverlays = useEditorStore((s) => s.showWarpOverlays);
  const setShowWarpOverlays = useEditorStore((s) => s.setShowWarpOverlays);
  const showSpawnOverlays = useEditorStore((s) => s.showSpawnOverlays);
  const setShowSpawnOverlays = useEditorStore((s) => s.setShowSpawnOverlays);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const brushMode = useEditorStore((s) => s.brushMode);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const logicTiles = useGameStore((s) => s.logicTiles);
  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  if (!isCreationMode) return null;

  const isLogic = layerIdx === -1;
  const layerName = isLogic
    ? 'Logic (−1)'
    : activeMapData?.tileLayers?.[layerIdx]?.name || `Layer ${layerIdx}`;
  const displayId = isLogic ? logicId : brushId;
  const logicMeta = isLogic ? logicTiles[displayId] : null;
  const activeCoord = hovered || lastPainted || clicked;

  const handleUndo = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = useEditorStore.getState().triggerUndo(activeMapData);
    if (res.ok) showToast('Undo');
    else showToast('Nothing to undo');
  };

  const handleRedo = () => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = useEditorStore.getState().triggerRedo(activeMapData);
    if (res.ok) showToast('Redo');
    else showToast('Nothing to redo');
  };

  const handleFitMap = () => {
    soundSynth?.playSelectSound?.();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Home' }));
  };

  const handleZoom = (factor: number) => {
    soundSynth?.playUiClick?.();
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: factor > 1 ? 100 : -100 }));
    }
  };

  const switchMode = (mode: any) => {
    soundSynth?.playSelectSound?.();
    setBrushMode(mode);
  };

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-[110] -translate-x-1/2 font-mono">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-amber-500/40 bg-[#050b14]/95 px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.65)] backdrop-blur-md">
        {/* Layer chip */}
        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
            isLogic
              ? 'border-rose-400/50 bg-rose-950/60 text-rose-200'
              : 'border-amber-500/40 bg-amber-500/20 text-amber-200'
          }`}
          title={isLogic ? 'Collision & gameplay tags (authority grid)' : 'Visual tileset layer'}
        >
          {isLogic ? <Shield className="h-3.5 w-3.5" /> : <Grid3X3 className="h-3.5 w-3.5" />}
          {layerName}
        </div>

        {/* Brush Info chip */}
        <div
          className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-black/60 px-2.5 py-1 text-[10px] text-slate-200"
          title={logicMeta ? `${logicMeta.name} — paint then Play to test` : 'Active brush GID / logic id'}
        >
          <Brush className="h-3.5 w-3.5 text-amber-400" />
          {logicMeta ? (
            <>
              <span className={`h-2.5 w-2.5 rounded-sm border border-white/20 ${logicMeta.color || 'bg-slate-500'}`} />
              <span className="max-w-[120px] truncate font-bold text-amber-100">{logicMeta.name}</span>
              <span className="text-slate-500">#{displayId}</span>
            </>
          ) : (
            <>
              <span className="font-bold text-white">GID {displayId}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-amber-500/20 mx-0.5" />

        {/* Tool Modes Group */}
        <div className="flex items-center gap-1 bg-black/60 rounded-full p-0.5 border border-amber-500/30">
          <button
            type="button"
            onClick={() => switchMode('paint')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'paint'
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Paint Brush (Left Click)"
          >
            <Brush className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => switchMode('erase')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'erase'
                ? 'bg-rose-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Eraser (Erase to Empty / 0)"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => switchMode('eyedropper')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'eyedropper'
                ? 'bg-sky-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Eyedropper / Sample Tile"
          >
            <Pipette className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => switchMode('pan')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'pan'
                ? 'bg-emerald-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Pan Hand Tool (Drag to Move Viewport)"
          >
            <Hand className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => switchMode('select')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'select'
                ? 'bg-purple-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Box Select Tool"
          >
            <SquareDashed className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => switchMode('prefab')}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'prefab'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Prefab Stamp Tool"
          >
            <Box className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playSelectSound?.();
              setBrushMode('gate');
              setShowWarpOverlays(true);
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              brushMode === 'gate'
                ? 'bg-purple-600 text-white font-bold shadow ring-1 ring-purple-300'
                : 'text-slate-400 hover:text-purple-300 hover:bg-white/10'
            }`}
            title="Warp Gate Tool (Click tile to place/configure gates)"
          >
            <DoorOpen className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Undo / Redo Quick Actions */}
        <div className="flex items-center gap-1 bg-black/60 rounded-full p-0.5 border border-amber-500/20">
          <button
            type="button"
            onClick={handleUndo}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Zoom & Fit Map */}
        <div className="flex items-center gap-1 bg-black/60 rounded-full p-0.5 border border-amber-500/20">
          <button
            type="button"
            onClick={() => handleZoom(0.8)}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.2)}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleFitMap}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fit Map in View (Home)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-black/40 px-2 py-1 text-[10px] text-slate-300">
          <span className="text-slate-500">Size</span>
          <button
            onClick={() => {
              soundSynth?.playUiClick?.();
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 1;
              idx = (idx - 1 + SIZES.length) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-amber-300 px-1 font-bold cursor-pointer"
          >
            −
          </button>
          <span className="font-bold text-amber-400">{brushRadius}</span>
          <button
            onClick={() => {
              soundSynth?.playUiClick?.();
              const SIZES = [1, 3, 5, 7];
              let idx = SIZES.indexOf(brushRadius);
              if (idx === -1) idx = 0;
              idx = (idx + 1) % SIZES.length;
              setBrushRadius(SIZES[idx]);
            }}
            className="hover:text-amber-300 px-1 font-bold cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Coordinate Readout */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setShowEditorCoords(!showEditorCoords);
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
            showEditorCoords
              ? 'border-sky-500/40 bg-sky-950/50 text-sky-200'
              : 'border-white/10 bg-black/40 text-slate-500'
          }`}
          title="Toggle coordinate readout"
        >
          {activeCoord && showEditorCoords ? (
            <span>({activeCoord.c}, {activeCoord.r})</span>
          ) : (
            <span>XY {showEditorCoords ? 'On' : 'Off'}</span>
          )}
        </button>

        {/* Warp Overlays */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setShowWarpOverlays(!showWarpOverlays);
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
            showWarpOverlays
              ? 'border-amber-500/40 bg-amber-950/50 text-amber-200'
              : 'border-white/10 bg-black/40 text-slate-500'
          }`}
          title="Toggle warp gate markers"
        >
          <DoorOpen className="h-3 w-3" />
          Gates {showWarpOverlays ? 'On' : 'Off'}
        </button>

        {/* Spawn Overlays */}
        <button
          type="button"
          onClick={() => {
            soundSynth?.playUiClick?.();
            setShowSpawnOverlays(!showSpawnOverlays);
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
            showSpawnOverlays
              ? 'border-sky-500/40 bg-sky-950/50 text-sky-200'
              : 'border-white/10 bg-black/40 text-slate-500'
          }`}
          title="Toggle NPC spawn + gate spawn-pin markers"
        >
          <MapPin className="h-3 w-3" />
          Spawns {showSpawnOverlays ? 'On' : 'Off'}
        </button>

        {mapDirty && (
          <span className="animate-pulse rounded-full border-2 border-red-500 bg-red-600/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
            ⚠️ Unsaved · Save Map
          </span>
        )}
      </div>
    </div>
  );
}

