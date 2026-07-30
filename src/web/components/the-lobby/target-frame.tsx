'use client';

import React from 'react';
import { useGameStore } from './store';
import { Flame, AlertTriangle, Wind } from 'lucide-react';

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
            className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${target.behavior === 'ENRAGED' ? 'bg-gradient-to-r from-orange-600 to-red-500' : 'bg-gradient-to-r from-red-600 to-red-400'}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        
        {target.behavior && target.behavior !== 'CALM' && (
          <div className="absolute -top-3 -right-3">
            {target.behavior === 'ENRAGED' && (
              <div className="bg-red-500/80 backdrop-blur border border-red-400 p-2 rounded-full shadow-lg shadow-red-500/50 animate-pulse">
                <Flame size={16} className="text-white" />
              </div>
            )}
            {target.behavior === 'ALERT' && (
              <div className="bg-yellow-500/80 backdrop-blur border border-yellow-400 p-2 rounded-full shadow-lg shadow-yellow-500/50">
                <AlertTriangle size={16} className="text-white" />
              </div>
            )}
            {target.behavior === 'FLEEING' && (
              <div className="bg-blue-500/80 backdrop-blur border border-blue-400 p-2 rounded-full shadow-lg shadow-blue-500/50 animate-bounce">
                <Wind size={16} className="text-white" />
              </div>
            )}
          </div>
        )}
        
        {target.isCasting && target.castName && (
          <div className="mt-2 text-xs text-orange-300 font-mono text-center animate-pulse">
            Casting: {target.castName}
          </div>
        )}
      </div>
    </div>
  );
}
