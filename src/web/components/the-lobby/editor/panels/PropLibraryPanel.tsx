'use client';

import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../store';
import { useEditorStore, type CustomPropItem } from '../editor-store';
import {
  TreePine,
  Sparkles,
  Scissors,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Maximize2,
  Filter,
  Check,
  Shield,
  Layers,
  Plus,
  Trash2,
  Compass,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface BuiltinProp {
  id: string;
  name: string;
  category: 'Tree' | 'Foliage' | 'Rock' | 'Building' | 'Decor' | 'Structure';
  sheetUrl: string;
  uOffset: number;
  vOffset: number;
  uScale: number;
  vScale: number;
  width: number;
  height: number;
  defaultScale: number;
  collision: 'SOLID' | 'NONE' | 'WATER';
}

const BUILTIN_PROPS: BuiltinProp[] = [
  {
    id: 'prop_oak_tree',
    name: 'Ancient Oak Tree',
    category: 'Tree',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.25,
    vOffset: 0.5,
    uScale: 0.125,
    vScale: 0.125,
    width: 2,
    height: 2,
    defaultScale: 1.2,
    collision: 'SOLID',
  },
  {
    id: 'prop_pine_tree',
    name: 'Forest Pine Tree',
    category: 'Tree',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.375,
    vOffset: 0.5,
    uScale: 0.125,
    vScale: 0.125,
    width: 2,
    height: 2,
    defaultScale: 1.3,
    collision: 'SOLID',
  },
  {
    id: 'prop_bush_round',
    name: 'Berry Bush',
    category: 'Foliage',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.125,
    vOffset: 0.25,
    uScale: 0.0625,
    vScale: 0.0625,
    width: 1,
    height: 1,
    defaultScale: 0.9,
    collision: 'NONE',
  },
  {
    id: 'prop_mossy_boulder',
    name: 'Mossy Boulder',
    category: 'Rock',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.5,
    vOffset: 0.25,
    uScale: 0.0625,
    vScale: 0.0625,
    width: 1,
    height: 1,
    defaultScale: 1.0,
    collision: 'SOLID',
  },
  {
    id: 'prop_stone_well',
    name: 'Village Well',
    category: 'Structure',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.625,
    vOffset: 0.25,
    uScale: 0.125,
    vScale: 0.125,
    width: 2,
    height: 2,
    defaultScale: 1.0,
    collision: 'SOLID',
  },
  {
    id: 'prop_wooden_fence',
    name: 'Wooden Fence',
    category: 'Structure',
    sheetUrl: '/game-assets/tilesets/terrain-overworld.png',
    uOffset: 0.75,
    vOffset: 0.125,
    uScale: 0.0625,
    vScale: 0.0625,
    width: 1,
    height: 1,
    defaultScale: 1.0,
    collision: 'SOLID',
  },
];

interface PropLibraryPanelProps {
  onOpenSlicer?: () => void;
}

export const PropLibraryPanel: React.FC<PropLibraryPanelProps> = ({ onOpenSlicer }) => {
  const customPropLibrary = useEditorStore((s) => s.customPropLibrary);
  const removeCustomPropItem = useEditorStore((s) => s.removeCustomPropItem);
  const activeCustomPropId = useEditorStore((s) => s.activeCustomPropId);
  const setActiveCustomPropId = useEditorStore((s) => s.setActiveCustomPropId);
  const setActiveStampAsset = useEditorStore((s) => s.setActiveStampAsset);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);
  const setBrushMode = useEditorStore((s) => s.setBrushMode);
  const stampScale = useEditorStore((s) => s.stampScale);
  const setStampScale = useEditorStore((s) => s.setStampScale);
  const brushRotation = useEditorStore((s) => s.brushRotation);
  const setBrushRotation = useEditorStore((s) => s.setBrushRotation);
  const showToast = useGameStore((s) => s.showToast);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [scaleJitter, setScaleJitter] = useState<boolean>(false);
  const [randomRotation, setRandomRotation] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(true);

  // Combine builtin and custom sliced props
  const allProps = useMemo(() => {
    const customFormatted: BuiltinProp[] = customPropLibrary.map((cp) => ({
      id: cp.id,
      name: cp.name,
      category: cp.category,
      sheetUrl: cp.sourceSheet,
      uOffset: cp.uOffset,
      vOffset: cp.vOffset,
      uScale: cp.uScale,
      vScale: cp.vScale,
      width: cp.sourceWidth / 16,
      height: cp.sourceHeight / 16,
      defaultScale: cp.defaultScale || 1.0,
      collision: cp.collision || 'SOLID',
    }));
    return [...customFormatted, ...BUILTIN_PROPS];
  }, [customPropLibrary]);

  const filteredProps = useMemo(() => {
    if (categoryFilter === 'ALL') return allProps;
    if (categoryFilter === 'CUSTOM') return allProps.filter((p) => p.id.startsWith('prop_slice_'));
    return allProps.filter((p) => p.category.toUpperCase() === categoryFilter.toUpperCase());
  }, [allProps, categoryFilter]);

  const handleSelectProp = (prop: BuiltinProp) => {
    soundSynth?.playSelectSound?.();
    setActiveCustomPropId(prop.id);
    setActiveLayerType('free-form');
    setBrushMode('paint');

    setActiveStampAsset({
      assetId: prop.id,
      url: prop.sheetUrl,
      width: prop.width,
      height: prop.height,
      uOffset: prop.uOffset,
      vOffset: prop.vOffset,
      uScale: prop.uScale,
      vScale: prop.vScale,
    });

    showToast(`Selected "${prop.name}". Click ground to place.`);
  };

  return (
    <div className="flex flex-col h-full bg-[#050b14]/95 text-foreground font-mono select-none text-xs">
      
      {/* Top Header & Cutter Shortcut */}
      <div className="p-3 border-b border-border/40 bg-[#0a1628]/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <TreePine className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <span>Prop & Foliage Studio</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                2.5D / 3D Objects
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Stamp environmental objects with rotation and scale
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
              <span>Cut New Prop</span>
            </button>
          </div>
        )}
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
            <span>How To Place Props & Foliage</span>
          </div>
          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isGuideOpen && (
          <div className="px-3 pb-2.5 pt-1 text-[10px] text-muted-foreground grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#040912]/60 border-t border-border/20">
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-emerald-400 mr-1">1. Pick Asset:</span>
              Choose a tree, boulder, or custom sliced prop from the catalog below.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-emerald-400 mr-1">2. Tune Scale & Spin:</span>
              Use the scale slider or press <kbd className="px-1 bg-black/50 border border-border/40 rounded text-primary">R</kbd> to rotate objects in 45° steps.
            </div>
            <div className="p-2 rounded bg-[#0a1628]/50 border border-border/30">
              <span className="font-bold text-emerald-400 mr-1">3. Stamp on Map:</span>
              Left-click ground to place. Right-click with erase tool to remove objects.
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="p-2 border-b border-border/30 bg-[#081222]/80 flex flex-wrap gap-1.5">
        {['ALL', 'CUSTOM', 'TREE', 'FOLIAGE', 'ROCK', 'STRUCTURE', 'DECOR'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-primary/20 text-primary border-primary/50'
                : 'bg-[#060e1c] text-muted-foreground border-border/30 hover:border-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Prop Grid & Placement Controls */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left: Prop Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredProps.map((prop) => {
              const isSelected = activeCustomPropId === prop.id;
              return (
                <div
                  key={prop.id}
                  onClick={() => handleSelectProp(prop)}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-between gap-2 transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-primary/15 border-primary shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#0a1628]/60 border-border/40 hover:border-border hover:bg-[#0a1628]'
                  }`}
                >
                  {/* Category Pill */}
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-muted-foreground border border-border/30 uppercase">
                      {prop.category}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>

                  {/* Prop Thumbnail */}
                  <div
                    className="w-16 h-16 rounded border border-border/30 flex items-center justify-center overflow-hidden bg-[#040812]"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #091322 25%, transparent 25%), linear-gradient(-45deg, #091322 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #091322 75%), linear-gradient(-45deg, transparent 75%, #091322 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    }}
                  >
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${prop.sheetUrl})`,
                        backgroundPosition: `${prop.uOffset * 100}% ${prop.vOffset * 100}%`,
                        backgroundSize: `${(1 / prop.uScale) * 100}% ${(1 / prop.vScale) * 100}%`,
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>

                  {/* Prop Details */}
                  <div className="w-full text-center">
                    <div className="font-bold text-foreground text-[11px] truncate w-full">
                      {prop.name}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono">
                      {prop.width}×{prop.height} tiles • {prop.collision}
                    </div>
                  </div>

                  {/* Delete Custom Prop Button */}
                  {prop.id.startsWith('prop_slice_') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomPropItem(prop.id);
                        showToast(`Removed "${prop.name}"`);
                      }}
                      className="absolute top-1 right-1 p-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Delete Custom Prop"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProps.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <TreePine className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <div>No props found in this category.</div>
              {onOpenSlicer && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenSlicer()}
                    className="px-3 py-1.5 rounded bg-[#0a1628]/60 text-muted-foreground hover:text-primary hover:bg-primary/20 border border-border/40 hover:border-primary/50 font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Use Full Sheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenSlicer()}
                    className="px-3 py-1.5 rounded bg-primary/20 text-primary border border-primary/40 font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Open Sheet Slicer</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Placement & Transform Controls */}
        <div className="w-full md:w-64 p-3 bg-[#060e1c] border-t md:border-t-0 md:border-l border-border/40 space-y-3.5">
          <div className="text-xs font-bold text-foreground">Placement Controls</div>

          {/* Stamp Scale Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Stamp Scale</span>
              <span className="font-bold text-primary">{stampScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={stampScale}
              onChange={(e) => setStampScale(parseFloat(e.target.value))}
              className="w-full accent-primary h-1 cursor-pointer"
            />
          </div>

          {/* Rotation Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Rotation Angle</span>
              <span className="font-bold text-primary">{brushRotation}°</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={0}
                max={315}
                step={45}
                value={brushRotation}
                onChange={(e) => setBrushRotation(parseInt(e.target.value))}
                className="flex-1 accent-primary h-1 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setBrushRotation((brushRotation + 45) % 360)}
                className="p-1.5 rounded bg-[#0a1628] border border-border/40 hover:border-border text-muted-foreground hover:text-foreground cursor-pointer"
                title="Rotate 45° (R)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Natural Variations */}
          <div className="pt-2 border-t border-border/30 space-y-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Natural Variations</div>
            
            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground">
              <input
                type="checkbox"
                checked={scaleJitter}
                onChange={(e) => setScaleJitter(e.target.checked)}
                className="accent-primary rounded"
              />
              <span>Scale Jitter (±20% size variance)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-foreground">
              <input
                type="checkbox"
                checked={randomRotation}
                onChange={(e) => setRandomRotation(e.target.checked)}
                className="accent-primary rounded"
              />
              <span>Randomize Spin per Stamp</span>
            </label>
          </div>

        </div>

      </div>

    </div>
  );
};
