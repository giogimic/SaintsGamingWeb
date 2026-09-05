'use client';

import React, { useState } from 'react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Sliders,
  Layers as LayersIcon,
  Sparkles,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

interface LayerItem {
  id: string;
  name: string;
  layerIdx: number;
  type: 'grid' | 'paint-splat' | 'free-form' | 'polygon';
  visible: boolean;
  locked: boolean;
  opacity: number;
  description: string;
}

const DEFAULT_LAYERS: LayerItem[] = [
  {
    id: 'layer_overhead',
    name: 'Overhead / Canopy',
    layerIdx: 3,
    type: 'free-form',
    visible: true,
    locked: false,
    opacity: 100,
    description: 'Roofs, tree tops, and high elevation structures.',
  },
  {
    id: 'layer_structures',
    name: 'Structures & Props',
    layerIdx: 2,
    type: 'free-form',
    visible: true,
    locked: false,
    opacity: 100,
    description: 'Static mesh props, buildings, furniture, and gates.',
  },
  {
    id: 'layer_detail',
    name: 'Foliage & Detail Splat',
    layerIdx: 1,
    type: 'paint-splat',
    visible: true,
    locked: false,
    opacity: 90,
    description: 'Scattered flowers, pebbles, grass tufts, and puddles.',
  },
  {
    id: 'layer_ground',
    name: 'Base Ground & Terrain',
    layerIdx: 0,
    type: 'grid',
    visible: true,
    locked: false,
    opacity: 100,
    description: 'Foundation voxel terrain and primary walkable surface.',
  },
  {
    id: 'layer_logic',
    name: 'Collision & Logic Matrix',
    layerIdx: -1,
    type: 'grid',
    visible: true,
    locked: false,
    opacity: 70,
    description: 'Warp triggers, blockers, and encounter zones.',
  },
];

export function LayersPanel() {
  const [layers, setLayers] = useState<LayerItem[]>(DEFAULT_LAYERS);
  const activeLayerIdx = useEditorStore((s) => s.activeLayerIdx);
  const setActiveLayerIdx = useEditorStore((s) => s.setActiveLayerIdx);
  const setActiveLayerType = useEditorStore((s) => s.setActiveLayerType);
  const showToast = useGameStore((s) => s.showToast);

  const handleSelectLayer = (layer: LayerItem) => {
    soundSynth?.playSelectSound?.();
    setActiveLayerIdx(layer.layerIdx);
    setActiveLayerType(layer.type);
    showToast(`Active Layer: ${layer.name}`);
  };

  const toggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundSynth?.playUiClick?.();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundSynth?.playUiClick?.();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    soundSynth?.playUiClick?.();
    setLayers((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === layers.length - 1) return;
    soundSynth?.playUiClick?.();
    setLayers((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleAddLayer = () => {
    soundSynth?.playUiClick?.();
    const newId = `layer_custom_${Date.now()}`;
    const newLayer: LayerItem = {
      id: newId,
      name: `Custom Layer ${layers.length + 1}`,
      layerIdx: layers.length,
      type: 'free-form',
      visible: true,
      locked: false,
      opacity: 100,
      description: 'User-created detail and prop layer.',
    };
    setLayers([newLayer, ...layers]);
    showToast('Created new layer');
  };

  return (
    <div className="flex flex-col h-full gap-3 text-foreground/90 font-mono text-xs select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-4 h-4 text-primary" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-foreground">
            World Layer Stack
          </span>
        </div>
        <button
          onClick={handleAddLayer}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>New Layer</span>
        </button>
      </div>

      {/* ── Layers List ── */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
        {layers.map((layer, idx) => {
          const isActive = activeLayerIdx === layer.layerIdx;
          return (
            <div
              key={layer.id}
              onClick={() => handleSelectLayer(layer)}
              className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary/15 border-primary/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-black/30 border-border/40 hover:bg-white/5 hover:border-border/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span
                    className={`font-bold truncate text-[11px] ${
                      isActive ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {layer.name}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 border border-white/10 text-muted-foreground/70 uppercase shrink-0">
                    {layer.type}
                  </span>
                </div>

                {/* Layer Control Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => toggleVisibility(layer.id, e)}
                    className={`p-1 rounded hover:bg-white/10 transition-colors ${
                      layer.visible ? 'text-foreground/80' : 'text-muted-foreground/40'
                    }`}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  >
                    {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => toggleLock(layer.id, e)}
                    className={`p-1 rounded hover:bg-white/10 transition-colors ${
                      layer.locked ? 'text-amber-400' : 'text-muted-foreground/40'
                    }`}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  >
                    {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={(e) => handleMoveUp(idx, e)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground/60 disabled:opacity-20 transition-colors"
                    title="Move Layer Up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleMoveDown(idx, e)}
                    disabled={idx === layers.length - 1}
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground/60 disabled:opacity-20 transition-colors"
                    title="Move Layer Down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground/70 truncate mt-1 pl-4">
                {layer.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Active Layer Info & Controls ── */}
      <div className="pt-2 border-t border-border/30 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Active Index:</span>
          <span className="text-primary font-bold">{activeLayerIdx}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
          <span>Server-synchronized world composite</span>
          <span>5 Layers active</span>
        </div>
      </div>
    </div>
  );
}
