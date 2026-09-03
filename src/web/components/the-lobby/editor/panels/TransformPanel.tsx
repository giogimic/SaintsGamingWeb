'use client';

import React from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Move,
  Sliders,
  Grid3X3,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export function TransformPanel() {
  const rotateSelection = useEditorStore((s) => s.rotateSelection);
  const flipSelection = useEditorStore((s) => s.flipSelection);
  const moveSelection = useEditorStore((s) => s.moveSelection);
  const stampTransform = useEditorStore((s) => s.stampTransform);
  const flipStampH = useEditorStore((s) => s.flipStampH);
  const flipStampV = useEditorStore((s) => s.flipStampV);
  const rotateStampCW = useEditorStore((s) => s.rotateStampCW);
  const rotateStampCCW = useEditorStore((s) => s.rotateStampCCW);
  const resetStampTransform = useEditorStore((s) => s.resetStampTransform);
  const stampScale = useEditorStore((s) => s.stampScale);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);
  const voxelTargetPlaneY = useEditorStore((s) => s.voxelTargetPlaneY);
  const setVoxelTargetPlaneY = useEditorStore((s) => s.setVoxelTargetPlaneY);

  const activeMapData = useGameStore((s) => s.activeMapData);
  const showToast = useGameStore((s) => s.showToast);

  const handleRotate = (deg: 90 | 180 | 270) => {
    soundSynth?.playUiClick?.();
    if (activeMapData) {
      const res = rotateSelection(activeMapData, null, deg);
      if (res.ok) {
        showToast(`Rotated selection ${deg}°`);
        return;
      }
    }
    // Fallback rotate stamp
    if (deg === 90) rotateStampCW();
    else if (deg === 270) rotateStampCCW();
    showToast(`Rotated stamp ${deg}°`);
  };

  const handleFlipH = () => {
    soundSynth?.playUiClick?.();
    if (activeMapData) {
      const res = flipSelection(activeMapData, null, 'h');
      if (res.ok) {
        showToast('Flipped selection horizontal');
        return;
      }
    }
    flipStampH();
    showToast('Flipped stamp horizontal');
  };

  const handleFlipV = () => {
    soundSynth?.playUiClick?.();
    if (activeMapData) {
      const res = flipSelection(activeMapData, null, 'v');
      if (res.ok) {
        showToast('Flipped selection vertical');
        return;
      }
    }
    flipStampV();
    showToast('Flipped stamp vertical');
  };

  const handleNudge = (deltaR: number, deltaC: number) => {
    soundSynth?.playUiClick?.();
    if (!activeMapData) return;
    const res = moveSelection(activeMapData, null, deltaR, deltaC);
    if (res.ok) showToast(`Moved selection (R:${deltaR}, C:${deltaC})`);
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Rotation & Orientation ── */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          Rotation
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => handleRotate(90)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 hover:bg-white/5 border border-border/40 text-[11px] font-bold text-foreground transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            <span>+90° CW</span>
          </button>
          <button
            onClick={() => handleRotate(270)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 hover:bg-white/5 border border-border/40 text-[11px] font-bold text-foreground transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            <span>-90° CCW</span>
          </button>
          <button
            onClick={() => handleRotate(180)}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 hover:bg-white/5 border border-border/40 text-[11px] font-bold text-foreground transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>180° Half</span>
          </button>
        </div>
      </div>

      {/* ── Mirror / Flip ── */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          Mirror / Reflection
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleFlipH}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 hover:bg-white/5 border border-border/40 text-[11px] font-bold text-foreground transition-colors cursor-pointer"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Flip Horizontal</span>
          </button>
          <button
            onClick={handleFlipV}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/30 hover:bg-white/5 border border-border/40 text-[11px] font-bold text-foreground transition-colors cursor-pointer"
          >
            <FlipVertical className="w-3.5 h-3.5 text-amber-400" />
            <span>Flip Vertical</span>
          </button>
        </div>
      </div>

      {/* ── Translation Directional Pad ── */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1.5 block">
          Spatial Translation Nudge
        </label>
        <div className="p-2.5 rounded-xl border border-border/40 bg-black/30 flex flex-col items-center gap-1.5">
          <button
            onClick={() => handleNudge(-1, 0)}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-border/40 text-foreground flex items-center gap-1"
            title="Nudge North / Up (-1 Row)"
          >
            <ArrowUp className="w-3 h-3 text-primary" />
            <span>North (-1)</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNudge(0, -1)}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-border/40 text-foreground flex items-center gap-1"
              title="Nudge West / Left (-1 Col)"
            >
              <ArrowLeft className="w-3 h-3 text-primary" />
              <span>West</span>
            </button>
            <div className="w-8 h-8 rounded-full border border-border/40 bg-black/50 flex items-center justify-center text-primary/80 font-bold text-[10px]">
              <Move className="w-3.5 h-3.5" />
            </div>
            <button
              onClick={() => handleNudge(0, 1)}
              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-border/40 text-foreground flex items-center gap-1"
              title="Nudge East / Right (+1 Col)"
            >
              <span>East</span>
              <ArrowRight className="w-3 h-3 text-primary" />
            </button>
          </div>
          <button
            onClick={() => handleNudge(1, 0)}
            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-border/40 text-foreground flex items-center gap-1"
            title="Nudge South / Down (+1 Row)"
          >
            <ArrowDown className="w-3 h-3 text-primary" />
            <span>South (+1)</span>
          </button>
        </div>
      </div>

      {/* ── Altitude / Plane Controls ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
            Altitude Plane (Y)
          </label>
          <span className="text-primary font-bold text-[10px]">Y = {voxelTargetPlaneY}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoxelTargetPlaneY(Math.max(0, voxelTargetPlaneY - 1))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-border/40"
            title="Lower Plane"
          >
            <ArrowDown className="w-3 h-3 text-muted-foreground" />
          </button>
          <input
            type="range"
            min={0}
            max={31}
            value={voxelTargetPlaneY}
            onChange={(e) => setVoxelTargetPlaneY(Number(e.target.value))}
            className="flex-1 accent-amber-500 cursor-pointer"
          />
          <button
            onClick={() => setVoxelTargetPlaneY(Math.min(31, voxelTargetPlaneY + 1))}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-border/40"
            title="Raise Plane"
          >
            <ArrowUp className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Stamp Scale & Snapping ── */}
      <div className="pt-2 border-t border-border/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
            Stamp Scale Factor
          </span>
          <span className="text-primary font-bold text-[10px]">
            {Math.round(stampScale * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.25}
          max={4.0}
          step={0.05}
          value={stampScale}
          onChange={(e) => setStampScale(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => {
              setSnapToGrid(!snapToGrid);
              showToast(`Grid Snap: ${!snapToGrid ? 'ON' : 'OFF'}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
              snapToGrid
                ? 'bg-primary/20 text-primary border-primary/50'
                : 'bg-white/5 border-border/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>Grid Snap: {snapToGrid ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              resetStampTransform();
              setStampScale(1.0);
              showToast('Reset transform');
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}
