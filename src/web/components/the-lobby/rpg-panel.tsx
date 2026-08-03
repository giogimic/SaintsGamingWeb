'use client';

import { ReactNode } from 'react';

interface RpgPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function RpgPanel({ title, onClose, children }: RpgPanelProps) {
  return (
    <div className="pointer-events-auto absolute inset-2 z-30 flex animate-in fade-in zoom-in-95 duration-200 flex-col md:inset-8">
      <div className="lobby-panel relative flex h-full w-full flex-col overflow-hidden rounded-xl">
        <div className="lobby-hairline h-px w-full opacity-80" />

        <div className="lobby-panel-header z-10 flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-semibold uppercase tracking-[0.22em] text-lobby-mist md:text-lg">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-lobby-border bg-black/30 text-sm text-lobby-fog transition-colors hover:border-lobby-soul/50 hover:text-lobby-mist"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-transparent to-black/40">
          <div className="relative z-10 flex h-full w-full flex-col p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
