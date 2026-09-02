'use client';

import React from 'react';
import { Gamepad2, Sparkles, Swords, Compass, Users, ArrowRight, ArrowLeft, Boxes, Info, Sliders } from 'lucide-react';

export interface GameDefinitionData {
  name: string;
  description: string;
  genre: 'CREATURE_MMO' | 'ARPG' | 'SOCIAL_METAVERSE' | 'CLASSIC_RPG';
  style: 'SAINTS_HYBRID' | 'ACTION_REALTIME' | 'TURN_BASED' | 'EXPLORATION';
  camera: 'ISOMETRIC_25D' | 'TOPDOWN_2D';
  defaultBlockSizePx?: number; // 16..512, default 64
}

interface GameDefinitionStepProps {
  data: GameDefinitionData;
  onChange: (updates: Partial<GameDefinitionData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const GENRES = [
  {
    id: 'CREATURE_MMO',
    name: 'Creature Collection MMO',
    description: 'Capture, train, and battle companion creatures across a living open world.',
    similarTo: 'Creature Collection, Pet Battler, Open-World Companion Taming',
    icon: Sparkles,
    badge: 'Popular',
  },
  {
    id: 'ARPG',
    name: 'Action RPG / Dungeon Crawler',
    description: 'Real-time combat, equipment affixes, dungeon exploration, and boss encounters.',
    similarTo: 'Action RPG, Isometric Hack & Slash, Dungeon Crawler',
    icon: Swords,
    badge: 'Combat Heavy',
  },
  {
    id: 'SOCIAL_METAVERSE',
    name: 'Social Hub & Virtual Realm',
    description: 'Community hangout spaces, customizable characters, mini-games, and player housing.',
    similarTo: 'Community Hangout, Virtual Worlds, Social Sandbox',
    icon: Users,
    badge: 'Social',
  },
  {
    id: 'CLASSIC_RPG',
    name: 'Classic Story RPG',
    description: 'Narrative-driven quests, NPC dialogue trees, exploration, and turn-based progression.',
    similarTo: 'Story-Driven RPG, Tactical Adventure, Pixel Journey',
    icon: Compass,
    badge: 'Story',
  },
] as const;

const GAMEPLAY_STYLES = [
  {
    id: 'SAINTS_HYBRID',
    name: 'Saints Hybrid Combat',
    badge: 'Signature / Recommended',
    badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
    description: 'The signature Saints experience: seamless real-time overworld Hero Battles combined with tactical turn-based Saints Buddy Battles.',
    similarTo: 'Real-time Overworld MMO Action + Tactical Turn-Based Companion Encounters',
  },
  {
    id: 'ACTION_REALTIME',
    name: 'Real-Time Action Combat',
    badge: 'Fast-Paced',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Direct keyboard/mouse movement with instant attack hotbars, cooldowns, and dodge mechanics directly on the open map.',
    similarTo: 'Real-Time Action RPG, Open-World Hack & Slash, Skill-Shot Combat',
  },
  {
    id: 'TURN_BASED',
    name: 'Turn-Based Tactics',
    badge: 'Strategic',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Step into dedicated battle encounters with menu commands, action points, speed priority, and elemental advantages.',
    similarTo: 'Turn-Based Strategy, Tactical Menu Combat, Elemental Matrix',
  },
  {
    id: 'EXPLORATION',
    name: 'Narrative & Exploration',
    badge: 'Cozy / Relaxed',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Focus on gathering, artisan crafting, player housing, NPC questlines, and lore with pacifist or optional encounters.',
    similarTo: 'Farming & Life Sim, Sandbox Gathering, Cozy World Building',
  },
] as const;

const CAMERA_STYLES = [
  {
    id: 'ISOMETRIC_25D',
    name: '2.5D Angled View',
    description: 'Smooth 3D perspective projection with 2.5D sprite billboards and depth.',
    similarTo: '2.5D Isometric Projection, Dynamic Angled Billboard View',
  },
  {
    id: 'TOPDOWN_2D',
    name: 'Top-Down 3D Perspective',
    description: 'Orthographic top-down vantage with crisp volumetric depth.',
    similarTo: 'Classic Top-Down View, Clean Orthographic Projection',
  },
] as const;

const BLOCK_SIZES = [
  { size: 16, label: '16px', desc: 'High density / Micro detail' },
  { size: 32, label: '32px', desc: 'Classic retro pixel scale' },
  { size: 64, label: '64px', desc: 'Saints Standard (Recommended)' },
  { size: 128, label: '128px', desc: 'High-res large block aesthetic' },
  { size: 256, label: '256px', desc: 'Stylized low-poly chunky' },
];

export function GameDefinitionStep({
  data,
  onChange,
  onNext,
  onBack,
}: GameDefinitionStepProps) {
  const currentBlockSize = data.defaultBlockSizePx || 64;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          Game Identity & 3D Voxel Engine Specs
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Define the identity, combat formula, camera viewpoint, and 3D voxel block scale for your new game realm.
        </p>

        {/* 1. Core Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Game Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Saints Adventure, Chrono Realm"
              className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-amber-400 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Description / Tagline
            </label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="A brief summary of your world..."
              className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-amber-400 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* 2. Voxel Block Resolution Selector */}
        <div className="mb-8 p-5 bg-slate-950/50 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-white">Default 3D Voxel Block Scale</span>
            </div>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              {currentBlockSize}px per block
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Determines the spatial resolution of voxel chunks. Half the starting world volume is generated with solid foundation blocks.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {BLOCK_SIZES.map((b) => {
              const isSelected = currentBlockSize === b.size;
              return (
                <button
                  key={b.size}
                  type="button"
                  onClick={() => onChange({ defaultBlockSizePx: b.size })}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="font-mono font-bold text-sm text-amber-300">{b.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{b.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Genre Selection */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Game Genre & Experience Archetype
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GENRES.map((g) => {
              const Icon = g.icon;
              const isSelected = data.genre === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => onChange({ genre: g.id as any })}
                  className={`relative p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-sm">{g.name}</h4>
                    </div>
                    {g.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{g.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Gameplay & Combat Style */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            Combat & Progression Mechanics
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GAMEPLAY_STYLES.map((style) => {
              const isSelected = data.style === style.id;
              return (
                <div
                  key={style.id}
                  onClick={() => onChange({ style: style.id as any })}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white text-sm">{style.name}</h4>
                      {style.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badgeColor}`}>
                          {style.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{style.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Camera & Viewpoint */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
            3D Rendering Viewpoint
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAMERA_STYLES.map((cam) => {
              const isSelected = data.camera === cam.id;
              return (
                <div
                  key={cam.id}
                  onClick={() => onChange({ camera: cam.id as any })}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/70'
                  }`}
                >
                  <h4 className="font-bold text-white text-sm mb-1">{cam.name}</h4>
                  <p className="text-xs text-slate-400">{cam.description}</p>
                </div>
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
          type="submit"
          disabled={!data.name.trim()}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-sm font-bold shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Continue: Starting 3D Realm
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
