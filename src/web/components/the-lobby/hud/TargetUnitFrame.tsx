'use client';

import React from 'react';
import { useGameStore } from '../store';
import { X, ShieldAlert, Heart, Swords, MessageSquare, Compass } from 'lucide-react';

export const TargetUnitFrame: React.FC = () => {
  const focusedTarget = useGameStore((s) => s.focusedTarget);
  const clearFocusedTarget = useGameStore((s) => s.clearFocusedTarget);

  if (!focusedTarget || focusedTarget.kind === 'tile') return null;

  const isCreature = focusedTarget.kind === 'creature';
  const isNpc = focusedTarget.kind === 'entity';
  const health = focusedTarget.health;
  const hpPercent = health ? Math.max(0, Math.min(100, Math.round((health.current / health.max) * 100))) : null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in pointer-events-auto">
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/60 shadow-xl min-w-[240px]">
        {/* Type Icon Badge */}
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg ${
            isCreature
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : isNpc
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          }`}
        >
          {isCreature ? (
            <Swords className="w-4 h-4" />
          ) : isNpc ? (
            <MessageSquare className="w-4 h-4" />
          ) : (
            <Compass className="w-4 h-4" />
          )}
        </div>

        {/* Info & Health */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-100 truncate">{focusedTarget.name}</span>
            {focusedTarget.level !== undefined && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Lv.{focusedTarget.level}
              </span>
            )}
          </div>

          {/* Health Bar (for combat creatures / players) */}
          {health && hpPercent !== null ? (
            <div className="mt-1 space-y-0.5">
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 transition-all duration-200"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>
                  {health.current} / {health.max}
                </span>
                <span>{hpPercent}%</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 capitalize mt-0.5">
              {focusedTarget.kind} • {focusedTarget.distance}m away
            </div>
          )}
        </div>

        {/* Deselect / Close Target */}
        <button
          type="button"
          onClick={clearFocusedTarget}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Deselect Target"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
