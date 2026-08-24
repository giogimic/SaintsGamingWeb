'use client';

import React from 'react';
import { Gamepad2, Sparkles, Swords, Compass, Users, ArrowRight, ArrowLeft, Flame, Info } from 'lucide-react';

export interface GameDefinitionData {
  name: string;
  description: string;
  genre: 'CREATURE_MMO' | 'ARPG' | 'SOCIAL_METAVERSE' | 'CLASSIC_RPG';
  style: 'SAINTS_HYBRID' | 'ACTION_REALTIME' | 'TURN_BASED' | 'EXPLORATION';
  camera: 'ISOMETRIC_25D' | 'TOPDOWN_2D';
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
    similarTo: 'Pokémon MMO, Temtem, Palworld',
    icon: Sparkles,
    badge: 'Popular',
  },
  {
    id: 'ARPG',
    name: 'Action RPG / Dungeon Crawler',
    description: 'Real-time combat, equipment affixes, dungeon exploration, and boss encounters.',
    similarTo: 'Diablo, Torchlight, RuneScape',
    icon: Swords,
    badge: 'Combat Heavy',
  },
  {
    id: 'SOCIAL_METAVERSE',
    name: 'Social Hub & Metaverse',
    description: 'Community hangout spaces, customizable characters, mini-games, and player housing.',
    similarTo: 'Habbo, Club Penguin, VRChat Worlds',
    icon: Users,
    badge: 'Social',
  },
  {
    id: 'CLASSIC_RPG',
    name: 'Classic Story RPG',
    description: 'Narrative-driven quests, NPC dialogue trees, exploration, and turn-based progression.',
    similarTo: 'Final Fantasy, EarthBound, Chrono Trigger',
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
    similarTo: 'RuneScape overworld MMO action + Pokémon tactical creature encounters',
  },
  {
    id: 'ACTION_REALTIME',
    name: 'Real-Time Action Combat',
    badge: 'Fast-Paced',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'Direct keyboard/mouse movement with instant attack hotbars, cooldowns, and dodge mechanics directly on the open map.',
    similarTo: 'Diablo, Path of Exile, Zelda: A Link to the Past',
  },
  {
    id: 'TURN_BASED',
    name: 'Turn-Based Tactics',
    badge: 'Strategic',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Step into dedicated battle encounters with menu commands, action points, speed priority, and elemental advantages.',
    similarTo: 'Classic Final Fantasy, Dragon Quest, Pokémon',
  },
  {
    id: 'EXPLORATION',
    name: 'Narrative & Exploration',
    badge: 'Cozy / Relaxed',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Focus on gathering, artisan crafting, player housing, NPC questlines, and lore with pacifist or optional encounters.',
    similarTo: 'Stardew Valley, Animal Crossing, Rune Factory',
  },
] as const;

const CAMERA_STYLES = [
  {
    id: 'ISOMETRIC_25D',
    name: '2.5D Angled View',
    description: 'Smooth 3D perspective projection with 2.5D sprite billboards and depth.',
    similarTo: 'Ragnarok Online, Tree of Savior, CrossCode',
  },
  {
    id: 'TOPDOWN_2D',
    name: 'Top-Down 2D Grid',
    description: 'Classic pixel-grid top-down camera with crisp pixel snapping.',
    similarTo: 'Pokémon Emerald, Zelda: Minish Cap, RPG Maker',
  },
] as const;

export function GameDefinitionStep({ data, onChange, onNext, onBack }: GameDefinitionStepProps) {
  const isValid = Boolean(data.name.trim());

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            1. Define Your Game
          </h2>
          <p className="text-sm text-slate-400">
            Tell us about the game you want to build. Each option includes references to similar games to help you choose the right design foundation.
          </p>
        </div>

        {/* GAME NAME & DESCRIPTION */}
        <div className="grid grid-cols-1 gap-5 max-w-2xl">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Game Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Chronicles of Aether, Monster Horizon, Knights of the Realm"
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-white text-base outline-none transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Game Description / Tagline
            </label>
            <textarea
              rows={2}
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="A brief tagline or summary describing your game experience..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-white text-sm outline-none transition resize-none shadow-inner"
            />
          </div>
        </div>

        {/* GENRE SELECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Game Genre & Type
            </label>
            <span className="text-[11px] text-slate-400 italic">Game references shown to help guide your choice</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GENRES.map((genre) => {
              const Icon = genre.icon;
              const isSelected = data.genre === genre.id;
              return (
                <div
                  key={genre.id}
                  onClick={() => onChange({ genre: genre.id })}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-400 ring-2 ring-amber-400/20 shadow-xl'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-white text-sm">{genre.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 border border-slate-700 text-slate-300">
                        {genre.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-10 mb-3">{genre.description}</p>
                    <div className="pl-10 flex items-center gap-1.5 text-[11px] text-amber-300/90 font-medium">
                      <span className="text-slate-500 font-normal">Similar to:</span>
                      <span>{genre.similarTo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GAMEPLAY STYLE & CAMERA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* GAMEPLAY STYLE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Gameplay & Combat Style
              </label>
            </div>
            <div className="space-y-3">
              {GAMEPLAY_STYLES.map((style) => {
                const isSelected = data.style === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => onChange({ style: style.id })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/25 border-amber-400 ring-2 ring-amber-400/20 text-white shadow-lg'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        {style.id === 'SAINTS_HYBRID' && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                        {style.name}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${style.badgeColor}`}>
                        {style.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{style.description}</div>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10.5px] text-amber-300/80 font-medium">
                      <span className="text-slate-500 font-normal">Feels like:</span>
                      <span>{style.similarTo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CAMERA STYLE */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Camera & Perspective
              </label>
            </div>
            <div className="space-y-3">
              {CAMERA_STYLES.map((cam) => {
                const isSelected = data.camera === cam.id;
                return (
                  <div
                    key={cam.id}
                    onClick={() => onChange({ camera: cam.id })}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/25 border-amber-400 ring-2 ring-amber-400/20 text-white shadow-lg'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-100">{cam.name}</div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">{cam.description}</div>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 text-[10.5px] text-cyan-300/80 font-medium">
                      <span className="text-slate-500 font-normal">Examples:</span>
                      <span>{cam.similarTo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
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
          disabled={!isValid}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
        >
          View Game Requirements
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
