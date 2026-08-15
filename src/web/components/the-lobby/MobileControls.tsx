'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
  Backpack,
  Sword,
  Settings,
  Maximize2,
  LogOut,
} from 'lucide-react';
import { useGameStore, type MobileControlMode } from './store';
import { soundSynth } from '@/engine/sound-synth';

/** Dispatched so GameCanvasBabylon can run the authoritative tryMoveDirection path. */
export const LOBBY_TOUCH_MOVE_EVENT = 'lobby_touch_move';
export const LOBBY_TOUCH_INTERACT_EVENT = 'lobby_touch_interact';

function emitMove(dx: number, dy: number) {
  window.dispatchEvent(new CustomEvent(LOBBY_TOUCH_MOVE_EVENT, { detail: { dx, dy } }));
}

function emitInteract() {
  soundSynth?.playActionSound?.();
  window.dispatchEvent(new CustomEvent(LOBBY_TOUCH_INTERACT_EVENT));
}

function StaticDPad() {
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startContinuousMove = (dx: number, dy: number) => {
    soundSynth?.playUiClick?.();
    emitMove(dx, dy);
    if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    moveIntervalRef.current = setInterval(() => emitMove(dx, dy), 180);
  };

  const stopContinuousMove = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  };

  useEffect(() => () => stopContinuousMove(), []);

  const btn =
    'w-14 h-14 bg-black/80 border border-cyan-500/40 rounded-xl flex items-center justify-center text-cyan-300 hover:bg-cyan-950/40 active:bg-cyan-800/60 active:scale-95 transition-all backdrop-blur-md cursor-pointer shadow-lg';

  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-1.5 pointer-events-auto select-none touch-none"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.8))' }}
    >
      <button
        className={btn}
        onPointerDown={(e) => {
          e.preventDefault();
          startContinuousMove(0, -1);
        }}
        onPointerUp={stopContinuousMove}
        onPointerLeave={stopContinuousMove}
        onPointerCancel={stopContinuousMove}
      >
        <ArrowUp className="w-6 h-6" />
      </button>
      <div className="flex gap-1.5">
        <button
          className={btn}
          onPointerDown={(e) => {
            e.preventDefault();
            startContinuousMove(-1, 0);
          }}
          onPointerUp={stopContinuousMove}
          onPointerLeave={stopContinuousMove}
          onPointerCancel={stopContinuousMove}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="w-14 h-14 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/20 flex items-center justify-center shadow-inner">
          <div className="w-4 h-4 rounded-full bg-cyan-500/40" />
        </div>
        <button
          className={btn}
          onPointerDown={(e) => {
            e.preventDefault();
            startContinuousMove(1, 0);
          }}
          onPointerUp={stopContinuousMove}
          onPointerLeave={stopContinuousMove}
          onPointerCancel={stopContinuousMove}
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
      <button
        className={btn}
        onPointerDown={(e) => {
          e.preventDefault();
          startContinuousMove(0, 1);
        }}
        onPointerUp={stopContinuousMove}
        onPointerLeave={stopContinuousMove}
        onPointerCancel={stopContinuousMove}
      >
        <ArrowDown className="w-6 h-6" />
      </button>
    </div>
  );
}

function FloatingJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const dirRef = useRef<{ dx: number; dy: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const RADIUS = 56;
  const DEADZONE = 18;

  const stop = () => {
    setActive(false);
    setKnob({ x: 0, y: 0 });
    dirRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const updateFromPoint = (clientX: number, clientY: number) => {
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setKnob({ x: kx, y: ky });

    if (dist < DEADZONE) {
      dirRef.current = null;
      return;
    }

    // Prefer dominant axis for grid movement
    if (Math.abs(dx) > Math.abs(dy)) {
      dirRef.current = { dx: dx > 0 ? 1 : -1, dy: 0 };
    } else {
      dirRef.current = { dx: 0, dy: dy > 0 ? 1 : -1 };
    }
  };

  const startAt = (clientX: number, clientY: number) => {
    soundSynth?.playUiClick?.();
    setOrigin({ x: clientX, y: clientY });
    setKnob({ x: 0, y: 0 });
    setActive(true);
    dirRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const d = dirRef.current;
      if (d) emitMove(d.dx, d.dy);
    }, 160);
  };

  useEffect(() => () => stop(), []);

  return (
    <div
      ref={zoneRef}
      className="fixed inset-0 z-40 pointer-events-auto touch-none select-none md:hidden"
      style={{
        clipPath: 'inset(0 45% 0 0)',
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        startAt(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!active) return;
        e.preventDefault();
        updateFromPoint(e.clientX, e.clientY);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      {active && (
        <div
          className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/50 bg-black/60 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.3)] pointer-events-none"
          style={{ left: origin.x, top: origin.y }}
        >
          <div className="absolute inset-3 rounded-full border border-cyan-400/20" />
          <div
            className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-700 border border-cyan-200/50 shadow-lg"
            style={{ left: `calc(50% + ${knob.x}px)`, top: `calc(50% + ${knob.y}px)` }}
          />
        </div>
      )}

      {!active && (
        <div className="fixed bottom-8 left-8 w-20 h-20 rounded-full border border-cyan-500/30 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-none opacity-70">
          <div className="w-8 h-8 rounded-full bg-cyan-500/30 border border-cyan-400/40" />
        </div>
      )}
    </div>
  );
}

function ActionCluster({
  onToggleFullscreen,
  onToggleOptions,
  onLeaveGame,
}: {
  onToggleFullscreen?: () => void;
  onToggleOptions?: () => void;
  onLeaveGame?: () => void;
}) {
  const toggleInventory = () => {
    soundSynth?.playSelectSound?.();
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY');
  };

  const toggleSkills = () => {
    soundSynth?.playSelectSound?.();
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS');
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-end gap-3 pointer-events-auto select-none"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.8))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleInventory}
          className="w-11 h-11 bg-black/80 border border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-amber-300 active:bg-amber-600 active:text-white transition-all backdrop-blur-md cursor-pointer shadow-md"
          title="Inventory"
        >
          <Backpack className="w-5 h-5" />
        </button>
        <button
          onClick={toggleSkills}
          className="w-11 h-11 bg-black/80 border border-emerald-500/40 rounded-xl flex flex-col items-center justify-center text-emerald-300 active:bg-emerald-600 active:text-white transition-all backdrop-blur-md cursor-pointer shadow-md"
          title="Skills"
        >
          <Sword className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            onToggleOptions?.();
          }}
          className="w-11 h-11 bg-black/80 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-300 active:bg-slate-700 active:text-white transition-all backdrop-blur-md cursor-pointer shadow-md"
          title="Options"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            soundSynth?.playSelectSound?.();
            onToggleFullscreen?.();
          }}
          className="w-11 h-11 bg-black/80 border border-cyan-500/40 rounded-xl flex flex-col items-center justify-center text-cyan-300 active:bg-cyan-600 active:text-white transition-all backdrop-blur-md cursor-pointer shadow-md"
          title="Fullscreen"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            soundSynth?.playSelectSound?.();
            onLeaveGame?.();
          }}
          className="col-span-2 w-full h-10 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-center justify-center gap-2 text-rose-200 active:bg-rose-800 active:text-white transition-all backdrop-blur-md font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer shadow-md"
          title="Leave Game"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>

      <button
        onClick={emitInteract}
        className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-800 border-2 border-amber-400/80 rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all font-bold text-xs cursor-pointer"
        style={{
          clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
        }}
      >
        <Zap className="w-7 h-7 text-amber-200 fill-amber-200 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase font-mono font-black">Action</span>
      </button>
    </div>
  );
}

export default function MobileControls({
  onToggleFullscreen,
  onToggleOptions,
  onLeaveGame,
}: {
  onToggleFullscreen?: () => void;
  onToggleOptions?: () => void;
  onLeaveGame?: () => void;
}) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const mode = useGameStore((s) => s.mobileControlMode);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || window.innerWidth < 768
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    useGameStore.getState().hydrateMobileControlMode();
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  if (!isTouchDevice) return null;

  const controlMode: MobileControlMode = mode || 'floating';

  return (
    <>
      {controlMode === 'floating' ? <FloatingJoystick /> : <StaticDPad />}
      <ActionCluster
        onToggleFullscreen={onToggleFullscreen}
        onToggleOptions={onToggleOptions}
        onLeaveGame={onLeaveGame}
      />
    </>
  );
}

