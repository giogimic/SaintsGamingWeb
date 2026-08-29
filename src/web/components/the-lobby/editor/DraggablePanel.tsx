'use client';

import React, { useRef, useState, useCallback } from 'react';
import { PanelId, useEditorStore, STUDIO_DOCK_META } from './editor-store';
import { X, Minus, Maximize2 } from 'lucide-react';

interface DraggablePanelProps {
  id: PanelId;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({ id, children, icon, title: propsTitle }) => {
  const panelState = useEditorStore((state) => state.panels[id]);
  const closePanel = useEditorStore((state) => state.closePanel);
  const toggleCollapse = useEditorStore((state) => state.toggleCollapse);
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

  if (!panelState?.isOpen) return null;

  const { x, y, width, height, title, isCollapsed, zIndex } = panelState;
  const blurb = STUDIO_DOCK_META[id]?.blurb;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from the header
    if ((e.target as HTMLElement).closest('.panel-controls')) return;
    if ((e.target as HTMLElement).closest('.panel-resize')) return;
    
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
      const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
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

  const handleDoubleClick = useCallback(() => {
    toggleCollapse(id);
  }, [id, toggleCollapse]);

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
        sg-glass pointer-events-auto relative bg-[#050b14]/90 rounded-lg border flex flex-col overflow-hidden font-sans
        transition-shadow duration-200 shadow-2xl
        ${isActive ? 'border-[#cbb26a]/60 shadow-[0_0_20px_rgba(203,178,106,0.1)]' : 'border-[#806f47]/30'}
      `}
    >
      {/* Compact Header / Drag Handle */}
      <div 
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        className={`
          flex items-center justify-between px-2 py-1 cursor-move
          bg-gradient-to-r select-none
          ${isActive ? 'from-[#162238] via-[#0b1320] to-[#162238] border-b border-[#cbb26a]/30' : 'from-[#0b1320] to-[#050b14] border-b border-[#806f47]/20'}
        `}
        title={blurb || undefined}
      >
        <div className="flex min-w-0 items-center gap-1.5 pointer-events-none">
          {icon && <span className="text-[#cbb26a] [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
          <span className={`font-semibold text-[10px] tracking-wide uppercase font-mono truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
            {propsTitle || title}
          </span>
        </div>
        
        {/* Controls */}
        <div className="panel-controls flex items-center gap-0.5 ml-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleCollapse(id); }}
            className="p-0.5 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-all duration-100 hover:scale-110"
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); closePanel(id); }}
            className="p-0.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all duration-100 hover:scale-110"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-2.5 text-slate-300 relative custom-scrollbar">
          {children}
        </div>
      )}

      {/* Collapsed summary line */}
      {isCollapsed && blurb && (
        <div className="px-2 py-0.5 text-[9px] text-slate-500 truncate border-t border-[#806f47]/10">
          {blurb}
        </div>
      )}

      {/* Corner resize */}
      {!isCollapsed && (
        <div
          className="panel-resize absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
          onPointerDown={handleResizeDown}
          title="Resize panel"
        >
          <span className="pointer-events-none absolute bottom-0.5 right-0.5 h-1.5 w-1.5 border-b-2 border-r-2 border-[#806f47]/50" />
        </div>
      )}
    </div>
  );
};
