'use client';

import React from 'react';
import { useGameStore } from './store';
import { Flame, AlertTriangle, Wind } from 'lucide-react';
import { GamePanelShell } from './ui/GamePanelShell';

export default function TargetFrame() {
  const combatTarget = useGameStore(state => state.combatTarget);
  
  if (!combatTarget) return null;

  const target = combatTarget;
  const hpPercent = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));

  return (
    <div className="pointer-events-none flex flex-col items-center">
      <GamePanelShell neonAccent="magenta" className="pointer-events-auto px-4 py-2.5 min-w-[240px] md:min-w-[280px]">
        <div className="flex justify-between items-center mb-1.5">
          <div className="font-extrabold text-white text-[13px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {target.name}
          </div>
          <div className="text-[11px] text-red-200/80 font-mono tracking-tighter">
            {Math.ceil(target.hp)} <span className="text-red-400/50">/ {target.maxHp}</span>
          </div>
        </div>
        
        <div className="relative w-full h-1.5 bg-black/60 overflow-hidden rounded-sm border border-red-500/20">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${target.behavior === 'ENRAGED' ? 'bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}
            style={{ width: `${hpPercent}%` }}
          />
          {/* Tick marks */}
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[25%]" />
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[50%]" />
          <div className="absolute top-0 bottom-0 w-px bg-black/60 z-10 mix-blend-overlay left-[75%]" />
        </div>
        
        {target.behavior && target.behavior !== 'CALM' && (
          <div className="absolute -top-2.5 -right-2.5 z-20">
            {target.behavior === 'ENRAGED' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-orange-500 p-1.5 rounded-md shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse">
                <Flame size={14} className="text-orange-400" />
              </div>
            )}
            {target.behavior === 'ALERT' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-yellow-400 p-1.5 rounded-md shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                <AlertTriangle size={14} className="text-yellow-400" />
              </div>
            )}
            {target.behavior === 'FLEEING' && (
              <div className="bg-[#050b14]/90 backdrop-blur-sm border border-cyan-400 p-1.5 rounded-md shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-bounce">
                <Wind size={14} className="text-cyan-400" />
              </div>
            )}
          </div>
        )}
        
        {target.isCasting && target.castName && (
          <div className="mt-1.5 text-[10px] text-orange-400 font-mono text-center animate-pulse uppercase tracking-widest font-bold">
            [{target.castName}]
          </div>
        )}
      </GamePanelShell>
    </div>
  );
}
