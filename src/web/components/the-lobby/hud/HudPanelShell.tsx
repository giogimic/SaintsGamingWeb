'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../store';
import { getHudTheme } from './hud-themes';

interface HudPanelShellProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  title?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  onClose?: () => void;
  accentState?: 'active' | 'alert' | 'cooldown' | 'none';
  noPadding?: boolean;
}

/**
 * Saints Gaming In-Game HUD Panel Shell
 * 
 * Clean dark glass aesthetic conforming to Saints Gaming design rules:
 * - Rounded borders with theme-driven gold/amber or custom style accents
 * - Backdrop blur with dark translucent glass (#050b14)
 * - State indicators with soft glowing borders
 * - Casual, refined MMO interface feel
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
  const hudThemeId = useGameStore((s) => s.hudThemeId);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  const borderClass = {
    none: `${theme.palette.border} hover:border-amber-400/60`,
    active: `${theme.palette.borderActive} shadow-[0_0_16px_rgba(245,158,11,0.35)]`,
    alert: 'border-rose-500/70 shadow-[0_0_16px_rgba(244,63,94,0.4)]',
    cooldown: 'border-amber-400/70 shadow-[0_0_16px_rgba(251,191,36,0.35)]',
  }[accentState];

  return (
    <div
      className={`relative transition-all duration-200 ease-out pointer-events-auto select-none border backdrop-blur-xl ${theme.palette.glassBg} ${radiusClass} ${borderClass} ${className}`}
      style={{
        boxShadow: hudConfig?.borderGlow
          ? accentState !== 'none'
            ? undefined
            : theme.palette.accentGlow
          : '0 8px 30px rgba(0, 0, 0, 0.7)',
        opacity: hudConfig?.opacity ?? 0.95,
      }}
    >
      <div className={`w-full h-full flex flex-col overflow-hidden ${radiusClass} text-slate-200`}>
        {/* Optional Header Row */}
        {(title || icon || headerRight || onClose) && (
          <div
            className={`flex items-center justify-between border-b ${theme.palette.border} ${theme.palette.glassHeaderBg} px-3 py-1.5 shrink-0`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {icon && (
                <span className="text-primary drop-shadow-[0_0_6px_rgba(245,158,11,0.4)] shrink-0">
                  {icon}
                </span>
              )}
              {title && (
                <h3 className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-slate-100 truncate">
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
                  className="rounded p-0.5 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Panel Body Content */}
        <div className={`flex-1 min-h-0 ${noPadding ? '' : 'p-2.5'} ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default HudPanelShell;
