'use client';

import React from 'react';
import { useGameStore } from '../store';
import { MessageSquare, DoorOpen, Pickaxe, Sparkles, Swords, Package, Info } from 'lucide-react';

export const ContextInteractionBadge: React.FC = () => {
  const hoveredTarget = useGameStore((s) => s.hoveredTarget);
  const focusedTarget = useGameStore((s) => s.focusedTarget);

  const activeTarget = hoveredTarget?.interactable ? hoveredTarget : focusedTarget?.interactable ? focusedTarget : null;
  if (!activeTarget || !activeTarget.primaryAction) return null;

  const action = activeTarget.primaryAction;

  const getActionIcon = () => {
    switch (action.type) {
      case 'TALK':
        return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />;
      case 'WARP':
        return <DoorOpen className="w-3.5 h-3.5 text-indigo-400" />;
      case 'HARVEST':
        return <Pickaxe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ATTACK':
        return <Swords className="w-3.5 h-3.5 text-rose-400" />;
      case 'OPEN_CONTAINER':
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/40 shadow-lg shadow-amber-500/10">
        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-600 text-white font-black text-xs font-mono shadow-sm">
          {action.key || 'E'}
        </span>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-100">
          {getActionIcon()}
          <span>{action.label}</span>
        </div>
        {activeTarget.distance !== undefined && (
          <span className="text-[10px] text-slate-400 font-mono pl-1 border-l border-slate-700/60">
            {activeTarget.distance}m
          </span>
        )}
      </div>
    </div>
  );
};
