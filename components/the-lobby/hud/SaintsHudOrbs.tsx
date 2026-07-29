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
    <div className="absolute top-4 left-4 z-30 flex flex-col gap-3 pointer-events-none select-none">
      
      {/* Main Player Status Card */}
      <div className="w-[320px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl pointer-events-auto flex flex-col gap-3 transition-transform hover:scale-[1.02]">
        
        {/* Header: Name & Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-inner">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">{player.name || 'Tamer'}</h2>
              <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-mono font-bold uppercase tracking-wider">
                <Award className="w-3 h-3" />
                <span>Level {level}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">XP Progress</span>
            <span className="text-xs font-mono font-bold text-amber-400">{xpProgress}%</span>
          </div>
        </div>

        {/* Bars Container */}
        <div className="flex flex-col gap-2.5 mt-1">
          
          {/* HP Bar */}
          <div className="relative h-4 bg-black/60 rounded-full border border-white/5 overflow-hidden shadow-inner flex items-center group">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              style={{ width: `${hpPercent}%` }}
            />
            <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-20 mix-blend-overlay"></div>
            <div className="relative w-full flex justify-between items-center px-2 z-10">
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-white drop-shadow-md" fill="currentColor" />
                <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">HP</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">{hp} / {maxHp}</span>
            </div>
          </div>

          {/* SP Bar */}
          <div className="relative h-4 bg-black/60 rounded-full border border-white/5 overflow-hidden shadow-inner flex items-center group">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600 to-blue-400 transition-all duration-300 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
              style={{ width: '90%' }}
            />
            <div className="relative w-full flex justify-between items-center px-2 z-10">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-white drop-shadow-md" fill="currentColor" />
                <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">SP</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">90 / 100</span>
            </div>
          </div>

          {/* Energy Bar */}
          <div className="relative h-4 bg-black/60 rounded-full border border-white/5 overflow-hidden shadow-inner flex items-center group">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-300 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              style={{ width: '100%' }}
            />
            <div className="relative w-full flex justify-between items-center px-2 z-10">
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-white drop-shadow-md" fill="currentColor" />
                <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">EN</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">100%</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SaintsHudOrbs;

