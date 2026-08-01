'use client';

import { useGameStore } from './store';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Backpack, 
  MessageSquare, 
  Settings, 
  Maximize2,
  Sword
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function DPad({ onToggleFullscreen, onToggleOptions }: { onToggleFullscreen?: () => void; onToggleOptions?: () => void }) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const moveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
  }, []);

  if (!isTouchDevice) return null;

  const handleMoveOnce = (dx: number, dy: number) => {
    const state = useGameStore.getState();
    if (state.gameMode !== 'EXPLORING') return;

    const pos = state.player.position;
    if (!pos) return;

    const nextX = pos.x + dx;
    const nextY = pos.y + dy;

    if (state.pathQueue.length === 0) {
      useGameStore.getState().enqueuePath([{ x: nextX, y: nextY }]);
    }
  };

  const startContinuousMove = (dx: number, dy: number) => {
    handleMoveOnce(dx, dy);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => {
      handleMoveOnce(dx, dy);
    }, 180);
  };

  const stopContinuousMove = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  const triggerInteract = () => {
    // Dispatch keyboard event 'z' which WorldSimulation and canvas listen to for NPC interaction/harvesting
    const event = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true });
    window.dispatchEvent(event);
  };

  const toggleInventory = () => {
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY');
  };

  const toggleSkills = () => {
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS');
  };

  return (
    <>
      {/* LEFT SIDE: Directional D-Pad */}
      <div 
        className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-1.5 pointer-events-auto select-none touch-none"
        style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
      >
        <button 
          className="w-14 h-14 bg-slate-900/80 border border-violet-500/40 rounded-2xl flex items-center justify-center text-violet-300 hover:bg-violet-900/50 hover:text-white active:bg-violet-600 active:scale-95 transition-all backdrop-blur-md"
          onPointerDown={(e) => { e.preventDefault(); startContinuousMove(0, -1); }}
          onPointerUp={stopContinuousMove}
          onPointerLeave={stopContinuousMove}
        >
          <ArrowUp className="w-7 h-7" />
        </button>
        <div className="flex gap-1.5">
          <button 
            className="w-14 h-14 bg-slate-900/80 border border-violet-500/40 rounded-2xl flex items-center justify-center text-violet-300 hover:bg-violet-900/50 hover:text-white active:bg-violet-600 active:scale-95 transition-all backdrop-blur-md"
            onPointerDown={(e) => { e.preventDefault(); startContinuousMove(-1, 0); }}
            onPointerUp={stopContinuousMove}
            onPointerLeave={stopContinuousMove}
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-violet-500/20 flex items-center justify-center shadow-inner">
            <div className="w-4 h-4 rounded-full bg-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.4)]" />
          </div>
          <button 
            className="w-14 h-14 bg-slate-900/80 border border-violet-500/40 rounded-2xl flex items-center justify-center text-violet-300 hover:bg-violet-900/50 hover:text-white active:bg-violet-600 active:scale-95 transition-all backdrop-blur-md"
            onPointerDown={(e) => { e.preventDefault(); startContinuousMove(1, 0); }}
            onPointerUp={stopContinuousMove}
            onPointerLeave={stopContinuousMove}
          >
            <ArrowRight className="w-7 h-7" />
          </button>
        </div>
        <button 
          className="w-14 h-14 bg-slate-900/80 border border-violet-500/40 rounded-2xl flex items-center justify-center text-violet-300 hover:bg-violet-900/50 hover:text-white active:bg-violet-600 active:scale-95 transition-all backdrop-blur-md"
          onPointerDown={(e) => { e.preventDefault(); startContinuousMove(0, 1); }}
          onPointerUp={stopContinuousMove}
          onPointerLeave={stopContinuousMove}
        >
          <ArrowDown className="w-7 h-7" />
        </button>
      </div>

      {/* RIGHT SIDE: Action Buttons Pad */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex items-end gap-3 pointer-events-auto select-none"
        style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
      >
        {/* Secondary Action Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleInventory}
            className="w-11 h-11 bg-slate-900/80 border border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-amber-300 active:bg-amber-600 active:text-white transition-all backdrop-blur-md"
            title="Inventory"
          >
            <Backpack className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSkills}
            className="w-11 h-11 bg-slate-900/80 border border-emerald-500/40 rounded-xl flex flex-col items-center justify-center text-emerald-300 active:bg-emerald-600 active:text-white transition-all backdrop-blur-md"
            title="Skills"
          >
            <Sword className="w-5 h-5" />
          </button>
          <button
            onClick={() => onToggleOptions?.()}
            className="w-11 h-11 bg-slate-900/80 border border-slate-500/40 rounded-xl flex flex-col items-center justify-center text-slate-300 active:bg-slate-700 active:text-white transition-all backdrop-blur-md"
            title="Options"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => onToggleFullscreen?.()}
            className="w-11 h-11 bg-slate-900/80 border border-violet-500/40 rounded-xl flex flex-col items-center justify-center text-violet-300 active:bg-violet-600 active:text-white transition-all backdrop-blur-md"
            title="Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* PRIMARY ACTION BUTTON: INTERACT / TALK / HARVEST */}
        <button
          onClick={triggerInteract}
          className="w-20 h-20 bg-gradient-to-br from-violet-600 to-purple-800 border-2 border-violet-300/60 rounded-3xl flex flex-col items-center justify-center text-white active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all font-bold text-xs"
        >
          <Zap className="w-8 h-8 text-amber-300 fill-amber-300 animate-pulse mb-0.5" />
          <span className="text-[10px] tracking-wider uppercase font-mono">ACTION</span>
        </button>
      </div>
    </>
  );
}
