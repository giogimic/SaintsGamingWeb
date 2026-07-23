'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import { GAME_MAPS } from './data/maps';

export default function VirtualDPad() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeDirection, setActiveDirection] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Detect touch device
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  const moveInDirection = (direction: string) => {
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;
    if (state.pathQueue.length > 0) return;

    const pos = state.player.position;
    let nextX = pos.x;
    let nextY = pos.y;

    if (direction === 'up') nextY -= 1;
    else if (direction === 'down') nextY += 1;
    else if (direction === 'left') nextX -= 1;
    else if (direction === 'right') nextX += 1;

    const mapData = GAME_MAPS[state.currentMapId];
    if (nextY < 0 || nextY >= mapData.grid.length || nextX < 0 || nextX >= mapData.grid[0].length) return;
    if (mapData.grid[nextY][nextX] === 1) return;

    state.enqueuePath([{ x: nextX, y: nextY }]);
  };

  const handlePressStart = (direction: string) => {
    setActiveDirection(direction);
    moveInDirection(direction);
    
    // Repeat movement while held
    intervalRef.current = setInterval(() => {
      moveInDirection(direction);
    }, 200);
  };

  const handlePressEnd = () => {
    setActiveDirection(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  if (!isTouchDevice) return null;

  const buttonClass = (direction: string) => `
    w-14 h-14 rounded-xl font-bold text-lg select-none touch-none
    flex items-center justify-center transition-all duration-100
    ${activeDirection === direction 
      ? 'bg-emerald-500 text-white scale-95 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
      : 'bg-slate-800/80 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700/80'}
  `;

  return (
    <div className="fixed bottom-20 right-4 z-50 md:hidden">
      <div className="grid grid-cols-3 gap-1 w-[180px]">
        <div />
        <button
          className={buttonClass('up')}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart('up'); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          onMouseDown={() => handlePressStart('up')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          ▲
        </button>
        <div />
        <button
          className={buttonClass('left')}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart('left'); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          onMouseDown={() => handlePressStart('left')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          ◀
        </button>
        <div className="w-14 h-14 rounded-xl bg-slate-900/50 border border-slate-700/30 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-emerald-500/30" />
        </div>
        <button
          className={buttonClass('right')}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart('right'); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          onMouseDown={() => handlePressStart('right')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          ▶
        </button>
        <div />
        <button
          className={buttonClass('down')}
          onTouchStart={(e) => { e.preventDefault(); handlePressStart('down'); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePressEnd(); }}
          onMouseDown={() => handlePressStart('down')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          ▼
        </button>
        <div />
      </div>
    </div>
  );
}