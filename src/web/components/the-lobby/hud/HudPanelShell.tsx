'use client';

import React from 'react';
import { X } from 'lucide-react';

interface HudPanelShellProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  onClose?: () => void;
  /** Active/alert state neon highlight (reserved for states, not resting HUD) */
  accentState?: 'active' | 'alert' | 'cooldown' | 'none';
  /** Customizable internal padding — defaults to standard 8px (p-2) */
  noPadding?: boolean;
}

/**
 * Saints Gaming Unified HUD Panel Shell
 * 
 * VISUAL SYSTEM:
 * - Chamfered cut corners (top-left 8px, bottom-right 8px)
 * - Fill: near-black with slight teal tint (95% opacity backdrop-blur-md)
 * - Border: 1px consistent bright teal at rest
 * - Reserved neon accents for active/alert state changes only
 * - Fluid 150-200ms ease transitions
 */
export function HudPanelShell({
  children,
  className = '',
  bodyClassName = '',
  title,
  icon,
  headerRight,
  onClose,
  accentState = 'none',
  noPadding = false,
}: HudPanelShellProps) {
  // Border colors based on state
  const borderBgClass = {
    none: 'bg-teal-500/70 shadow-[0_0_12px_rgba(20,184,166,0.15)] hover:bg-teal-400/90 hover:shadow-[0_0_16px_rgba(20,184,166,0.25)]',
    active: 'bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)]',
    alert: 'bg-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.4)]',
    cooldown: 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.3)]',
  }[accentState];

  return (
    <div
      className={`relative p-[1px] transition-all duration-200 ease-out pointer-events-auto select-none ${borderBgClass} ${className}`}
      style={{
        clipPath:
          'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
      }}
    >
      <div
        className="w-full h-full flex flex-col bg-[#04090e]/95 backdrop-blur-md text-slate-200"
        style={{
          clipPath:
            'polygon(7px 0%, 100% 0%, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0% 100%, 0% 7px)',
        }}
      >
        {/* Optional Header Row */}
        {(title || icon || headerRight || onClose) && (
          <div className="flex items-center justify-between border-b border-teal-500/20 bg-black/40 px-2.5 py-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              {icon && (
                <span className="text-teal-400 drop-shadow-[0_0_6px_rgba(20,184,166,0.5)] shrink-0">
                  {icon}
                </span>
              )}
              {title && (
                <h3 className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-teal-200/90 truncate drop-shadow-sm">
                  {title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {headerRight}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded p-0.5 text-teal-300/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Panel Body Content (Standard 8px padding by default) */}
        <div className={`flex-1 min-h-0 ${noPadding ? '' : 'p-2'} ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default HudPanelShell;
