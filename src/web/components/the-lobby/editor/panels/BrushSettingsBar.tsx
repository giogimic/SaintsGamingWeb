'use client';

import React from 'react';
import { useEditorStore } from '../editor-store';
import {
  Circle,
  Square,
  Diamond,
  Star,
  Shuffle,
  Droplets,
  RotateCw,
  Compass,
  Sparkles,
  Sliders,
  Maximize2,
  Grid,
  Shield,
  Layers,
  Wand2,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import type { BrushShape } from '@/shared/game/brushGeometry';

export interface BrushSettingsBarProps {
  compact?: boolean;
  showModeSwitch?: boolean;
  className?: string;
}

export const BrushSettingsBar: React.FC<BrushSettingsBarProps> = ({
  compact = false,
  showModeSwitch = false,
  className = '',
}) => {
  const activeLayerType = useEditorStore((s) => s.activeLayerType);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);
  const brushRadius = useEditorStore((s) => s.brushRadius);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const brushShape = useEditorStore((s) => s.brushShape);
  const setBrushShape = useEditorStore((s) => s.setBrushShape);
  const splatOpacity = useEditorStore((s) => s.splatOpacity);
  const setSplatOpacity = useEditorStore((s) => s.setSplatOpacity);
  const splatScatter = useEditorStore((s) => s.splatScatter);
  const setSplatScatter = useEditorStore((s) => s.setSplatScatter);
  const brushRotation = useEditorStore((s) => s.brushRotation || 0);
  const setBrushRotation = useEditorStore((s) => s.setBrushRotation);
  const stampScale = useEditorStore((s) => s.stampScale || 1);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const splatRotationRandomize = useEditorStore((s) => s.splatRotationRandomize);
  const setSplatRotationRandomize = useEditorStore((s) => s.setSplatRotationRandomize);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);
  const setSnapToGrid = useEditorStore((s) => s.setSnapToGrid);

  const shapes: Array<{ id: BrushShape; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'circle', label: 'Circle (Radial)', icon: Circle },
    { id: 'square', label: 'Square (Block)', icon: Square },
    { id: 'diamond', label: 'Diamond (Isometric)', icon: Diamond },
    { id: 'splat-star', label: 'Star (Scatter)', icon: Star },
  ];

  const radiusPresets = [1, 2, 3, 5, 8];

  const handleShapeSelect = (shape: BrushShape) => {
    soundSynth?.playUiClick?.();
    setBrushShape(shape);
  };

  const handleRadiusPreset = (r: number) => {
    soundSynth?.playUiClick?.();
    setBrushRadius(r);
  };

  return (
    <div className={`flex flex-col gap-2.5 p-2.5 rounded-lg bg-[#070e1c] border border-border/40 font-mono text-xs ${className}`}>
      {/* Top Header: Mode Summary */}
      <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>Brush & Shape Geometry</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="text-foreground font-bold">{brushShape.toUpperCase()}</span>
          <span>•</span>
          <span className="text-primary font-bold">R:{brushRadius}</span>
        </div>
      </div>

      {/* Shape Selector Buttons */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Shape:</span>
        <div className="grid grid-cols-4 gap-1 flex-1">
          {shapes.map((s) => {
            const Icon = s.icon;
            const isSelected = brushShape === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleShapeSelect(s.id)}
                title={s.label}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/20 text-primary border border-primary/50 shadow-sm shadow-primary/20'
                    : 'bg-[#040812] text-muted-foreground border border-border/30 hover:border-border hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="capitalize">{s.id.replace('splat-', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Radius Slider + Quick Presets */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Radius:</span>
        <input
          type="range"
          min={1}
          max={10}
          value={brushRadius}
          onChange={(e) => setBrushRadius(parseInt(e.target.value))}
          className="flex-1 accent-primary h-1 cursor-pointer"
        />
        <div className="flex items-center gap-0.5">
          {radiusPresets.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRadiusPreset(r)}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono transition-colors cursor-pointer ${
                brushRadius === r
                  ? 'bg-primary text-black font-extrabold'
                  : 'bg-[#040812] text-muted-foreground hover:text-foreground border border-border/20'
              }`}
            >
              {r}×{r}
            </button>
          ))}
        </div>
      </div>

      {/* Splat Mode Parameters */}
      {activeLayerType === 'paint-splat' && (
        <div className="pt-2 border-t border-border/20 space-y-2">
          {/* Opacity & Scatter Sliders */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Droplets className="w-2.5 h-2.5 text-primary" /> Opacity
                </span>
                <span className="text-foreground font-bold">{Math.round(splatOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(splatOpacity * 100)}
                onChange={(e) => setSplatOpacity(parseInt(e.target.value) / 100)}
                className="w-full accent-primary h-1 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Shuffle className="w-2.5 h-2.5 text-amber-400" /> Scatter
                </span>
                <span className="text-foreground font-bold">{Math.round(splatScatter * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(splatScatter * 100)}
                onChange={(e) => setSplatScatter(parseInt(e.target.value) / 100)}
                className="w-full accent-amber-500 h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Rotation & Scale Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground w-10 shrink-0">Angle:</span>
              <input
                type="range"
                min={0}
                max={345}
                step={15}
                value={brushRotation}
                onChange={(e) => setBrushRotation(parseInt(e.target.value))}
                className="flex-1 accent-primary h-1 cursor-pointer"
              />
              <span className="text-[8px] font-mono text-foreground font-bold w-6 text-right">{brushRotation}°</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground w-10 shrink-0">Scale:</span>
              <input
                type="range"
                min={25}
                max={300}
                step={25}
                value={Math.round(stampScale * 100)}
                onChange={(e) => setStampScale(parseInt(e.target.value) / 100)}
                className="flex-1 accent-primary h-1 cursor-pointer"
              />
              <span className="text-[8px] font-mono text-foreground font-bold w-6 text-right">{(stampScale).toFixed(1)}x</span>
            </div>
          </div>

          {/* Quick Toggles: Randomize Rotation & Snap */}
          <div className="flex items-center justify-between pt-1 text-[9px]">
            <label className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={splatRotationRandomize}
                onChange={(e) => setSplatRotationRandomize(e.target.checked)}
                className="accent-primary rounded"
              />
              <span>Jitter Rotation</span>
            </label>

            <label className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="accent-primary rounded"
              />
              <span>Snap Sub-Grid</span>
            </label>
          </div>
        </div>
      )}

      {/* Grid Mode Helpers */}
      {activeLayerType === 'grid' && (
        <div className="pt-1.5 border-t border-border/20 flex items-center justify-between text-[9px] text-muted-foreground">
          <label className="flex items-center gap-1.5 hover:text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="accent-primary rounded"
            />
            <span>Align to Discrete Tile Grid</span>
          </label>
          <span className="text-[8px] text-muted-foreground font-mono">1 Tile = 1 Cell</span>
        </div>
      )}
    </div>
  );
};
