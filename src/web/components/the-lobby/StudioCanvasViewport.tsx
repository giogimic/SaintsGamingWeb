import React, { useRef, useState, useEffect } from 'react';
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

  // When maximized, keep viewport fitted between top menu bar (40px) and bottom toolbar (36px)
  useEffect(() => {
    const handleResize = () => {
      if (isMaximized) {
        const topBarHeight = 40;
        const bottomBarHeight = 36;
        setViewport({
          x: 0,
          y: topBarHeight,
          w: typeof window !== 'undefined' ? window.innerWidth : 1200,
          h: typeof window !== 'undefined' ? Math.max(400, window.innerHeight - topBarHeight - bottomBarHeight) : 800,
        });
      }
    };

    if (isMaximized) {
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMaximized, setViewport]);

  const toggleMaximize = () => {
    if (!isMaximized) {
      restoreViewportRef.current = { ...viewport };
      const topBarHeight = 40;
      const bottomBarHeight = 36;
      setViewport({
        x: 0,
        y: topBarHeight,
        w: typeof window !== 'undefined' ? window.innerWidth : 1200,
        h: typeof window !== 'undefined' ? Math.max(400, window.innerHeight - topBarHeight - bottomBarHeight) : 800,
      });
      setIsMaximized(true);
    } else {
      const rest = restoreViewportRef.current || { 
        x: typeof window !== 'undefined' ? Math.max(360, Math.floor((window.innerWidth - 880) / 2)) : 360, 
        y: 48, 
        w: 880, 
        h: 620 
      };
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
      
      // Keep header reachable below top menu bar
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
      className={`absolute pointer-events-auto flex flex-col bg-[#070c18]/90 backdrop-blur-xl border border-border/60 overflow-hidden transition-shadow ${
        isDragging || isResizing ? 'shadow-2xl shadow-amber-500/30 border-amber-500/50' : 'shadow-2xl shadow-black/80'
      }`}
      style={{
        left: viewport.x,
        top: viewport.y,
        width: viewport.w,
        height: viewport.h,
        zIndex: 5,
        borderRadius: isMaximized ? '0px' : '10px'
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Window Header */}
      <div 
        className="h-8 shrink-0 flex items-center justify-between px-3 cursor-move bg-slate-900/90 border-b border-border/50 select-none hover:bg-slate-900 transition-colors"
        onPointerDown={handlePointerDown}
        onDoubleClick={toggleMaximize}
      >
        <div className="flex items-center gap-2 text-slate-200 pointer-events-none">
          <Monitor className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold tracking-wider uppercase font-mono text-primary">Game Canvas Viewport</span>
        </div>
        <div className="panel-controls flex items-center gap-1">
          <button
            onClick={toggleMaximize}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer"
            title={isMaximized ? 'Restore Viewport Window' : 'Maximize Viewport'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Viewport content */}
      <div className="relative flex-1 bg-[#050811] overflow-hidden">
        <GameCanvasBabylon
          activeBrushTileId={activeBrushTileId}
          activeLayerIdx={activeLayerIdx}
          isDevEditorOpen={isDevEditorOpen}
          suppressGameplay={suppressGameplay}
          onMapClick={onMapClick}
        />
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize panel-resize z-20 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity"
          onPointerDown={handleResizeDown}
          title="Drag to resize viewport"
        >
          <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-amber-400" fill="currentColor">
            <polygon points="10,0 10,10 0,10" />
          </svg>
        </div>
      )}
    </div>
  );
}
