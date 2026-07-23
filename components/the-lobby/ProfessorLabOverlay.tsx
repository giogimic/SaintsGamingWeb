'use client';

import React, { useState } from 'react';
import { useGameStore } from './store';
import { Flame, Droplet, Leaf, Sparkles, CheckCircle2 } from 'lucide-react';

interface StarterOption {
  id: string;
  name: string;
  type: 'Fire' | 'Water' | 'Wood';
  desc: string;
  stats: { HP: number; Atk: number; Def: number; Spd: number };
  color: string;
  icon: any;
}

const STARTERS: StarterOption[] = [
  {
    id: 'ignisaur',
    name: 'Ignisaur',
    type: 'Fire',
    desc: 'A fiery reptile beast with intense thermal energy attacks.',
    stats: { HP: 45, Atk: 65, Def: 40, Spd: 60 },
    color: '#ef4444',
    icon: Flame
  },
  {
    id: 'aquaspout',
    name: 'Aquaspout',
    type: 'Water',
    desc: 'An agile aquatic companion capable of high-pressure water surges.',
    stats: { HP: 50, Atk: 50, Def: 60, Spd: 55 },
    color: '#3b82f6',
    icon: Droplet
  },
  {
    id: 'verdantail',
    name: 'Verdantail',
    type: 'Wood',
    desc: 'A forest guardian beast skilled in defense and vine entrapment.',
    stats: { HP: 60, Atk: 45, Def: 65, Spd: 40 },
    color: '#22c55e',
    icon: Leaf
  }
];

export default function ProfessorLabOverlay({ onClose }: { onClose: () => void }) {
  const [selectedStarter, setSelectedStarter] = useState<StarterOption | null>(null);
  const catchDaemon = useGameStore(state => state.catchDaemon);
  const showToast = useGameStore(state => state.showToast);

  const handleClaimStarter = (starter: StarterOption) => {
    catchDaemon(starter.id);
    useGameStore.setState(state => ({
      player: { ...state.player, activeDaemonId: starter.id }
    }));
    showToast(`Claimed ${starter.name} as your starter beast!`);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 sm:p-6 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-3xl bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-4">
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm uppercase tracking-widest font-bold">
            <Sparkles className="w-5 h-5" /> PROFESSOR OAKWOOD&apos;S RESEARCH LAB
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">CHOOSE YOUR STARTER COMPANION</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto">
            &quot;Welcome Tamer! Select one of three rare elemental beasts to begin your journey across the campaign region.&quot;
          </p>
        </div>

        {/* Starter Pedestals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STARTERS.map(starter => {
            const Icon = starter.icon;
            const isSelected = selectedStarter?.id === starter.id;

            return (
              <div
                key={starter.id}
                onClick={() => setSelectedStarter(starter)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-105'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: `${starter.color}20`, color: starter.color }}>
                      {starter.type}
                    </span>
                    <Icon className="w-5 h-5" style={{ color: starter.color }} />
                  </div>

                  <div className="w-20 h-20 bg-black/80 rounded-xl mx-auto flex items-center justify-center border border-slate-800">
                    <Icon className="w-10 h-10 animate-bounce" style={{ color: starter.color }} />
                  </div>

                  <h3 className="font-bold text-center text-white text-base">{starter.name}</h3>
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">{starter.desc}</p>
                </div>

                {/* Stats Summary */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] space-y-1 text-slate-300">
                  <div className="flex justify-between"><span>HP</span><strong>{starter.stats.HP}</strong></div>
                  <div className="flex justify-between"><span>Attack</span><strong>{starter.stats.Atk}</strong></div>
                  <div className="flex justify-between"><span>Defense</span><strong>{starter.stats.Def}</strong></div>
                  <div className="flex justify-between"><span>Speed</span><strong>{starter.stats.Spd}</strong></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-4">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white font-bold">
            CANCEL
          </button>
          
          <button
            onClick={() => selectedStarter && handleClaimStarter(selectedStarter)}
            disabled={!selectedStarter}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4" />
            {selectedStarter ? `CLAIM ${selectedStarter.name.toUpperCase()}` : 'SELECT A STARTER'}
          </button>
        </div>

      </div>
    </div>
  );
}
