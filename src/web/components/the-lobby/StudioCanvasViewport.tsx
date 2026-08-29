import React, { useRef, useState } from 'react';
import { useEditorStore } from './editor/editor-store';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import { Monitor, Maximize2, Minimize2 } from 'lucide-react';

interface StudioCanvasViewportProps {
  activeBrushTileId: number;
  activeLayerIdx: number;
  isDevEditorOpen: boolean;
  suppressGameplay: boolean;
  onMapClick: (r: number, c: number) => void;
}

export function StudioCanvasViewport({
  activeBrushTileId,
  activeLayerIdx,
  isDevEditorOpen,
  suppressGameplay,
  onMapClick
}: StudioCanvasViewportProps) {
  const viewport = useEditorStore((state) => state.canvasViewport);
  const setViewport = useEditorStore((state) => state.setCanvasViewport);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const restoreViewportRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const toggleMaximize = () => {
    if (!isMaximized) {
      restoreViewportRef.current = { ...viewport };
      const topBarHeight = 36;
      const bottomBarHeight = 40;
      setViewport({
        x: 0,
        y: topBarHeight,
        w: typeof window !== 'undefined' ? window.innerWidth : 1200,
        h: typeof window !== 'undefined' ? Math.max(400, window.innerHeight - topBarHeight - bottomBarHeight) : 800,
      });
      setIsMaximized(true);
    } else {
      const rest = restoreViewportRef.current || { x: 200, y: 60, w: 800, h: 600 };
      setViewport(rest);
      setIsMaximized(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.panel-controls')) return;
    if (isMaximized) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - viewport.x,
      y: e.clientY - viewport.y
    });
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isMaximized) return;
    setIsResizing(true);
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: viewport.w, h: viewport.h };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && !isMaximized) {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Keep header reachable below menu bar
      if (newY < 36) newY = 36;
      
      setViewport({ ...viewport, x: newX, y: newY });
    } else if (isResizing && !isMaximized) {
      const deltaX = e.clientX - resizeOrigin.current.x;
      const deltaY = e.clientY - resizeOrigin.current.y;
      
      const newW = Math.max(320, resizeOrigin.current.w + deltaX);
      const newH = Math.max(240, resizeOrigin.current.h + deltaY);
      
      setViewport({ ...viewport, w: newW, h: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setIsResizing(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute pointer-events-auto flex flex-col sg-glass overflow-hidden transition-shadow ${isDragging || isResizing ? 'shadow-2xl shadow-amber-500/20' : 'shadow-xl'}`}
      style={{
        left: viewport.x,
        top: viewport.y,
        width: viewport.w,
        height: viewport.h,
        zIndex: 5,
        borderRadius: isMaximized ? '0px' : '8px'
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Window Header */}
      <div 
        className="h-8 shrink-0 flex items-center justify-between px-3 cursor-move bg-slate-900/80 border-b border-amber-500/20 select-none"
        onPointerDown={handlePointerDown}
        onDoubleClick={toggleMaximize}
      >
        <div className="flex items-center gap-2 text-slate-300 pointer-events-none">
          <Monitor className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">Game Canvas Viewport</span>
        </div>
        <div className="panel-controls flex items-center gap-1">
          <button
            onClick={toggleMaximize}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isMaximized ? 'Restore Viewport Size' : 'Maximize Viewport'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Viewport content */}
      <div className="relative flex-1 bg-transparent overflow-hidden">
        <GameCanvasBabylon
          activeBrushTileId={activeBrushTileId}
          activeLayerIdx={activeLayerIdx}
          isDevEditorOpen={isDevEditorOpen}
          suppressGameplay={suppressGameplay}
          onMapClick={onMapClick}
        />
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize panel-resize z-20 flex items-center justify-center opacity-50 hover:opacity-100"
        onPointerDown={handleResizeDown}
      >
        <svg viewBox="0 0 10 10" className="w-2 h-2 text-amber-500" fill="currentColor">
          <polygon points="10,0 10,10 0,10" />
        </svg>
      </div>
    </div>
  );
}
