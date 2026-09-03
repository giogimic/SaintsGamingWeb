'use client';

import React, { useRef, useState, useCallback } from 'react';
import { PanelId, useEditorStore, STUDIO_DOCK_META } from './editor-store';
import { X, Minus, Maximize2, Square, GripVertical } from 'lucide-react';

interface DraggablePanelProps {
  id: PanelId;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  /** Optional secondary toolbar rendered below the title bar (e.g. tabs, sub-nav) */
  menuBar?: React.ReactNode;
}

const DraggablePanelBase: React.FC<DraggablePanelProps> = ({ id, children, icon, title: propsTitle, menuBar }) => {
  const panelState = useEditorStore((state) => state.panels[id]);
  const closePanel = useEditorStore((state) => state.closePanel);
  const toggleCollapse = useEditorStore((state) => state.toggleCollapse);
  const toggleMaximize = useEditorStore((state) => state.toggleMaximize);
  const updatePanelPosition = useEditorStore((state) => state.updatePanelPosition);
  const updatePanelSize = useEditorStore((state) => state.updatePanelSize);
  const bringToFront = useEditorStore((state) => state.bringToFront);
  const isActive = useEditorStore((state) => state.activePanel === id);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // Track drag position in ref for GPU-composited transforms (no React re-renders during drag)
  const dragPosRef = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleDoubleClick = useCallback(() => {
    toggleCollapse(id);
  }, [id, toggleCollapse]);

  if (!panelState?.isOpen) return null;

  const { x, y, width, height, title, isCollapsed, isMaximized, zIndex } = panelState;
  const blurb = STUDIO_DOCK_META[id]?.blurb;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    // Only drag from the header
    if ((e.target as HTMLElement).closest('.panel-controls')) return;
    if ((e.target as HTMLElement).closest('.panel-resize')) return;
    if ((e.target as HTMLElement).closest('.panel-menu-bar')) return;
    
    bringToFront(id);
    setIsDragging(true);
    dragPosRef.current = { x, y };
    dragOffset.current = {
      x: e.clientX - x,
      y: e.clientY - y,
    };
    
    if (panelRef.current) {
      panelRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    bringToFront(id);
    setIsResizing(true);
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    if (panelRef.current) {
      panelRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
      const newY = Math.max(40, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y));
      dragPosRef.current = { x: newX, y: newY };
      // GPU-composited transform — no React re-render, no layout reflow
      if (panelRef.current) {
        panelRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    } else if (isResizing) {
      const dx = e.clientX - resizeOrigin.current.x;
      const dy = e.clientY - resizeOrigin.current.y;
      const newW = Math.max(220, Math.min(window.innerWidth - x - 8, resizeOrigin.current.w + dx));
      const newH = Math.max(120, Math.min(window.innerHeight - y - 8, resizeOrigin.current.h + dy));
      updatePanelSize(id, newW, newH);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      // Flush final position to Zustand store (single update, not 60/sec)
      updatePanelPosition(id, dragPosRef.current.x, dragPosRef.current.y);
      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }
    }
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      if (panelRef.current) {
        panelRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  const displayTitle = propsTitle || title;

  return (
    <div
      ref={panelRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseDown={() => bringToFront(id)}
      style={{
        position: 'fixed',
        left: isDragging ? 0 : x,
        top: isDragging ? 0 : y,
        transform: isDragging ? `translate(${dragPosRef.current.x}px, ${dragPosRef.current.y}px)` : undefined,
        willChange: isDragging ? 'transform' : 'auto',
        width,
        height: isCollapsed ? 'auto' : height,
        zIndex,
        touchAction: 'none',
      }}
      className={`
        pointer-events-auto relative bg-[#050b14]/90 backdrop-blur-xl rounded-xl
        flex flex-col overflow-hidden font-sans
        transition-[border-color,box-shadow] duration-300 ease-out
        ${isActive
          ? 'border border-primary/40 shadow-[0_0_24px_rgba(203,178,106,0.12),0_8px_32px_rgba(0,0,0,0.5)]'
          : 'border border-border/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
        }
      `}
    >
      {/* ── Title Bar / Drag Handle ── */}
      <div 
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        className={`
          flex items-center justify-between px-3 py-2 cursor-move select-none shrink-0
          transition-colors duration-200
          ${isActive
            ? 'bg-gradient-to-r from-primary/8 via-[#0a1628] to-primary/4 border-b border-primary/20'
            : 'bg-gradient-to-r from-[#0a1225]/80 to-[#050b14]/60 border-b border-border/40'
          }
        `}
        title={blurb || undefined}
      >
        <div className="flex min-w-0 items-center gap-2 pointer-events-none">
          {icon && <span className="text-primary/80 [&>svg]:w-3.5 [&>svg]:h-3.5 shrink-0">{icon}</span>}
          <span className={`
            font-semibold text-[11px] tracking-widest uppercase font-mono truncate
            transition-colors duration-200
            ${isActive ? 'sg-text-gradient' : 'text-muted-foreground'}
          `}>
            {displayTitle}
          </span>
        </div>
        
        {/* Window Controls */}
        <div className="panel-controls flex items-center gap-1 ml-2 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
            className="p-1 text-muted-foreground/60 hover:text-foreground hover:bg-foreground/8 rounded-md transition-all duration-150 cursor-pointer"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMaximize(id); }}
            className={`p-1 rounded-md transition-all duration-150 cursor-pointer ${
              isMaximized ? 'text-primary bg-primary/20' : 'text-muted-foreground/60 hover:text-foreground hover:bg-foreground/8'
            }`}
            title={isMaximized ? 'Restore Window' : 'Maximize Window'}
          >
            {isMaximized ? <Square className="w-2.5 h-2.5" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); closePanel(id); }}
            className="p-1 text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all duration-150 cursor-pointer"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Optional Menu Bar (tabs, sub-nav, secondary toolbar) ── */}
      {menuBar && !isCollapsed && (
        <div className="panel-menu-bar shrink-0 border-b border-border/30 bg-[#060e1c]/60">
          {menuBar}
        </div>
      )}

      {/* ── Body ── */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 text-foreground/90 relative custom-scrollbar bg-[#050b14]/50">
          {children}
        </div>
      )}

      {/* ── Collapsed summary line ── */}
      {isCollapsed && blurb && (
        <div className="px-3 py-1 text-[9px] text-muted-foreground/60 truncate border-t border-border/20 bg-[#050b14]/40 italic">
          {blurb}
        </div>
      )}

      {/* ── Corner resize grip ── */}
      {!isCollapsed && !isMaximized && (
        <div
          className="panel-resize absolute bottom-0 right-0 h-4 w-4 cursor-se-resize group"
          onPointerDown={handleResizeDown}
          title="Resize panel"
        >
          <div className="absolute bottom-1 right-1 flex flex-col gap-[2px] items-end pointer-events-none">
            <span className="block h-[2px] w-[6px] rounded-full bg-primary/30 group-hover:bg-primary/60 transition-colors" />
            <span className="block h-[2px] w-[10px] rounded-full bg-primary/30 group-hover:bg-primary/60 transition-colors" />
          </div>
        </div>
      )}
    </div>
  );
};

export const DraggablePanel = React.memo(DraggablePanelBase);
