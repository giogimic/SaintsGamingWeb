'use client';

import React from 'react';
import { Box, Layers, CheckCircle2, ArrowRight, ArrowLeft, Image as ImageIcon, Trees, Castle, Home, Sparkles } from 'lucide-react';

export interface SetupEnvironmentData {
  enabledCategories: string[];
  defaultGroundGid: number;
}

interface EnvironmentSetupStepProps {
  environment: SetupEnvironmentData;
  onChange: (updates: Partial<SetupEnvironmentData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TILE_CATEGORIES = [
  {
    id: 'terrain',
    name: 'Terrain & Ground',
    icon: Layers,
    description: 'Grass, dirt paths, sand, water bodies, elevation cliffs, and stone roads.',
    tileCount: 75,
    badge: 'Core Essential',
  },
  {
    id: 'nature',
    name: 'Nature & Foliage',
    icon: Trees,
    description: 'Trees, bushes, flowers, tall grass patches, and outdoor flora.',
    tileCount: 90,
    badge: 'Environment',
  },
  {
    id: 'structures',
    name: 'Structures & Buildings',
    icon: Castle,
    description: 'Roofs, walls, windows, doors, fences, and architectural components.',
    tileCount: 120,
    badge: 'Architecture',
  },
  {
    id: 'furniture',
    name: 'Interior & Objects',
    icon: Home,
    description: 'Chests, tables, chairs, signs, lanterns, and interactive props.',
    tileCount: 65,
    badge: 'Props',
  },
];

const DEFAULT_TILE_OPTIONS = [
  {
    gid: 17,
    name: 'Lush Green Grass',
    category: 'Terrain',
    previewColor: 'bg-emerald-600',
    description: 'Standard vibrant green meadow ground tile.',
  },
  {
    gid: 32,
    name: 'Forest Earth Dirt',
    category: 'Terrain',
    previewColor: 'bg-amber-800',
    description: 'Rich dark earth pathway tile.',
  },
  {
    gid: 45,
    name: 'Desert Sand',
    category: 'Terrain',
    previewColor: 'bg-amber-400',
    description: 'Warm arid desert and beach sand tile.',
  },
  {
    gid: 60,
    name: 'Cobblestone Paving',
    category: 'Structures',
    previewColor: 'bg-slate-600',
    description: 'Durable stone pavement for town plazas and courtyards.',
  },
  {
    gid: 3010,
    name: 'Wooden Floorboards',
    category: 'Interior',
    previewColor: 'bg-amber-900',
    description: 'Cozy wooden plank flooring for buildings and cabins.',
  },
];

export function EnvironmentSetupStep({
  environment,
  onChange,
  onNext,
  onBack,
}: EnvironmentSetupStepProps) {
  const toggleCategory = (catId: string) => {
    const current = environment.enabledCategories;
    const next = current.includes(catId)
      ? current.filter((c) => c !== catId)
      : [...current, catId];
    onChange({ enabledCategories: next });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
            <Box className="w-5 h-5 text-amber-400" />
            4. Environment & Default Fill Tile
          </h2>
          <p className="text-sm text-slate-400">
            Configure the environment tiles available for map building and select your default background tile.
          </p>
        </div>

        {/* 1. ENVIRONMENT TILE CATEGORIES */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Environment Tileset Libraries
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TILE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isEnabled = environment.enabledCategories.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isEnabled
                      ? 'bg-amber-950/20 border-amber-400 ring-1 ring-amber-400/30'
                      : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{cat.name}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300">
                          {cat.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{cat.description}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-1 transition ${
                    isEnabled ? 'border-amber-400 bg-amber-400 text-slate-950' : 'border-slate-700'
                  }`}>
                    {isEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. CHOOSE DEFAULT FILL TILE */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Choose Your Default Fill Tile
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              This tile will be used as the default fill when creating new maps and initializing your starting canvas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DEFAULT_TILE_OPTIONS.map((tile) => {
              const isSelected = environment.defaultGroundGid === tile.gid;
              return (
                <div
                  key={tile.gid}
                  onClick={() => onChange({ defaultGroundGid: tile.gid })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${tile.previewColor} border border-white/20 shadow-md flex items-center justify-center flex-shrink-0 text-white font-mono text-xs font-bold`}>
                    GID {tile.gid}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-xs truncate">{tile.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{tile.category} · {tile.description}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition cursor-pointer"
        >
          Design Starting Map
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
