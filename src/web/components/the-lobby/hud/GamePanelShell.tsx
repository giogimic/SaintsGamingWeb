'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface GamePanelShellProps {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  neonAccent?: 'cyan' | 'magenta' | 'lime' | 'red';
}

export function GamePanelShell({ 
  title, 
  onClose, 
  children, 
  className = '', 
  bodyClassName = '',
  neonAccent = 'cyan' 
}: GamePanelShellProps) {
  const accentColor = {
    cyan: 'border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.3)] text-cyan-400',
    magenta: 'border-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.3)] text-pink-400',
    lime: 'border-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.3)] text-lime-400',
    red: 'border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)] text-rose-500',
  }[neonAccent];

  return (
    <div className={`pointer-events-auto flex flex-col overflow-hidden rounded-lg border bg-[#05080e]/85 backdrop-blur-md transition-all duration-200 ${accentColor} ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            {title}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <div className={`flex-1 overflow-auto ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
