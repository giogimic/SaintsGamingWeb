'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Zap, Flame, Award } from 'lucide-react';

export const SaintsHudOrbs: React.FC = () => {
  const player = useGameStore((state) => state.player);

  const hp = player.hp || 99;
  const maxHp = player.maxHp || 99;
  const hpPercent = Math.min(100, Math.max(0, Math.floor((hp / maxHp) * 100)));

  const level = player.level || 1;
  const xp = player.xp || 0;

  // 27-Skill XP Formula Level Calc
  const nextLevelXp = Math.pow(level, 2) * 50;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 50;
  const xpProgress = Math.min(100, Math.max(0, Math.floor(((xp - currentLevelBaseXp) / Math.max(1, nextLevelXp - currentLevelBaseXp)) * 100)));

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
      
      {/* Real-Time XP Progress Bar */}
      <div className="w-[360px] bg-black/80 backdrop-blur border border-amber-500/40 rounded-full px-3 py-1 flex items-center justify-between shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
          <Award className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Lvl {level}</span>
        </div>
        <div className="flex-1 mx-3 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-slate-300 font-bold">{xp} XP ({xpProgress}%)</span>
      </div>

      {/* Classic Circular Stat Orbs */}
      <div className="flex items-center gap-3 pointer-events-auto">
        
        {/* HP Orb */}
        <div className="relative w-12 h-12 rounded-full bg-black/80 border-2 border-red-500/60 p-0.5 shadow-[0_0_12px_rgba(239,68,68,0.4)] flex items-center justify-center">
          <div
            className="absolute bottom-0 inset-x-0 bg-red-600/80 rounded-b-full transition-all duration-300"
            style={{ height: `${hpPercent}%` }}
          />
          <div className="relative z-10 flex flex-col items-center leading-none text-white font-mono font-bold">
            <Heart className="w-3.5 h-3.5 text-red-400 mb-0.5 fill-red-500/40" />
            <span className="text-[11px] drop-shadow-md">{hp}</span>
          </div>
        </div>

        {/* Spirit / Prayer Orb */}
        <div className="relative w-12 h-12 rounded-full bg-black/80 border-2 border-cyan-500/60 p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] flex items-center justify-center">
          <div
            className="absolute bottom-0 inset-x-0 bg-cyan-600/80 rounded-b-full transition-all duration-300"
            style={{ height: '90%' }}
          />
          <div className="relative z-10 flex flex-col items-center leading-none text-white font-mono font-bold">
            <Zap className="w-3.5 h-3.5 text-cyan-300 mb-0.5 fill-cyan-400/40" />
            <span className="text-[11px] drop-shadow-md">99</span>
          </div>
        </div>

        {/* Run Energy Orb */}
        <div className="relative w-12 h-12 rounded-full bg-black/80 border-2 border-emerald-500/60 p-0.5 shadow-[0_0_12px_rgba(16,185,129,0.4)] flex items-center justify-center">
          <div
            className="absolute bottom-0 inset-x-0 bg-emerald-600/80 rounded-b-full transition-all duration-300"
            style={{ height: '100%' }}
          />
          <div className="relative z-10 flex flex-col items-center leading-none text-white font-mono font-bold">
            <Flame className="w-3.5 h-3.5 text-emerald-300 mb-0.5 fill-emerald-400/40" />
            <span className="text-[11px] drop-shadow-md">100%</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default SaintsHudOrbs;
