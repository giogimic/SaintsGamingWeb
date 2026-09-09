import React from 'react';
import { usePlayerStore } from '../state/usePlayerStore';

export function PlayerStatsOverlay() {
  const player = usePlayerStore((s: any) => s.player);

  return (
    <div className="absolute top-4 left-4 z-[9000] pointer-events-none flex flex-col gap-2">
      {/* HP Bar */}
      <div className="w-48 bg-black/80 border border-border/50 rounded-lg p-2 backdrop-blur-md">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-white tracking-wider uppercase">{player.name || 'Saint'}</span>
          <span className="text-[10px] text-muted-foreground">LVL {player.level}</span>
        </div>
        
        <div className="w-full bg-red-950/50 rounded-full h-2.5 mb-1 overflow-hidden relative border border-red-900/30">
          <div 
            className="bg-red-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100))}%` }}
          />
        </div>
        
        <div className="w-full bg-blue-950/50 rounded-full h-1.5 overflow-hidden relative border border-blue-900/30">
          <div 
            className="bg-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, (player.mp / player.maxMp) * 100))}%` }}
          />
        </div>
      </div>
      
      {/* Currency */}
      <div className="bg-black/60 border border-border/30 rounded px-2 py-1 backdrop-blur-md inline-flex self-start items-center gap-2">
        <span className="text-xs text-yellow-400 font-mono">🪙 {player.credits}</span>
      </div>
    </div>
  );
}
