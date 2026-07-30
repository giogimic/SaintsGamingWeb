'use client';

import { useGameStore } from './store';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

// Rough bounds check, real validation happens in game-canvas WASD handlers anyway

export default function DPad() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isTouchDevice) return null;

  const handleMove = (dx: number, dy: number) => {
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;

    // Use player position from store to calculate next valid tile
    const pos = state.player.position;
    const nextX = pos.x + dx;
    const nextY = pos.y + dy;

    // Fast enqueue (don't wait for current movement to fully finish to queue next one)
    if (state.pathQueue.length === 0) {
      useGameStore.getState().enqueuePath([{ x: nextX, y: nextY }]);
    }
  };

  return (
    <div className="absolute bottom-24 right-6 z-40 flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity pointer-events-auto">
      <button 
        className="w-14 h-14 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-300 hover:bg-black/60 hover:text-white active:bg-gradient-to-br active:from-indigo-500 active:to-purple-600 active:text-white active:scale-95 transition-all shadow-lg backdrop-blur-md"
        onPointerDown={(e) => { e.preventDefault(); handleMove(0, -1); }}
      >
        <span title="Up"><ArrowUp className="w-6 h-6" /></span>
      </button>
      <div className="flex gap-1.5">
        <button 
          className="w-14 h-14 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-300 hover:bg-black/60 hover:text-white active:bg-gradient-to-br active:from-indigo-500 active:to-purple-600 active:text-white active:scale-95 transition-all shadow-lg backdrop-blur-md"
          onPointerDown={(e) => { e.preventDefault(); handleMove(-1, 0); }}
        >
          <span title="Left"><ArrowLeft className="w-6 h-6" /></span>
        </button>
        <div className="w-14 h-14 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/5 flex items-center justify-center shadow-inner">
          <div className="w-4 h-4 rounded-full bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]" />
        </div>
        <button 
          className="w-14 h-14 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-300 hover:bg-black/60 hover:text-white active:bg-gradient-to-br active:from-indigo-500 active:to-purple-600 active:text-white active:scale-95 transition-all shadow-lg backdrop-blur-md"
          onPointerDown={(e) => { e.preventDefault(); handleMove(1, 0); }}
        >
          <span title="Right"><ArrowRight className="w-6 h-6" /></span>
        </button>
      </div>
      <button 
        className="w-14 h-14 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-300 hover:bg-black/60 hover:text-white active:bg-gradient-to-br active:from-indigo-500 active:to-purple-600 active:text-white active:scale-95 transition-all shadow-lg backdrop-blur-md"
        onPointerDown={(e) => { e.preventDefault(); handleMove(0, 1); }}
      >
        <span title="Down"><ArrowDown className="w-6 h-6" /></span>
      </button>
    </div>
  );
}
