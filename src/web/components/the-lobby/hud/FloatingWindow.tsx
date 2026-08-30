'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Square, Move } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../store';
import { getHudTheme } from './hud-themes';

export interface FloatingWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  defaultWidth?: number | string;
  defaultHeight?: number | string;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

// Global z-index counter for window elevation
let globalWindowZIndex = 100;

/**
 * Saints Floating Window Shell
 *
 * Provides a draggable, layered window for complex game UI overlays
 * (Inventory, Equipment, Skills, Guides, Crafting, Codex).
 */
export function FloatingWindow({
  id,
  title,
  icon,
  headerRight,
  isOpen,
  onClose,
  defaultPosition,
  defaultWidth = 420,
  defaultHeight = 'auto',
  minWidth = 320,
  minHeight = 200,
  zIndex: initialZIndex = 100,
  children,
  className,
  bodyClassName,
}: FloatingWindowProps) {
  const [currentZIndex, setCurrentZIndex] = useState(initialZIndex);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    if (typeof window !== 'undefined') {
      const w = typeof defaultWidth === 'number' ? defaultWidth : 420;
      return {
        x: Math.max(20, Math.floor((window.innerWidth - w) / 2)),
        y: Math.max(60, Math.floor((window.innerHeight - 500) / 2)),
      };
    }
    return { x: 80, y: 80 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Bring window to top when clicked
  const bringToTop = () => {
    globalWindowZIndex += 1;
    setCurrentZIndex(globalWindowZIndex);
  };

  // Re-clamp on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(10, Math.min(window.innerWidth - 100, prev.x)),
        y: Math.max(10, Math.min(window.innerHeight - 80, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    bringToTop();
    // Only drag from header handle
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(10, Math.min(window.innerWidth - 100, dragStartRef.current.posX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.posY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const hudThemeId = useGameStore((s) => s.hudThemeId);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const theme = getHudTheme(hudThemeId || hudConfig?.themeId);

  const radiusClass =
    hudConfig?.borderRadius === 'compact'
      ? 'rounded-xl'
      : hudConfig?.borderRadius === 'capsule'
      ? 'rounded-3xl'
      : theme.borderRadiusClass || 'rounded-2xl';

  if (!isOpen) return null;

  return (
    <div
      id={`window-${id}`}
      onPointerDownCapture={bringToTop}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: typeof defaultWidth === 'number' ? `${defaultWidth}px` : defaultWidth,
        maxWidth: 'calc(100vw - 20px)',
        zIndex: currentZIndex,
        opacity: hudConfig?.opacity ?? 0.95,
      }}
      className={cn(
        `pointer-events-auto select-none ${radiusClass} border ${theme.palette.border} ${theme.palette.glassBg} backdrop-blur-xl shadow-[0_12px_45px_rgba(0,0,0,0.8)] transition-shadow duration-200 animate-in fade-in zoom-in-95 font-mono`,
        isDragging && `shadow-[0_0_30px_rgba(245,158,11,0.4)] ${theme.palette.borderActive}`,
        className
      )}
    >
      <div className={`w-full h-full flex flex-col ${radiusClass} overflow-hidden text-slate-200`}>
        {/* Header / Drag Bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={() => setIsCollapsed((prev) => !prev)}
          className={`flex items-center justify-between px-3 py-2 border-b ${theme.palette.border} ${theme.palette.glassHeaderBg} cursor-grab active:cursor-grabbing select-none`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon && <span className="text-amber-400 shrink-0">{icon}</span>}
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-100 truncate">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-all cursor-pointer"
              title={isCollapsed ? 'Expand' : 'Minimize'}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundSynth?.playSelectSound?.();
                onClose();
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
              title="Close window (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isCollapsed && (
          <div className={cn('p-3 overflow-y-auto max-h-[80vh] custom-scrollbar', bodyClassName)}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

