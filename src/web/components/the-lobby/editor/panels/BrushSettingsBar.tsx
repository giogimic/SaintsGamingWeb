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
  Box,
  Lock,
  Unlock,
  Crosshair,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import type { BrushShape } from '@/shared/game/brushGeometry';

export type BrushSettingsMode = 'voxel' | 'grid' | 'splat' | 'prop' | 'auto';

export interface BrushSettingsBarProps {
  compact?: boolean;
  showModeSwitch?: boolean;
  className?: string;
  /** Controls which brush controls are shown.
   * - 'voxel': block size resolution (6-1024px) + 3D shape archetypes + unified tools
   * - 'grid': brush shape + radius only
   * - 'splat': full controls (shape, radius, scatter, opacity, rotation, snap)
   * - 'prop': scale + rotation only (no brush radius/shape)
   * - 'auto' (default): infer from activeLayerType store value
   */
  mode?: BrushSettingsMode;
}

export const BrushSettingsBar: React.FC<BrushSettingsBarProps> = ({
  compact = false,
  showModeSwitch = false,
  className = '',
  mode = 'auto',
}) => {
  const activeLayerType = useEditorStore((s) => s.activeLayerType);
  const studioMode = useEditorStore((s) => s.studioMode);
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

  // Voxel Store State
  const voxelBlockSizePx = useEditorStore((s) => s.voxelBlockSizePx);
  const setVoxelBlockSizePx = useEditorStore((s) => s.setVoxelBlockSizePx);
  const activeVoxelShape = useEditorStore((s) => s.activeVoxelShape);
  const setActiveVoxelShape = useEditorStore((s) => s.setActiveVoxelShape);
  const voxelToolMode = useEditorStore((s) => s.voxelToolMode);
  const setVoxelToolMode = useEditorStore((s) => s.setVoxelToolMode);
  const voxelPlaneLockEnabled = useEditorStore((s) => s.voxelPlaneLockEnabled);
  const setVoxelPlaneLockEnabled = useEditorStore((s) => s.setVoxelPlaneLockEnabled);
  const voxelTargetPlaneY = useEditorStore((s) => s.voxelTargetPlaneY);
  const setVoxelTargetPlaneY = useEditorStore((s) => s.setVoxelTargetPlaneY);
  const voxelPlaneMask = useEditorStore((s) => s.voxelPlaneMask);
  const setVoxelPlaneMask = useEditorStore((s) => s.setVoxelPlaneMask);
  const toggleVoxelPlaneInMask = useEditorStore((s) => s.toggleVoxelPlaneInMask);
  const voxelBuildUpMode = useEditorStore((s) => s.voxelBuildUpMode);
  const setVoxelBuildUpMode = useEditorStore((s) => s.setVoxelBuildUpMode);
  const hoveredVoxel = useEditorStore((s) => s.hoveredVoxel);

  // Resolve the effective mode from prop or store
  const effectiveMode: 'voxel' | 'grid' | 'splat' | 'prop' =
    mode !== 'auto'
      ? mode
      : studioMode === 'voxel'
      ? 'voxel'
      : activeLayerType === 'paint-splat'
      ? 'splat'
      : activeLayerType === 'free-form'
      ? 'prop'
      : 'voxel'; // Default to unified voxel

  const showVoxelControls = effectiveMode === 'voxel' || studioMode === 'voxel' || studioMode === 'develop';
  const showShapeRadius = effectiveMode === 'grid' || effectiveMode === 'splat' || effectiveMode === 'voxel';
  const showSplatControls = effectiveMode === 'splat';
  const showPropControls = effectiveMode === 'prop' || effectiveMode === 'splat';
  const showGridSnap = effectiveMode === 'grid';

  const shapes: Array<{ id: BrushShape; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'circle', label: 'Circle (Radial)', icon: Circle },
    { id: 'square', label: 'Square (Block)', icon: Square },
    { id: 'diamond', label: 'Diamond (Isometric)', icon: Diamond },
    { id: 'splat-star', label: 'Star (Scatter)', icon: Star },
  ];

  const voxelShapes = [
    { id: 1, label: 'Cube' },
    { id: 2, label: 'Slope 45°' },
    { id: 3, label: 'Gentle 22°' },
    { id: 5, label: 'Corner' },
    { id: 7, label: 'Slab' },
    { id: 9, label: 'Stairs' },
  ];

  const voxelBlockSizes = [16, 32, 48, 64, 128, 256];
  const radiusPresets = [1, 2, 3, 5, 8];

  const handleShapeSelect = (shape: BrushShape) => {
    soundSynth?.playUiClick?.();
    setBrushShape(shape);
  };

  const handleRadiusPreset = (r: number) => {
    soundSynth?.playUiClick?.();
    setBrushRadius(r);
  };

  const modeLabel = effectiveMode === 'voxel' ? '3D Voxel' : effectiveMode === 'splat' ? 'Terrain Splat' : effectiveMode === 'prop' ? 'Props & Foliage' : 'Grid Paint';

  return (
    <div className={`flex flex-col gap-2.5 p-2.5 rounded-lg bg-[#070e1c] border border-border/40 font-mono text-xs ${className}`}>
      {/* Top Header: Mode Summary */}
      <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>{modeLabel} Settings</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
          {showVoxelControls && (
            <>
              <span className="text-primary font-bold">{voxelBlockSizePx}px Scale</span>
              <span>•</span>
              <span className="text-foreground font-bold">{voxelShapes.find((s) => s.id === activeVoxelShape)?.label || 'Cube'}</span>
            </>
          )}
          {showShapeRadius && (
            <>
              <span className="text-foreground font-bold">{brushShape.toUpperCase()}</span>
              <span>•</span>
              <span className="text-primary font-bold">R:{brushRadius}</span>
            </>
          )}
        </div>
      </div>

      {/* Voxel Controls: Block Scale & Shape Archetypes */}
      {showVoxelControls && (
        <div className="space-y-2 pb-1 border-b border-border/20">
          {/* Block Scale Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Scale:</span>
            <div className="flex items-center gap-1 flex-1 bg-[#040812] p-1 rounded border border-border/30">
              {voxelBlockSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setVoxelBlockSizePx(size);
                  }}
                  className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                    voxelBlockSizePx === size
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Voxel Shape Archetypes */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Shape:</span>
            <div className="grid grid-cols-6 gap-1 flex-1">
              {voxelShapes.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setActiveVoxelShape(s.id);
                  }}
                  className={`py-0.5 px-1 rounded text-[9px] font-bold text-center transition-all cursor-pointer truncate ${
                    activeVoxelShape === s.id
                      ? 'bg-primary/20 text-primary border border-primary/50 font-bold shadow-sm shadow-primary/20'
                      : 'bg-[#040812] text-muted-foreground border border-border/30 hover:border-border hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voxel Editing Constraints: Layer Lock, Plane Selector & Build Up Mode */}
      {showVoxelControls && (
        <div className="pt-2 pb-1 border-b border-border/20 space-y-2">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground font-bold uppercase flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary" /> Editing Constraints
            </span>
            <span className="text-[8px] font-mono text-muted-foreground">
              Map Bounds: Strict
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 1. Layer Lock / Plane Lock Button */}
            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                setVoxelPlaneLockEnabled(!voxelPlaneLockEnabled);
              }}
              title={
                voxelPlaneLockEnabled
                  ? `Locked to Plane Y=${voxelTargetPlaneY}. Painting will only touch this elevation.`
                  : 'Layer Lock is OFF. Brushing touches any hit surface.'
              }
              className={`flex items-center justify-between px-2 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                voxelPlaneLockEnabled
                  ? 'bg-primary/20 text-primary border-primary/50 shadow-sm shadow-primary/20'
                  : 'bg-[#040812] text-muted-foreground border-border/30 hover:border-border hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1">
                {voxelPlaneLockEnabled ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>Layer Lock</span>
              </div>
              <span className="font-mono text-[8px] px-1 rounded bg-black/40">
                {voxelPlaneLockEnabled ? `Y=${voxelTargetPlaneY}` : 'OFF'}
              </span>
            </button>

            {/* 2. Build Up Mode Button */}
            <button
              type="button"
              onClick={() => {
                soundSynth?.playUiClick?.();
                setVoxelBuildUpMode(!voxelBuildUpMode);
              }}
              title={
                voxelBuildUpMode
                  ? 'Build Up Mode ON: Stacks blocks vertically atop clicked surface voxels.'
                  : 'Build Up Mode OFF: Normal surface/plane paint.'
              }
              className={`flex items-center justify-between px-2 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                voxelBuildUpMode
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/20'
                  : 'bg-[#040812] text-muted-foreground border-border/30 hover:border-border hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Build Up</span>
              </div>
              <span className="font-mono text-[8px] px-1 rounded bg-black/40">
                {voxelBuildUpMode ? 'STACK' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Plane Y Adjuster & Quick Elevation Buttons */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Plane Y:</span>
            <div className="flex items-center gap-1 flex-1 bg-[#040812] p-1 rounded border border-border/30">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setVoxelTargetPlaneY(Math.max(0, voxelTargetPlaneY - 1));
                }}
                disabled={voxelTargetPlaneY <= 0}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted/20 hover:bg-muted/40 disabled:opacity-30 cursor-pointer"
                title="Decrease Plane Y"
              >
                <ArrowDown className="w-2.5 h-2.5" />
              </button>
              <input
                type="range"
                min={0}
                max={31}
                value={voxelTargetPlaneY}
                onChange={(e) => setVoxelTargetPlaneY(parseInt(e.target.value))}
                className="flex-1 accent-primary h-1 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setVoxelTargetPlaneY(Math.min(31, voxelTargetPlaneY + 1));
                }}
                disabled={voxelTargetPlaneY >= 31}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted/20 hover:bg-muted/40 disabled:opacity-30 cursor-pointer"
                title="Increase Plane Y"
              >
                <ArrowUp className="w-2.5 h-2.5" />
              </button>
              <span className="text-[9px] font-mono font-bold text-foreground w-6 text-center">
                {voxelTargetPlaneY}
              </span>
            </div>

            {/* Pick Surface Elevation Button */}
            <button
              type="button"
              onClick={() => {
                if (hoveredVoxel) {
                  soundSynth?.playUiClick?.();
                  setVoxelTargetPlaneY(hoveredVoxel.wy);
                }
              }}
              disabled={!hoveredVoxel}
              className="px-1.5 py-1 rounded text-[8px] font-bold border border-border/30 bg-[#040812] hover:border-primary/40 text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              title="Lock plane to currently hovered voxel elevation"
            >
              <Crosshair className="w-2.5 h-2.5 text-primary" />
              <span>Pick</span>
            </button>
          </div>

          {/* Multi-Plane Mask Selector */}
          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-[9px] text-muted-foreground w-12 shrink-0 font-bold uppercase">Planes:</span>
            <div className="flex items-center gap-1 flex-1 overflow-x-auto py-0.5 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setVoxelPlaneMask(null);
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                  voxelPlaneMask === null
                    ? 'bg-primary text-black font-extrabold'
                    : 'bg-[#040812] text-muted-foreground hover:text-foreground border border-border/20'
                }`}
                title="Single active plane governed by Plane Y"
              >
                Target Only
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => {
                const isActive = voxelPlaneMask?.includes(p) ?? false;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      toggleVoxelPlaneInMask(p);
                    }}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary/30 text-primary border border-primary/50'
                        : 'bg-[#040812] text-muted-foreground hover:text-foreground border border-border/20'
                    }`}
                    title={`Toggle plane Y=${p} in multi-plane paint mask`}
                  >
                    Y{p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shape Selector Buttons — only for grid & splat modes */}
      {showShapeRadius && (
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
      )}

      {/* Radius Slider + Quick Presets — only for grid & splat modes */}
      {showShapeRadius && (
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
      )}

      {/* Splat Mode Parameters — opacity, scatter, rotation jitter */}
      {showSplatControls && (
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

      {/* Scale & Rotation — shown for prop and splat modes */}
      {showPropControls && (
        <div className={`${!showSplatControls ? 'pt-2 border-t border-border/20' : ''} space-y-2`}>
          <div className="grid grid-cols-2 gap-2">
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
        </div>
      )}

      {/* Grid Mode Helpers */}
      {showGridSnap && (
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
