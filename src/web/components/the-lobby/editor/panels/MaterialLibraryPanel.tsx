'use client';

import React, { useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Search,
  Palette,
  Check,
  Sparkles,
  Layers,
  Droplets,
  Mountain,
  Trees,
  Box,
  Flame,
  Plus,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface MaterialDefinition {
  id: string;
  voxelId: number;
  tileId: number;
  name: string;
  category: 'Natural' | 'Structural' | 'Liquid' | 'Mineral' | 'Stylized';
  color: string;
  physics: 'Solid' | 'Liquid' | 'Climbable' | 'Passable' | 'Hazard';
  emissive?: boolean;
  roughness: number;
  blurb: string;
}

const MATERIAL_CATALOG: MaterialDefinition[] = [
  {
    id: 'mat_grass_meadow',
    voxelId: 1,
    tileId: 17,
    name: 'Lush Meadow Grass',
    category: 'Natural',
    color: '#22c55e',
    physics: 'Solid',
    roughness: 0.8,
    blurb: 'Vibrant alpine grass topsoil with rich root structure.',
  },
  {
    id: 'mat_dirt_loam',
    voxelId: 2,
    tileId: 18,
    name: 'Rich Loam Soil',
    category: 'Natural',
    color: '#92400e',
    physics: 'Solid',
    roughness: 0.9,
    blurb: 'Deep earthen subsoil ideal for caves and trenches.',
  },
  {
    id: 'mat_stone_granite',
    voxelId: 3,
    tileId: 19,
    name: 'Granite Bedrock',
    category: 'Mineral',
    color: '#64748b',
    physics: 'Solid',
    roughness: 0.6,
    blurb: 'Dense volcanic stone that anchors mountain ranges.',
  },
  {
    id: 'mat_sand_golden',
    voxelId: 4,
    tileId: 20,
    name: 'Dune Sand',
    category: 'Natural',
    color: '#eab308',
    physics: 'Solid',
    roughness: 0.95,
    blurb: 'Fine wind-blown desert sand particles.',
  },
  {
    id: 'mat_snow_powder',
    voxelId: 5,
    tileId: 21,
    name: 'Alpine Powder Snow',
    category: 'Natural',
    color: '#e2e8f0',
    physics: 'Solid',
    roughness: 0.4,
    blurb: 'Pristine mountain snow cover with crystalline glint.',
  },
  {
    id: 'mat_wood_timber',
    voxelId: 6,
    tileId: 22,
    name: 'Heartwood Timber',
    category: 'Structural',
    color: '#78350f',
    physics: 'Solid',
    roughness: 0.7,
    blurb: 'Solid timber planks for framing and bridges.',
  },
  {
    id: 'mat_cobble_grey',
    voxelId: 7,
    tileId: 23,
    name: 'Cobblestone Masonry',
    category: 'Structural',
    color: '#475569',
    physics: 'Solid',
    roughness: 0.85,
    blurb: 'Hand-hewn fortress stone with mortar seams.',
  },
  {
    id: 'mat_brick_dungeon',
    voxelId: 8,
    tileId: 24,
    name: 'Chiseled Vault Brick',
    category: 'Structural',
    color: '#334155',
    physics: 'Solid',
    roughness: 0.7,
    blurb: 'Ancient ruins brickwork with subterranean moss.',
  },
  {
    id: 'mat_water_fresh',
    voxelId: 9,
    tileId: 25,
    name: 'Spring Water',
    category: 'Liquid',
    color: '#0284c7',
    physics: 'Liquid',
    roughness: 0.1,
    blurb: 'Clear fluid dynamics with subtle caustics.',
  },
  {
    id: 'mat_lava_molten',
    voxelId: 10,
    tileId: 26,
    name: 'Molten Magma',
    category: 'Liquid',
    color: '#f97316',
    physics: 'Hazard',
    emissive: true,
    roughness: 0.3,
    blurb: 'Viscous glowing lava pool dealing fire damage on contact.',
  },
  {
    id: 'mat_crystal_amber',
    voxelId: 11,
    tileId: 27,
    name: 'Resonant Amber Crystal',
    category: 'Mineral',
    color: '#d97706',
    physics: 'Solid',
    emissive: true,
    roughness: 0.2,
    blurb: 'Luminescent energy mineral utilized by ancient architects.',
  },
  {
    id: 'mat_obsidian_dark',
    voxelId: 12,
    tileId: 28,
    name: 'Obsidian Glass',
    category: 'Mineral',
    color: '#0f172a',
    physics: 'Solid',
    roughness: 0.15,
    blurb: 'Vitreous volcanic glass impervious to standard picks.',
  },
  {
    id: 'mat_leaves_canopy',
    voxelId: 13,
    tileId: 29,
    name: 'Dense Oak Canopy',
    category: 'Natural',
    color: '#15803d',
    physics: 'Passable',
    roughness: 0.8,
    blurb: 'Lush tree canopy allowing player passage.',
  },
  {
    id: 'mat_clay_terracotta',
    voxelId: 14,
    tileId: 30,
    name: 'Terracotta Clay',
    category: 'Structural',
    color: '#c2410c',
    physics: 'Solid',
    roughness: 0.75,
    blurb: 'Baked earthen clay for warm regional architecture.',
  },
  {
    id: 'mat_neon_grid',
    voxelId: 15,
    tileId: 31,
    name: 'Saints Gold Matrix',
    category: 'Stylized',
    color: '#f59e0b',
    physics: 'Solid',
    emissive: true,
    roughness: 0.25,
    blurb: 'Signature Saints Gaming gold alloy panel with light conduits.',
  },
];

const CATEGORIES = ['All', 'Natural', 'Structural', 'Liquid', 'Mineral', 'Stylized'] as const;

export function MaterialLibraryPanel() {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<(typeof CATEGORIES)[number]>('All');

  const activeVoxelMaterialId = useEditorStore((s) => s.activeVoxelMaterialId);
  const setActiveVoxelMaterialId = useEditorStore((s) => s.setActiveVoxelMaterialId);
  const activeBrushTileId = useEditorStore((s) => s.activeBrushTileId);
  const setActiveBrushTileId = useEditorStore((s) => s.setActiveBrushTileId);
  const customTerrainSwatches = useEditorStore((s) => s.customTerrainSwatches);
  const openPanel = useEditorStore((s) => s.openPanel);
  const showToast = useGameStore((s) => s.showToast);

  const filteredMaterials = useMemo(() => {
    return MATERIAL_CATALOG.filter((mat) => {
      const matchesSearch =
        mat.name.toLowerCase().includes(search.toLowerCase()) ||
        mat.blurb.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCat === 'All' || mat.category === selectedCat;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCat]);

  const handleSelectMaterial = (mat: MaterialDefinition) => {
    soundSynth?.playSelectSound?.();
    setActiveVoxelMaterialId(mat.voxelId);
    setActiveBrushTileId(mat.tileId);
    showToast(`Active Material: ${mat.name}`);
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground/60" />
        <input
          type="text"
          placeholder="Filter materials, minerals, textures..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-border/50 rounded-lg text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
        />
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider uppercase transition-colors shrink-0 ${
              selectedCat === cat
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Material Grid ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {filteredMaterials.map((mat) => {
          const isSelected = activeVoxelMaterialId === mat.voxelId;
          return (
            <div
              key={mat.id}
              onClick={() => handleSelectMaterial(mat)}
              className={`flex items-center gap-3 p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-primary/15 border-primary/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-black/30 border-border/40 hover:bg-white/5 hover:border-border/70'
              }`}
            >
              {/* Swatch Preview */}
              <div
                className="w-9 h-9 rounded-lg border border-white/20 shrink-0 shadow-inner flex items-center justify-center relative overflow-hidden"
                style={{ backgroundColor: mat.color }}
              >
                {mat.emissive && (
                  <Sparkles className="w-3.5 h-3.5 text-white/90 drop-shadow animate-pulse" />
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-bold truncate text-[11px] ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {mat.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground shrink-0">
                    {mat.physics}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                  {mat.blurb}
                </p>
              </div>
            </div>
          );
        })}

        {filteredMaterials.length === 0 && (
          <div className="py-8 text-center text-muted-foreground/60">
            No materials found matching &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* ── Custom Swatches Bar ── */}
      {customTerrainSwatches && customTerrainSwatches.length > 0 && (
        <div className="pt-2 border-t border-border/30">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 flex items-center justify-between">
            <span>Custom Sliced Swatches ({customTerrainSwatches.length})</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {customTerrainSwatches.map((swatch) => (
              <button
                key={swatch.id}
                onClick={() => {
                  soundSynth?.playSelectSound?.();
                  setActiveBrushTileId(999);
                  showToast(`Custom swatch: ${swatch.name}`);
                }}
                className="flex items-center gap-1 px-2 py-1 bg-black/40 border border-border/40 hover:border-primary/40 rounded-lg text-[10px] shrink-0"
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20 shrink-0 bg-emerald-500"
                />
                <span className="truncate max-w-[80px]">{swatch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Actions ── */}
      <div className="pt-2 border-t border-border/30 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            openPanel('interface');
            showToast('Sheet Slicer / Custom Texture Editor');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border/40 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3 text-primary" />
          <span>Import Custom Texture...</span>
        </button>
        <span className="text-[10px] text-muted-foreground/60 font-mono">
          ID: {activeVoxelMaterialId} / GID: {activeBrushTileId}
        </span>
      </div>
    </div>
  );
}
