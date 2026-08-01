'use client';

import React from 'react';
import { useGameStore } from '../store';
import { Heart, Zap, Flame, Award, Shield } from 'lucide-react';

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
    <div className="absolute top-6 left-6 z-30 flex flex-col gap-4 pointer-events-none select-none">
      
      {/* Player Identity Pill */}
      <div className="pointer-events-auto flex items-center gap-3 bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-full px-2 py-2 pr-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white shadow-sm">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight">{player.name || 'Tamer'}</h2>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-extrabold uppercase tracking-widest">
            <Award className="w-4 h-4" />
            <span>LV {level}</span>
          </div>
        </div>
      </div>

      {/* Stats Container */}
      <div className="flex flex-col gap-3 ml-2 pointer-events-auto">
        
        {/* HP Bar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 relative">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="w-48 h-6 bg-slate-100 rounded-r-full -ml-8 pl-8 pr-2 relative overflow-hidden border-y-2 border-r-2 border-slate-200 shadow-inner">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-rose-400 transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-3">
              <span className="text-[10px] font-extrabold text-slate-700 z-10 mix-blend-overlay drop-shadow-sm">{hp} / {maxHp}</span>
            </div>
          </div>
        </div>

        {/* SP Bar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 relative">
            <Zap className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="w-40 h-6 bg-slate-100 rounded-r-full -ml-8 pl-8 pr-2 relative overflow-hidden border-y-2 border-r-2 border-slate-200 shadow-inner">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-blue-400 transition-all duration-300"
              style={{ width: '90%' }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-3">
              <span className="text-[10px] font-extrabold text-slate-700 z-10 mix-blend-overlay drop-shadow-sm">90 / 100</span>
            </div>
          </div>
        </div>

        {/* Energy Bar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 relative">
            <Flame className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div className="w-36 h-6 bg-slate-100 rounded-r-full -ml-8 pl-8 pr-2 relative overflow-hidden border-y-2 border-r-2 border-slate-200 shadow-inner">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-emerald-400 transition-all duration-300"
              style={{ width: '100%' }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-3">
              <span className="text-[10px] font-extrabold text-slate-700 z-10 mix-blend-overlay drop-shadow-sm">100%</span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center border-4 border-white shadow-sm shrink-0 z-10 relative ml-1">
            <Award className="w-4 h-4 text-white" />
          </div>
          <div className="w-32 h-4 bg-slate-100 rounded-r-full -ml-8 pl-8 pr-2 relative overflow-hidden border-y-2 border-r-2 border-slate-200 shadow-inner">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-amber-300 transition-all duration-300"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default SaintsHudOrbs;

