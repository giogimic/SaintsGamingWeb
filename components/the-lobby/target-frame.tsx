'use client';

import React from 'react';
import { useGameStore } from './store';

export default function TargetFrame() {
  const combatTarget = useGameStore(state => state.combatTarget);
  
  if (!combatTarget) return null;

  const target = combatTarget;
  const hpPercent = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
      <div className="sg-glass px-6 py-2 rounded-xl border border-white/10 shadow-2xl min-w-[300px]">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold text-white text-lg drop-shadow-md">
            {target.name}
          </div>
          <div className="text-sm text-white/70 font-mono">
            {Math.ceil(target.hp)} / {target.maxHp}
          </div>
        </div>
        
        <div className="h-4 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 relative">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 ease-out"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        
        {target.isCasting && target.castName && (
          <div className="mt-2 text-xs text-orange-300 font-mono text-center animate-pulse">
            Casting: {target.castName}
          </div>
        )}
      </div>
    </div>
  );
}
