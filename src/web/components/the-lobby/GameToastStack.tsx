'use client';

import React from 'react';
import { useGameStore } from './store';
import { Info } from 'lucide-react';

export default function GameToastStack() {
  const toasts = useGameStore(state => state.toasts);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute top-[10%] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="flex animate-in slide-in-from-top-4 fade-in duration-300 items-center gap-2 rounded-full border border-[#22d3ee]/40 bg-[#050b14]/90 px-4 py-2 font-mono text-[11px] text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.3)] backdrop-blur-md"
        >
          <Info className="h-4 w-4 text-cyan-400" />
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
