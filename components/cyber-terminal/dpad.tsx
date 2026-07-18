'use client';

import { useGameStore } from './store';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

// Using a simplified tile check based on the store to avoid cyclic deps
const checkTileValid = (x: number, y: number) => {
  // Rough bounds check, real validation happens in game-canvas WASD handlers anyway, 
  // but we can trust the enqueuePath to ignore invalid paths if we pass it through
  return true;
};

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
    <div className="absolute bottom-6 left-6 z-30 flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
      <button 
        className="w-12 h-12 bg-black/60 border-2 border-green-500 rounded-xl flex items-center justify-center text-green-400 active:bg-green-500 active:text-black pointer-events-auto backdrop-blur-sm"
        onPointerDown={(e) => { e.preventDefault(); handleMove(0, -1); }}
      >
        <span title="Up"><ArrowUp className="w-6 h-6" /></span>
      </button>
      <div className="flex gap-1">
        <button 
          className="w-12 h-12 bg-black/60 border-2 border-green-500 rounded-xl flex items-center justify-center text-green-400 active:bg-green-500 active:text-black pointer-events-auto backdrop-blur-sm"
          onPointerDown={(e) => { e.preventDefault(); handleMove(-1, 0); }}
        >
          <span title="Left"><ArrowLeft className="w-6 h-6" /></span>
        </button>
        <div className="w-12 h-12" /> {/* Spacer */}
        <button 
          className="w-12 h-12 bg-black/60 border-2 border-green-500 rounded-xl flex items-center justify-center text-green-400 active:bg-green-500 active:text-black pointer-events-auto backdrop-blur-sm"
          onPointerDown={(e) => { e.preventDefault(); handleMove(1, 0); }}
        >
          <span title="Right"><ArrowRight className="w-6 h-6" /></span>
        </button>
      </div>
      <button 
        className="w-12 h-12 bg-black/60 border-2 border-green-500 rounded-xl flex items-center justify-center text-green-400 active:bg-green-500 active:text-black pointer-events-auto backdrop-blur-sm"
        onPointerDown={(e) => { e.preventDefault(); handleMove(0, 1); }}
      >
        <span title="Down"><ArrowDown className="w-6 h-6" /></span>
      </button>
    </div>
  );
}
