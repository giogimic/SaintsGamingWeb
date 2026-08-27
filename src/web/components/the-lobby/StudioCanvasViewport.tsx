import React, { useRef, useState } from 'react';
import { useEditorStore } from './editor/editor-store';
import GameCanvasBabylon from './babylon/GameCanvasBabylon';
import { Monitor } from 'lucide-react';

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
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
    setIsResizing(true);
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: viewport.w, h: viewport.h };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Keep header reachable
      if (newY < 36) newY = 36; // below menu bar
      
      setViewport({ ...viewport, x: newX, y: newY });
    } else if (isResizing) {
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
        borderRadius: '8px'
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Window Header */}
      <div 
        className="h-8 shrink-0 flex items-center justify-between px-3 cursor-move bg-slate-900/60 border-b border-amber-500/20"
        onPointerDown={handlePointerDown}
      >
        <div className="flex items-center gap-2 text-slate-300">
          <Monitor className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wider uppercase select-none">Game Canvas</span>
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
