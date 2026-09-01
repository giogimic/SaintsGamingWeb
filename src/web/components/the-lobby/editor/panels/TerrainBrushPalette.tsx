'use client';

import React, { useMemo } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import {
  Circle,
  Square,
  Diamond,
  Star,
  Shuffle,
  Droplets,
  Paintbrush,
  RotateCw,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';
import { ensureMapHasStudioTilesets, DEFAULT_STUDIO_TILESETS } from '@/shared/game/studioTilesetBootstrap';

interface TerrainSwatch {
  id: string;
  name: string;
  gid: number;
  sourceSheet: string;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  material: string;
}

/**
 * Terrain Brush Palette — dedicated terrain paint selector.
 * Replaces the grid tileset picker when in Splat/Terrain Paint mode.
 * Shows visual texture swatches, brush controls, opacity/scatter sliders.
 */
export const TerrainBrushPalette: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
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
  const showToast = useGameStore((s) => s.showToast);

  // Build terrain swatches from available tilesets
  const swatches = useMemo((): TerrainSwatch[] => {
    if (!activeMapData) return [];
    const map = ensureMapHasStudioTilesets(activeMapData);
    const tilesets = map.tilesets?.length ? map.tilesets : DEFAULT_STUDIO_TILESETS;
    
    const result: TerrainSwatch[] = [];
    const MATERIAL_NAMES = ['Grass', 'Dirt', 'Sand', 'Stone', 'Wood', 'Water', 'Snow', 'Gravel'];

    for (const ts of tilesets) {
      if (!ts.columns || ts.columns <= 0) continue;
      const tileW = ts.tilewidth || 16;
      const tileH = ts.tileheight || 16;
      const margin = ts.margin ?? 0;
      const spacing = ts.spacing ?? 0;
      const imgW = ts.imagewidth || ts.columns * tileW;
      const imgH = ts.imageheight || 256;
      const maxRows = Math.max(1, Math.floor((imgH - margin) / (tileH + spacing)));
      const maxTiles = Math.min(maxRows * ts.columns, 64); // Cap for performance

      for (let i = 0; i < maxTiles; i++) {
        const col = i % ts.columns;
        const row = Math.floor(i / ts.columns);
        const gid = ts.firstgid + i;
        const matIdx = i % MATERIAL_NAMES.length;

        result.push({
          id: `swatch-${gid}`,
          name: `${MATERIAL_NAMES[matIdx]} ${Math.floor(i / MATERIAL_NAMES.length) + 1}`,
          gid,
          sourceSheet: ts.imageSource || '',
          sourceX: margin + col * (tileW + spacing),
          sourceY: margin + row * (tileH + spacing),
          sourceWidth: tileW,
          sourceHeight: tileH,
          material: MATERIAL_NAMES[matIdx],
        });
      }
    }

    return result;
  }, [activeMapData]);

  const activeSwatch = swatches.find((s) => s.gid === activeBrushTileId);

  const getImageUrl = (source: string) => {
    if (!source) return '';
    return source.startsWith('/') || source.startsWith('http') ? source : `/game-assets/tilesets/${source}`;
  };

  const handleSelectSwatch = (swatch: TerrainSwatch) => {
    soundSynth?.playSelectSound?.();
    useEditorStore.getState().setActiveStampAsset(null);
    setActiveBrushTileId(swatch.gid, true);
    if (useEditorStore.getState().activeLayerIdx === -1) {
      useEditorStore.getState().setActiveLayerIdx(0);
    }
    useEditorStore.getState().setBrushMode('paint');
  };

  const ShapeIcon = ({ shape }: { shape: string }) => {
    switch (shape) {
      case 'circle': return <Circle className="w-3.5 h-3.5" />;
      case 'square': return <Square className="w-3.5 h-3.5" />;
      case 'diamond': return <Diamond className="w-3.5 h-3.5" />;
      case 'splat-star': return <Star className="w-3.5 h-3.5" />;
      default: return <Circle className="w-3.5 h-3.5" />;
    }
  };

  if (!activeMapData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <Paintbrush className="h-8 w-8 mb-2 text-amber-400/60 animate-pulse" />
        <p className="font-bold text-foreground">No map loaded</p>
        <p className="text-[11px] mt-1">Open a map to start terrain painting.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* ── Active Swatch Preview ── */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0a1628]/60 border border-border/30">
        <div
          className="w-14 h-14 rounded-lg border-2 border-primary/40 overflow-hidden shrink-0"
          style={{
            backgroundImage: activeSwatch
              ? `url('${getImageUrl(activeSwatch.sourceSheet)}')`
              : undefined,
            backgroundPosition: activeSwatch
              ? `-${activeSwatch.sourceX}px -${activeSwatch.sourceY}px`
              : undefined,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            backgroundSize: 'auto',
            backgroundColor: activeSwatch ? undefined : '#1a1a2e',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-[11px] truncate">
            {activeSwatch?.name || 'No terrain selected'}
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            GID: {activeBrushTileId} · {activeSwatch?.material || '—'}
          </div>
        </div>
      </div>

      {/* ── Terrain Swatches Grid ── */}
      <div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          Terrain Textures
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
          {swatches.map((swatch) => {
            const isActive = activeBrushTileId === swatch.gid;
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => handleSelectSwatch(swatch)}
                className={`
                  relative w-full aspect-square rounded-md overflow-hidden cursor-pointer
                  transition-all duration-150 border-2
                  ${isActive
                    ? 'border-primary shadow-[0_0_8px_rgba(203,178,106,0.3)] scale-105 z-10'
                    : 'border-border/30 hover:border-primary/40 hover:scale-105'
                  }
                `}
                title={`${swatch.name} (GID ${swatch.gid})`}
                style={{
                  backgroundImage: `url('${getImageUrl(swatch.sourceSheet)}')`,
                  backgroundPosition: `-${swatch.sourceX}px -${swatch.sourceY}px`,
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                  backgroundSize: 'auto',
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10 ring-1 ring-inset ring-primary/50" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Brush Controls ── */}
      <div className="flex flex-col gap-2.5 p-2 rounded-lg bg-[#0a1628]/40 border border-border/20">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Brush Controls
        </div>

        {/* Brush Shape */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">Shape</span>
          <div className="flex items-center gap-0.5">
            {(['circle', 'square', 'diamond', 'splat-star'] as const).map((shape) => {
              const isActive = brushShape === shape;
              return (
                <button
                  key={shape}
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setBrushShape(shape);
                  }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent'
                  }`}
                  title={shape === 'splat-star' ? 'Star' : shape}
                >
                  <ShapeIcon shape={shape} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">Size</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={brushRadius}
            onChange={(e) => setBrushRadius(parseInt(e.target.value))}
            className="flex-1 accent-primary h-1 cursor-pointer"
          />
          <span className="text-[9px] text-foreground font-bold w-6 text-right">{brushRadius}</span>
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0 flex items-center gap-1">
            <Droplets className="w-3 h-3" /> Opacity
          </span>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={Math.round(splatOpacity * 100)}
            onChange={(e) => setSplatOpacity(parseInt(e.target.value) / 100)}
            className="flex-1 accent-primary h-1 cursor-pointer"
          />
          <span className="text-[9px] text-foreground font-bold w-8 text-right">{Math.round(splatOpacity * 100)}%</span>
        </div>

        {/* Scatter / Density */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">Scatter</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(splatScatter * 100)}
            onChange={(e) => setSplatScatter(parseInt(e.target.value) / 100)}
            className="flex-1 accent-primary h-1 cursor-pointer"
          />
          <span className="text-[9px] text-foreground font-bold w-8 text-right">{Math.round(splatScatter * 100)}%</span>
        </div>

        {/* Rotation Mode */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Shuffle className="w-3 h-3 text-primary/70" /> Rotation
          </span>
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setSplatRotationRandomize(!splatRotationRandomize);
            }}
            className={`
              relative w-7 h-4 rounded-full transition-colors cursor-pointer
              ${splatRotationRandomize ? 'bg-primary' : 'bg-border/60'}
            `}
            title={splatRotationRandomize ? 'Random particle rotation enabled' : 'Fixed particle angle'}
          >
            <span
              className={`
                absolute top-0.5 h-3 w-3 rounded-full bg-foreground transition-transform
                ${splatRotationRandomize ? 'translate-x-3.5' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>

        {/* Fixed Angle & Dial (when random is off) */}
        {!splatRotationRandomize && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-border/10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-12 shrink-0 flex items-center gap-1">
                <Compass className="w-3 h-3" /> Angle
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={brushRotation}
                onChange={(e) => setBrushRotation(parseInt(e.target.value))}
                className="flex-1 accent-primary h-1 cursor-pointer"
              />
              <span className="text-[9px] text-foreground font-bold w-8 text-right">{brushRotation}°</span>
            </div>

            {/* Step rotation buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setBrushRotation(((brushRotation - 90) % 360 + 360) % 360);
                }}
                className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded bg-[#0b1626] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Rotate -90° (Shift+R)"
              >
                <RotateCcw className="w-2.5 h-2.5" /> -90°
              </button>
              <button
                type="button"
                onClick={() => {
                  soundSynth?.playUiClick?.();
                  setBrushRotation(((brushRotation + 90) % 360 + 360) % 360);
                }}
                className="flex-1 flex items-center justify-center gap-0.5 py-1 rounded bg-[#0b1626] border border-border/30 hover:border-primary/40 text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Rotate +90° (R)"
              >
                <RotateCw className="w-2.5 h-2.5" /> +90°
              </button>
              {[0, 45, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => {
                    soundSynth?.playUiClick?.();
                    setBrushRotation(deg);
                  }}
                  className={`px-1.5 py-1 rounded border text-[9px] font-bold transition-colors cursor-pointer ${
                    brushRotation === deg
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-[#0b1626] border-border/30 text-muted-foreground hover:text-foreground'
                  }`}
                  title={`Set angle to ${deg}°`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scale Modifier */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/10">
          <span className="text-[9px] text-muted-foreground w-12 shrink-0">Scale</span>
          <input
            type="range"
            min={50}
            max={250}
            step={10}
            value={Math.round(stampScale * 100)}
            onChange={(e) => setStampScale(parseInt(e.target.value) / 100)}
            className="flex-1 accent-primary h-1 cursor-pointer"
          />
          <span className="text-[9px] text-foreground font-bold w-8 text-right">{Math.round(stampScale * 100)}%</span>
        </div>

        {/* Shortcut hint */}
        <div className="text-[8.5px] text-muted-foreground/80 bg-black/30 rounded px-1.5 py-1 border border-border/10 flex items-center justify-between">
          <span>Rotate: <strong className="text-primary font-mono">[R]</strong> (+90°) / <strong className="text-primary font-mono">[Shift+R]</strong></span>
          <span>Fine: <strong className="text-primary font-mono">[ / ]</strong> (15°)</span>
        </div>
      </div>

      {/* ── Quick Terrain Presets ── */}
      <div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
          Quick Presets
        </div>
        <div className="flex flex-wrap gap-1">
          {[
            { name: 'Fine Grass', size: 1, shape: 'circle' as const, scatter: 0.3 },
            { name: 'Rough Terrain', size: 5, shape: 'splat-star' as const, scatter: 0.8 },
            { name: 'Path Dirt', size: 3, shape: 'square' as const, scatter: 0.2 },
            { name: 'Scatter Stones', size: 3, shape: 'diamond' as const, scatter: 0.9 },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setBrushRadius(preset.size);
                setBrushShape(preset.shape);
                setSplatScatter(preset.scatter);
                showToast(`Applied preset: ${preset.name}`);
              }}
              className="px-2 py-1 rounded-md text-[9px] font-bold border border-border/40 bg-[#0a1628]/40 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
