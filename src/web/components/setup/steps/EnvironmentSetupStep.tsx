'use client';

import React from 'react';
import {
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  CloudSun,
  CloudFog,
  Volume2,
  Trees,
  Castle,
  Flame,
  Mountain,
  CheckCircle2,
} from 'lucide-react';

export interface SetupEnvironmentData {
  enabledMaterialSets: string[];
  foundationMaterial: string;
  atmospherePreset: 'dawn' | 'noon' | 'dusk' | 'night' | 'fog';
  soundscapeTrack: string;
  defaultGroundGid?: number;
}

interface EnvironmentSetupStepProps {
  environment: SetupEnvironmentData;
  onChange: (updates: Partial<SetupEnvironmentData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const MATERIAL_SETS = [
  {
    id: 'natural_stone',
    name: 'Bedrock, Stone & Ore',
    icon: Mountain,
    desc: 'Gunmetal bedrock, granite, cobblestone, sandstone, and mineral ores.',
    badge: 'Core Foundation',
  },
  {
    id: 'nature_foliage',
    name: 'Foliage, Earth & Wood',
    icon: Trees,
    desc: 'Lush grass, fertile loam, oak timber, leaves, and wild flora.',
    badge: 'Biome Essential',
  },
  {
    id: 'architecture',
    name: 'Masonry & Architecture',
    icon: Castle,
    desc: 'Fortress bricks, roof tiles, reinforced steel, and interior stone.',
    badge: 'Structures',
  },
  {
    id: 'fluids_elemental',
    name: 'Elemental & Fluids',
    icon: Flame,
    desc: 'Clear stream water, magma lava, crystalline ice, and glowing ether.',
    badge: 'Dynamic Voxels',
  },
];

const ATMOSPHERE_PRESETS = [
  {
    id: 'noon',
    name: 'High Noon',
    desc: 'Bright golden sunlight with crisp ambient shadows and vivid contrast.',
    icon: Sun,
    gradient: 'from-amber-400/20 via-sky-500/10 to-transparent',
  },
  {
    id: 'dawn',
    name: 'Saints Dawn',
    desc: 'Soft warm pastel morning sunrise with gentle orange horizon glow.',
    icon: CloudSun,
    gradient: 'from-orange-400/20 via-amber-500/10 to-transparent',
  },
  {
    id: 'dusk',
    name: 'Amber Twilight',
    desc: 'Deep cinematic sunset with rich gold, purple, and copper hues.',
    icon: CloudSun,
    gradient: 'from-purple-500/20 via-amber-600/10 to-transparent',
  },
  {
    id: 'night',
    name: 'Starry Midnight',
    desc: 'Dark moody twilight with cool blue rim lighting and luminescent stars.',
    icon: Moon,
    gradient: 'from-indigo-600/20 via-slate-900/40 to-transparent',
  },
  {
    id: 'fog',
    name: 'Mystic Overcast',
    desc: 'Muted atmospheric fog and diffused overcast lighting for dungeons and marshes.',
    icon: CloudFog,
    gradient: 'from-slate-400/20 via-slate-800/20 to-transparent',
  },
] as const;

const AUDIO_TRACKS = [
  { id: 'track_peaceful_meadow', name: 'Meadow Breeze (Peaceful Adventure)' },
  { id: 'track_citadel_march', name: 'Citadel Anthem (Heroic Orchestral)' },
  { id: 'track_cozy_tavern', name: 'Fireside Gathering (Acoustic Strings)' },
  { id: 'track_deep_dungeon', name: 'Cavern Echoes (Atmospheric Ambient)' },
];

export function EnvironmentSetupStep({
  environment,
  onChange,
  onNext,
  onBack,
}: EnvironmentSetupStepProps) {
  const toggleMaterialSet = (setId: string) => {
    const current = environment.enabledMaterialSets || ['natural_stone', 'nature_foliage', 'architecture', 'fluids_elemental'];
    const next = current.includes(setId)
      ? current.filter((id) => id !== setId)
      : [...current, setId];
    onChange({ enabledMaterialSets: next });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Environment, Material Sets & Atmosphere
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Choose the 3D voxel material libraries, dynamic atmospheric lighting, and ambient soundscape for your world.
        </p>

        {/* 1. Voxel Material Libraries */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Active 3D Voxel Material Libraries
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MATERIAL_SETS.map((set) => {
              const Icon = set.icon;
              const isEnabled = (environment.enabledMaterialSets || []).includes(set.id);
              return (
                <div
                  key={set.id}
                  onClick={() => toggleMaterialSet(set.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isEnabled
                      ? 'bg-amber-500/10 border-amber-400/80 ring-1 ring-amber-400/30'
                      : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isEnabled ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{set.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                          {set.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{set.desc}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                    isEnabled ? 'border-amber-400 bg-amber-500 text-white' : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isEnabled && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Atmospheric Lighting Presets */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Atmospheric Skybox & Celestial Lighting Preset
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {ATMOSPHERE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = (environment.atmospherePreset || 'noon') === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ atmospherePreset: preset.id as any })}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white mb-1">{preset.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{preset.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Ambient Audio Soundscape */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Initial World Soundscape Track
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIO_TRACKS.map((track) => {
              const isSelected = (environment.soundscapeTrack || 'track_peaceful_meadow') === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onChange({ soundscapeTrack: track.id })}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 text-white ring-1 ring-amber-400/30'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <Volume2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-medium">{track.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-xl shadow-amber-500/20 transition-all"
        >
          Continue: Characters & Battlers
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
