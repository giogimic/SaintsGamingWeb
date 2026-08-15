'use client';

import React from 'react';
import { useGameStore } from './store';
import { Info, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GameToastStack() {
  const toasts = useGameStore(state => state.toasts);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="pointer-events-none absolute top-[12%] left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2 select-none">
      {toasts.map(toast => {
        const isSuccess = toast.message.toLowerCase().includes('unlocked') || toast.message.toLowerCase().includes('pinned') || toast.message.toLowerCase().includes('shared') || toast.message.toLowerCase().includes('success');
        const isAlert = toast.message.toLowerCase().includes('error') || toast.message.toLowerCase().includes('failed') || toast.message.toLowerCase().includes('invalid');
        const isWarning = toast.message.toLowerCase().includes('need a target') || toast.message.toLowerCase().includes('not yet') || toast.message.toLowerCase().includes('warning');

        const themeStyle = isAlert
          ? 'border-rose-500/60 bg-black/90 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
          : isSuccess
          ? 'border-emerald-500/60 bg-black/90 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
          : isWarning
          ? 'border-amber-500/60 bg-black/90 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
          : 'border-cyan-500/60 bg-black/90 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.35)]';

        return (
          <div
            key={toast.id}
            className={`flex animate-in slide-in-from-top-4 fade-in duration-300 items-center gap-2.5 px-4 py-2 font-mono text-xs font-bold border backdrop-blur-md rounded-xl ${themeStyle}`}
            style={{
              clipPath: 'polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px)',
            }}
          >
            {isAlert ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : isWarning ? (
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}

