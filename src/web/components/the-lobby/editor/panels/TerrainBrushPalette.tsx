'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore } from '../editor-store';
import {
  Paintbrush,
  Sparkles,
  Filter,
  Check,
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
 * Terrain Brush Palette — dedicated material texture swatch picker.
 * Allows picking ground textures for continuous splat & decal painting.
 */
export const TerrainBrushPalette: React.FC = () => {
  const activeMapData = useGameStore((s) => s.activeMapData);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const setBrushRadius = useEditorStore((s) => s.setBrushRadius);
  const setBrushShape = useEditorStore((s) => s.setBrushShape);
  const setSplatScatter = useEditorStore((s) => s.setSplatScatter);
  const showToast = useGameStore((s) => s.showToast);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

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
          material: MATERIAL_NAMES[matIdx].toUpperCase(),
        });
      }
    }

    return result;
  }, [activeMapData]);

  const filteredSwatches = useMemo(() => {
    if (categoryFilter === 'ALL') return swatches;
    return swatches.filter((s) => s.material === categoryFilter);
  }, [swatches, categoryFilter]);

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
    showToast(`Selected Material: ${swatch.name}`);
  };

  if (!activeMapData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground">
        <Paintbrush className="h-8 w-8 mb-2 text-primary/60 animate-pulse" />
        <p className="font-bold text-foreground">No map loaded</p>
        <p className="text-[11px] mt-1">Open a map to start terrain painting.</p>
      </div>
    );
  }

  const categories = ['ALL', 'GRASS', 'DIRT', 'STONE', 'SAND', 'WATER', 'WOOD', 'SNOW'];

  return (
    <div className="flex flex-col gap-3 font-mono text-xs">
      {/* ── Active Swatch Preview Card ── */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#070e1c] border border-border/40">
        <div
          className="w-12 h-12 rounded-lg border-2 border-primary/50 overflow-hidden shrink-0 shadow-md shadow-black/60"
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
            backgroundColor: activeSwatch ? undefined : '#040812',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground text-[11px] truncate flex items-center gap-1.5">
            <span>{activeSwatch?.name || 'Texture Swatch'}</span>
            <span className="rounded bg-primary/20 text-primary px-1.5 py-0.2 text-[8px] font-bold">
              {activeSwatch?.material || 'TERRAIN'}
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            GID #{activeBrushTileId} • Splat Ready
          </div>
        </div>
      </div>

      {/* ── Material Filter Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setCategoryFilter(cat);
            }}
            className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-primary text-black font-extrabold'
                : 'bg-[#060e1c] text-muted-foreground border border-border/30 hover:border-border hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Terrain Swatches Grid ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span>Available Textures</span>
          <span className="text-[9px] text-primary">{filteredSwatches.length} Swatches</span>
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-[180px] overflow-y-auto custom-scrollbar pr-1 p-1 rounded-lg bg-[#040812] border border-border/30">
          {filteredSwatches.map((swatch) => {
            const isActive = activeBrushTileId === swatch.gid;
            return (
              <button
                key={swatch.id}
                type="button"
                onClick={() => handleSelectSwatch(swatch)}
                className={`
                  relative w-full aspect-square rounded overflow-hidden cursor-pointer
                  transition-all duration-150 border
                  ${isActive
                    ? 'border-primary ring-2 ring-primary/40 scale-105 z-10'
                    : 'border-border/30 hover:border-primary/50 hover:scale-105 bg-[#060e1c]'
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
                  <div className="absolute inset-0 bg-primary/15" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Quick Terrain Presets ── */}
      <div className="space-y-1.5 pt-1 border-t border-border/20">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Terrain Brush Presets
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { name: 'Soft Grassland', size: 3, shape: 'circle' as const, scatter: 0.4 },
            { name: 'Dense Foliage', size: 4, shape: 'splat-star' as const, scatter: 0.75 },
            { name: 'Dirt Path Edge', size: 2, shape: 'square' as const, scatter: 0.15 },
            { name: 'Rocky Debris', size: 3, shape: 'diamond' as const, scatter: 0.85 },
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
              className="p-1.5 rounded bg-[#070e1c] border border-border/30 hover:border-primary/50 text-left transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="text-[9px] font-bold text-foreground">{preset.name}</div>
              <span className="text-[8px] text-primary font-mono">{preset.shape}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
