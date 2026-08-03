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

/** Dispatched so GameCanvasBabylon can run the authoritative tryMoveDirection path. */
export const LOBBY_TOUCH_MOVE_EVENT = 'lobby_touch_move';
export const LOBBY_TOUCH_INTERACT_EVENT = 'lobby_touch_interact';

function emitMove(dx: number, dy: number) {
  window.dispatchEvent(new CustomEvent(LOBBY_TOUCH_MOVE_EVENT, { detail: { dx, dy } }));
}

function emitInteract() {
  window.dispatchEvent(new CustomEvent(LOBBY_TOUCH_INTERACT_EVENT));
}

function StaticDPad() {
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startContinuousMove = (dx: number, dy: number) => {
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
    'w-14 h-14 bg-[#0c1220]/85 border border-[#cbb26a]/35 rounded-2xl flex items-center justify-center text-[#e8d5a3] hover:bg-[#cbb26a]/15 active:bg-[#cbb26a]/30 active:scale-95 transition-all backdrop-blur-md';

  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex flex-col items-center gap-1.5 pointer-events-auto select-none touch-none"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
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
        <ArrowUp className="w-7 h-7" />
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
          <ArrowLeft className="w-7 h-7" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-black/40 backdrop-blur-md border border-[#cbb26a]/20 flex items-center justify-center shadow-inner">
          <div className="w-4 h-4 rounded-full bg-[#cbb26a]/35" />
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
          <ArrowRight className="w-7 h-7" />
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
        <ArrowDown className="w-7 h-7" />
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
        // Leave right action cluster + top UI clickable: only left 55% captures joystick
        clipPath: 'inset(0 45% 0 0)',
      }}
      onPointerDown={(e) => {
        // Ignore if interacting with a button (actions live outside clip on the right)
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
          className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#cbb26a]/40 bg-black/45 backdrop-blur-md shadow-[0_0_30px_rgba(203,178,106,0.2)] pointer-events-none"
          style={{ left: origin.x, top: origin.y }}
        >
          <div className="absolute inset-3 rounded-full border border-white/10" />
          <div
            className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#e8d5a3] to-[#806f47] border border-white/30 shadow-lg"
            style={{ left: `calc(50% + ${knob.x}px)`, top: `calc(50% + ${knob.y}px)` }}
          />
        </div>
      )}

      {!active && (
        <div className="fixed bottom-8 left-8 w-20 h-20 rounded-full border border-[#cbb26a]/25 bg-black/30 backdrop-blur-sm flex items-center justify-center pointer-events-none opacity-70">
          <div className="w-8 h-8 rounded-full bg-[#cbb26a]/25 border border-[#cbb26a]/40" />
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
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'INVENTORY' ? 'EXPLORING' : 'INVENTORY');
  };

  const toggleSkills = () => {
    const state = useGameStore.getState();
    state.setGameMode(state.gameMode === 'SKILLS' ? 'EXPLORING' : 'SKILLS');
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-end gap-3 pointer-events-auto select-none"
      style={{ filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.6))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleInventory}
          className="w-11 h-11 bg-[#0c1220]/85 border border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-amber-300 active:bg-amber-600 active:text-white transition-all backdrop-blur-md"
          title="Inventory"
        >
          <Backpack className="w-5 h-5" />
        </button>
        <button
          onClick={toggleSkills}
          className="w-11 h-11 bg-[#0c1220]/85 border border-emerald-500/40 rounded-xl flex flex-col items-center justify-center text-emerald-300 active:bg-emerald-600 active:text-white transition-all backdrop-blur-md"
          title="Skills"
        >
          <Sword className="w-5 h-5" />
        </button>
        <button
          onClick={() => onToggleOptions?.()}
          className="w-11 h-11 bg-[#0c1220]/85 border border-slate-500/40 rounded-xl flex flex-col items-center justify-center text-slate-300 active:bg-slate-700 active:text-white transition-all backdrop-blur-md"
          title="Options"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => onToggleFullscreen?.()}
          className="w-11 h-11 bg-[#0c1220]/85 border border-[#cbb26a]/40 rounded-xl flex flex-col items-center justify-center text-[#e8d5a3] active:bg-[#cbb26a]/40 active:text-white transition-all backdrop-blur-md"
          title="Fullscreen"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onLeaveGame?.()}
          className="col-span-2 w-full h-11 bg-rose-950/85 border border-rose-500/50 rounded-xl flex items-center justify-center gap-2 text-rose-200 active:bg-rose-800 active:text-white transition-all backdrop-blur-md font-mono text-[10px] font-bold uppercase tracking-wider"
          title="Leave Game — return to website"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </div>

      <button
        onClick={emitInteract}
        className="w-20 h-20 bg-gradient-to-br from-[#806f47] to-[#3d3420] border-2 border-[#cbb26a]/70 rounded-3xl flex flex-col items-center justify-center text-white active:scale-95 shadow-[0_0_20px_rgba(203,178,106,0.35)] transition-all font-bold text-xs"
      >
        <Zap className="w-8 h-8 text-amber-300 fill-amber-300 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase font-mono">Action</span>
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
    setIsTouchDevice(
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768
    );
    useGameStore.getState().hydrateMobileControlMode();
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
