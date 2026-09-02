'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore, type CustomTerrainSwatch } from '../editor-store';
import {
  Paintbrush,
  Sparkles,
  Scissors,
  Filter,
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Trash2,
  Plus,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export interface SeamlessMaterial {
  id: string;
  name: string;
  material: 'GRASS' | 'DIRT' | 'SAND' | 'STONE' | 'WATER' | 'SNOW' | 'WOOD' | 'LAVA' | 'SWAMP' | 'DUNGEON' | 'ICE';
  textureUrl: string;
  color: string;
  uOffset?: number;
  vOffset?: number;
  uScale?: number;
  vScale?: number;
}

const BUILTIN_SEAMLESS_MATERIALS: SeamlessMaterial[] = [
  {
    id: 'mat_gunmetal_base',
    name: 'Gunmetal Base Block',
    material: 'STONE',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#2a2d34',
    uOffset: 0,
    vOffset: 0,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_grass_lush',
    name: 'Lush Meadow Grass',
    material: 'GRASS',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#22c55e',
    uOffset: 0,
    vOffset: 0.667,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_dirt_soil',
    name: 'Rich Loam Soil',
    material: 'DIRT',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#a16207',
    uOffset: 0.333,
    vOffset: 0.667,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_sand_fine',
    name: 'Golden Desert Sand',
    material: 'SAND',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#eab308',
    uOffset: 0.667,
    vOffset: 0.667,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_stone_cobble',
    name: 'Village Cobblestone',
    material: 'STONE',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#94a3b8',
    uOffset: 0,
    vOffset: 0,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_water_river',
    name: 'Crystal River Water',
    material: 'WATER',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#38bdf8',
    uOffset: 0.333,
    vOffset: 0.333,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_snow_powder',
    name: 'Winter Powder Snow',
    material: 'SNOW',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#e2e8f0',
    uOffset: 0,
    vOffset: 0.333,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_wood_plank',
    name: 'Weathered Wood Deck',
    material: 'WOOD',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#78350f',
    uOffset: 0.5,
    vOffset: 0,
    uScale: 0.5,
    vScale: 0.333,
  },
  {
    id: 'mat_lava_molten',
    name: 'Molten Magma Flow',
    material: 'LAVA',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#ef4444',
    uOffset: 0.667,
    vOffset: 0.333,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_swamp_marsh',
    name: 'Dark Murky Marsh',
    material: 'SWAMP',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#3f6212',
    uOffset: 0.333,
    vOffset: 0,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_brick_dungeon',
    name: 'Ancient Flagstone',
    material: 'DUNGEON',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#475569',
    uOffset: 0,
    vOffset: 0,
    uScale: 0.333,
    vScale: 0.333,
  },
  {
    id: 'mat_ice_glacial',
    name: 'Glacial Blue Ice',
    material: 'ICE',
    textureUrl: '/game-assets/tilesets/terrain-overworld.png',
    color: '#67e8f9',
    uOffset: 0,
    vOffset: 0.333,
    uScale: 0.333,
    vScale: 0.333,
  },
];

interface TerrainBrushPaletteProps {
  onOpenSlicer?: () => void;
}

export const TerrainBrushPalette: React.FC<TerrainBrushPaletteProps> = ({ onOpenSlicer }) => {
  const customTerrainSwatches = useEditorStore((s) => s.customTerrainSwatches);
  const removeCustomTerrainSwatch = useEditorStore((s) => s.removeCustomTerrainSwatch);
  const activeStampAsset = useEditorStore((s) => s.activeStampAsset);
  const setActiveStampAsset = useEditorStore((s) => s.setActiveStampAsset);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const setActiveVoxelMaterialId = useEditorStore((s) => s.setActiveVoxelMaterialId);
  const voxelBlockSizePx = useEditorStore((s) => s.voxelBlockSizePx);
  const activeVoxelShape = useEditorStore((s) => s.activeVoxelShape);
  const showToast = useGameStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<'SEAMLESS' | 'CUSTOM'>('SEAMLESS');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(true);

  const filteredSeamless = useMemo(() => {
    if (categoryFilter === 'ALL') return BUILTIN_SEAMLESS_MATERIALS;
    return BUILTIN_SEAMLESS_MATERIALS.filter((m) => m.material === categoryFilter);
  }, [categoryFilter]);

  const handleSelectSeamless = (mat: SeamlessMaterial) => {
    soundSynth?.playSelectSound?.();
    setActiveLayerType('paint-splat');
    setBrushMode('paint');

    const materialMap: Record<string, number> = {
      GRASS: 2,
      DIRT: 3,
      STONE: 4,
      SAND: 5,
      WATER: 6,
      WOOD: 7,
      SNOW: 8,
      LAVA: 9,
      SWAMP: 10,
      DUNGEON: 11,
      ICE: 12,
    };
    const voxelMat = mat.id === 'mat_gunmetal_base' ? 1 : (materialMap[mat.material] ?? 2);
    setActiveVoxelMaterialId(voxelMat);

    setActiveStampAsset({
      assetId: mat.id,
      url: mat.textureUrl,
      width: 1,
      height: 1,
      uOffset: mat.uOffset ?? 0,
      vOffset: mat.vOffset ?? 0,
      uScale: mat.uScale ?? 1,
      vScale: mat.vScale ?? 1,
    });

    showToast(`Selected "${mat.name}". Left-click to paint 3D voxel terrain.`);
  };

  const handleSelectCustomSwatch = (swatch: CustomTerrainSwatch) => {
    soundSynth?.playSelectSound?.();
    setActiveLayerType('paint-splat');
    setBrushMode('paint');

    setActiveStampAsset({
      assetId: swatch.id,
      url: swatch.sourceSheet,
      width: swatch.sourceWidth / 16,
      height: swatch.sourceHeight / 16,
      uOffset: swatch.uOffset,
      vOffset: swatch.vOffset,
      uScale: swatch.uScale,
      vScale: swatch.vScale,
    });

    showToast(`Selected custom swatch "${swatch.name}".`);
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14]/95 text-foreground font-mono select-none text-xs">
      
      {/* Top Header & Slicer Shortcut */}
      <div className="p-3 border-b border-border/40 bg-[#0a1628]/80 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/20 text-primary border border-primary/40">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <span>3D Voxel &amp; Terrain Blocks</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/40">
                  Voxel Mode
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Unified block-based 2.5D / 3D world building with adaptive slopes
              </div>
            </div>
          </div>

          {onOpenSlicer && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenSlicer()}
                className="px-2.5 py-1 rounded bg-[#0a1628]/60 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Full Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenSlicer()}
                className="px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Cut from Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* Voxel Block Resolution & Shape Archetypes Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30 text-[10px]">
          {/* Block Size Preset Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-bold">Block Scale:</span>
            <div className="flex items-center gap-1 bg-[#040912] p-1 rounded-md border border-border/40">
              {[16, 32, 48, 64, 128, 256].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    useEditorStore.getState().setVoxelBlockSizePx(size);
                    showToast(`Block Scale set to ${size}px`);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    voxelBlockSizePx === size
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Voxel Shape Archetypes Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground font-bold">Shape:</span>
            <div className="flex items-center gap-1 bg-[#040912] p-1 rounded-md border border-border/40">
              {[
                { id: 1, label: 'Cube' },
                { id: 2, label: 'Slope 45°' },
                { id: 3, label: 'Gentle 22°' },
                { id: 5, label: 'Corner' },
                { id: 7, label: 'Slab' },
                { id: 9, label: 'Stairs' },
              ].map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    soundSynth?.playSelectSound?.();
                    useEditorStore.getState().setActiveVoxelShape(shape.id);
                    showToast(`Shape set to ${shape.label}`);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    activeVoxelShape === shape.id
                      ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {shape.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tool Guide Banner */}
      <div className="border-b border-border/30 bg-[#071120]">
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 text-primary">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How To Paint Continuous Terrain</span>
          </div>
          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isGuideOpen && (
          <div className="px-3 pb-2.5 pt-1 text-[10px] text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#040912]/60 border-t border-border/20">
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">1. Choose Material:</span>
              Pick a seamless ground texture or custom sliced swatch from the palette below.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">2. Set Radius & Scatter:</span>
              Use the top toolbar to adjust brush size, scatter density, and circular/star falloff.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-primary mr-1">3. Paint Ground:</span>
              Left-click and drag across the ground. Enable Smart Auto-Edge for 9-slice transitions!
            </div>
          </div>
        )}
      </div>

      {/* Mode Tabs: Seamless vs Custom Sliced */}
      <div className="px-3 pt-2.5 border-b border-border/30 bg-[#081222]/80 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('SEAMLESS')}
            className={`pb-2 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'SEAMLESS'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Seamless Materials ({BUILTIN_SEAMLESS_MATERIALS.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOM')}
            className={`pb-2 px-1 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'CUSTOM'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom Sliced Swatches ({customTerrainSwatches.length})
          </button>
        </div>
      </div>

      {/* Category Filter for Seamless */}
      {activeTab === 'SEAMLESS' && (
        <div className="p-2 border-b border-border/30 bg-[#060e1c] flex flex-wrap gap-1.5">
          {['ALL', 'GRASS', 'DIRT', 'SAND', 'STONE', 'WATER', 'SNOW', 'WOOD', 'LAVA', 'SWAMP', 'DUNGEON', 'ICE'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-primary/20 text-primary border-primary/50'
                  : 'bg-[#0a1628] text-muted-foreground border-border/30 hover:border-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Swatch Grid */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {activeTab === 'SEAMLESS' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredSeamless.map((mat) => {
              const isSelected = activeStampAsset?.assetId === mat.id;
              return (
                <div
                  key={mat.id}
                  onClick={() => handleSelectSeamless(mat)}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-between gap-2 transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-primary/15 border-primary shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#0a1628]/60 border-border/40 hover:border-border hover:bg-[#0a1628]'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-muted-foreground border border-border/30 uppercase">
                      {mat.material}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>

                  {/* Swatch Visual Preview */}
                  <div
                    className="w-14 h-14 rounded-full border-2 border-border/50 shadow-inner flex items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: mat.color,
                      boxShadow: `inset 0 0 15px rgba(0,0,0,0.5)`,
                    }}
                  >
                    <div className="w-full h-full opacity-30 bg-radial-gradient" />
                  </div>

                  <div className="text-center font-bold text-foreground text-[11px] truncate w-full">
                    {mat.name}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {customTerrainSwatches.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {customTerrainSwatches.map((swatch) => {
                  const isSelected = activeStampAsset?.assetId === swatch.id;
                  return (
                    <div
                      key={swatch.id}
                      onClick={() => handleSelectCustomSwatch(swatch)}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-between gap-2 transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-primary/15 border-primary shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-[#0a1628]/60 border-border/40 hover:border-border hover:bg-[#0a1628]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-muted-foreground border border-border/30 uppercase">
                          {swatch.sourceWidth}×{swatch.sourceHeight}px
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>

                      {/* Swatch UV Crop Preview */}
                      <div
                        className="w-14 h-14 rounded border border-border/30 flex items-center justify-center overflow-hidden bg-[#040812]"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #091322 25%, transparent 25%), linear-gradient(-45deg, #091322 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #091322 75%), linear-gradient(-45deg, transparent 75%, #091322 75%)',
                          backgroundSize: '8px 8px',
                          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                        }}
                      >
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${swatch.sourceSheet})`,
                            backgroundPosition: `${swatch.uOffset * 100}% ${swatch.vOffset * 100}%`,
                            backgroundSize: `${(1 / swatch.uScale) * 100}% ${(1 / swatch.vScale) * 100}%`,
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>

                      <div className="text-center font-bold text-foreground text-[11px] truncate w-full">
                        {swatch.name}
                      </div>

                      {/* Delete Custom Swatch */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomTerrainSwatch(swatch.id);
                          showToast(`Removed "${swatch.name}"`);
                        }}
                        className="absolute top-1 right-1 p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Delete Swatch"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Scissors className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <div>No custom sliced swatches yet.</div>
                <div className="text-[10px] mt-1">Use the Sheet Slicer to cut textures from tilesets.</div>
                {onOpenSlicer && (
                  <button
                    type="button"
                    onClick={onOpenSlicer}
                    className="mt-3 px-3 py-1.5 rounded bg-primary/20 text-primary border border-primary/40 font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Open Sheet Slicer</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
