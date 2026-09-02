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
    name: 'Bedrock & Ore',
    icon: Mountain,
    desc: 'Gunmetal bedrock, granite, stone blocks, and mineral ores.',
    badge: 'Core',
  },
  {
    id: 'nature_foliage',
    name: 'Foliage & Wood',
    icon: Trees,
    desc: 'Lush grass, fertile loam, oak timber, leaves, and wild flora.',
    badge: 'Biome',
  },
  {
    id: 'architecture',
    name: 'Masonry & Struct',
    icon: Castle,
    desc: 'Fortress bricks, roof tiles, reinforced steel, and interior stone.',
    badge: 'Build',
  },
  {
    id: 'fluids_elemental',
    name: 'Fluids & Energy',
    icon: Flame,
    desc: 'Stream water, magma lava, crystalline ice, and glowing ether.',
    badge: 'Dynamic',
  },
];

const ATMOSPHERE_PRESETS = [
  {
    id: 'noon',
    name: 'High Noon',
    desc: 'Bright golden sunlight with crisp shadows.',
    icon: Sun,
  },
  {
    id: 'dawn',
    name: 'Saints Dawn',
    desc: 'Warm pastel sunrise with gentle horizon glow.',
    icon: CloudSun,
  },
  {
    id: 'dusk',
    name: 'Amber Twilight',
    desc: 'Deep cinematic sunset with rich gold and copper hues.',
    icon: CloudSun,
  },
  {
    id: 'night',
    name: 'Starry Midnight',
    desc: 'Dark moody twilight with cool blue rim lighting.',
    icon: Moon,
  },
  {
    id: 'fog',
    name: 'Mystic Overcast',
    desc: 'Diffused atmospheric overcast lighting.',
    icon: CloudFog,
  },
] as const;

export function EnvironmentSetupStep({
  environment,
  onChange,
  onNext,
  onBack,
}: EnvironmentSetupStepProps) {
  const toggleMaterialSet = (setId: string) => {
    const current = environment.enabledMaterialSets || [];
    const updated = current.includes(setId)
      ? current.filter((id) => id !== setId)
      : [...current, setId];
    onChange({ enabledMaterialSets: updated });
  };

  return (
    <div className="space-y-4">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Layers className="w-4 h-4 text-amber-400" />
            5. Atmosphere & 3D Voxel Palettes
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure celestial lighting presets and enabled 3D block libraries.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. ATMOSPHERE PRESETS */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
            Celestial Atmosphere Preset
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ATMOSPHERE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = environment.atmospherePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ atmospherePreset: preset.id as any })}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                      : 'bg-[#070e1b] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-400" />
                      {preset.name}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">{preset.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 3D VOXEL MATERIAL SETS */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
            Active 3D Voxel Block Palettes
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MATERIAL_SETS.map((mat) => {
              const Icon = mat.icon;
              const isSelected = environment.enabledMaterialSets?.includes(mat.id);
              return (
                <div
                  key={mat.id}
                  onClick={() => toggleMaterialSet(mat.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex items-start justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-[#070e1b] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white truncate">{mat.name}</span>
                        <span className="text-[9px] font-mono uppercase px-1 rounded bg-slate-900 text-slate-400">
                          {mat.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{mat.desc}</p>
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500 text-slate-950 font-black'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. SOUNDSCAPE TRACK */}
        <div className="p-3 rounded-lg bg-[#070e1b] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-white">Starting Soundscape Audio:</span>
          </div>
          <select
            value={environment.soundscapeTrack}
            onChange={(e) => onChange({ soundscapeTrack: e.target.value })}
            className="bg-[#050b14] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
          >
            <option value="track_peaceful_meadow">Peaceful Meadow (Acoustic Folk)</option>
            <option value="track_mystic_sanctuary">Mystic Sanctuary (Ambient Ethereal)</option>
            <option value="track_fortress_march">Fortress March (Orchestral Brass)</option>
            <option value="track_ancient_ruins">Ancient Ruins (Subterranean Drone)</option>
          </select>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer shadow-md shadow-amber-600/20"
        >
          Continue to 3D Realm
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
