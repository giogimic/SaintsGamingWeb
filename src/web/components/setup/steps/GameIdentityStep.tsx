'use client';

import React from 'react';
import { Gamepad2, Sparkles, Swords, Layers } from 'lucide-react';

export interface GameDefinitionData {
  name: string;
  description: string;
  genre: 'CREATURE_MMO' | 'CLASSIC_MMO' | 'HYBRID_MMO';
  // Standardized defaults for the engine
  style: 'SAINTS_HYBRID';
  defaultCameraMode: 'DYNAMIC';
  defaultBlockSizePx: 64; 
}

interface GameIdentityStepProps {
  data: GameDefinitionData;
  onChange: (updates: Partial<GameDefinitionData>) => void;
}

export function GameIdentityStep({ data, onChange }: GameIdentityStepProps) {
  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            1. Game Identity
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define the core identity, name, and overarching genre of your new world.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* GAME NAME & GENRE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Game Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Saints Adventure, Realm of Elyria"
              className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition font-sans"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
              Core Genre & Ruleset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CREATURE_MMO', name: 'Creature Battler', icon: Sparkles },
                { id: 'CLASSIC_MMO', name: 'Classic Hero MMO', icon: Swords },
                { id: 'HYBRID_MMO', name: 'Hybrid / Custom', icon: Layers },
              ].map((g) => {
                const Icon = g.icon;
                const isSelected = data.genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onChange({ genre: g.id as any })}
                    className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-sm'
                        : 'bg-[#050b14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="text-[10px] font-semibold truncate w-full">{g.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 font-mono">
            World Overview / Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="A brief overview of your world lore, game mechanics, and player objectives..."
            rows={4}
            className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition font-sans resize-none"
          />
        </div>
        
        {/* CANONICAL SCALE NOTICE */}
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 flex gap-3 items-start">
          <Layers className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-widest font-mono">Standard Content Baseline Applied</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Your game will be initialized with the Saints Standard Material Set, standard terrain, and basic UI. The world uses a canonical scale of <strong>1 block = 1 world unit</strong> with a default texture resolution of 64x64. You can customize these later in Studio.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
