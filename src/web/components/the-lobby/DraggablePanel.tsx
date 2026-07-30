'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { useGameStore } from './store';
import { Maximize2, Minimize2, Move } from 'lucide-react';

interface DraggablePanelProps {
  id: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultScale?: number;
  className?: string;
}

export default function DraggablePanel({ id, children, defaultPosition = { x: 0, y: 0 }, defaultScale = 1, className = '' }: DraggablePanelProps) {
  const { isUiEditMode, uiSettings, updateUiSetting } = useGameStore();
  const setting = uiSettings[id] || { x: defaultPosition.x, y: defaultPosition.y, scale: defaultScale };
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  // Use motion values for dragging to avoid re-render jumps
  const x = useMotionValue(setting.x);
  const y = useMotionValue(setting.y);

  // Sync external changes (like loading a preset) to motion values
  useEffect(() => {
    x.set(setting.x);
    y.set(setting.y);
  }, [setting.x, setting.y, x, y]);

  // Load from local storage on mount, with bounds checking
  useEffect(() => {
    let initialX = defaultPosition.x;
    let initialY = defaultPosition.y;
    let initialScale = defaultScale;

    const saved = localStorage.getItem(`saints-ui-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number') initialX = parsed.x;
        if (typeof parsed.y === 'number') initialY = parsed.y;
        if (typeof parsed.scale === 'number') initialScale = parsed.scale;
      } catch (e) {}
    }

    // Strict boundary enforcement even on initial load
    if (typeof window !== 'undefined') {
      const margin = 20;
      const editorTopBarHeight = 50;
      if (initialX < margin) initialX = margin;
      if (initialY < editorTopBarHeight) initialY = editorTopBarHeight;
      if (initialX > window.innerWidth - 100) initialX = window.innerWidth - 100;
      if (initialY > window.innerHeight - 100) initialY = window.innerHeight - 100;
    }

    updateUiSetting(id, { x: initialX, y: initialY, scale: initialScale });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save to local storage when setting changes
  useEffect(() => {
    if (uiSettings[id]) {
      localStorage.setItem(`saints-ui-${id}`, JSON.stringify(uiSettings[id]));
    }
  }, [uiSettings, id]);

  const handleDragEnd = () => {
    // Clamp the final position within the viewport (with a small margin so the edit bar is always visible)
    const margin = 20;
    const editorTopBarHeight = 50; // The height of the absolute -top-10 editor bar
    
    let finalX = x.get();
    let finalY = y.get();

    // Prevent dragging off the left or top edge
    if (finalX < margin) finalX = margin;
    if (finalY < editorTopBarHeight) finalY = editorTopBarHeight;

    // Prevent dragging completely off the right or bottom edge
    // We don't have the exact width/height of the children here dynamically without a ResizeObserver, 
    // so we use a safe right/bottom margin that guarantees at least the drag handle is visible
    if (typeof window !== 'undefined') {
      if (finalX > window.innerWidth - 100) finalX = window.innerWidth - 100;
      if (finalY > window.innerHeight - 100) finalY = window.innerHeight - 100;
    }

    // Snap the UI visually
    x.set(finalX);
    y.set(finalY);

    updateUiSetting(id, { 
      x: finalX, 
      y: finalY 
    });
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUiSetting(id, { scale: parseFloat(e.target.value) });
  };

  return (
    <motion.div
      ref={containerRef}
      drag={isUiEditMode}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ 
        x, 
        y, 
        scale: setting.scale,
        transformOrigin: 'center center'
      }}
      className={`absolute z-40 ${className}`}
    >
      {isUiEditMode && (
        <div className="absolute -top-10 left-0 min-w-[200px] bg-black/90 border border-sg-primary/50 rounded-lg p-2 flex items-center gap-2 shadow-xl z-50 pointer-events-auto">
          <div 
            className="cursor-move p-1 hover:bg-white/10 rounded touch-none"
            onPointerDown={(e) => dragControls.start(e, { snapToCursor: false })}
          >
            <Move size={16} className="text-sg-primary pointer-events-none" />
          </div>
          <div className="flex-1 flex items-center gap-2 px-2">
            <Minimize2 size={12} className="text-gray-400" />
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.05" 
              value={setting.scale} 
              onChange={handleScaleChange}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 accent-sg-primary cursor-ew-resize"
            />
            <Maximize2 size={12} className="text-gray-400" />
          </div>
          <div className="text-xs font-bold text-white px-1">
            {Math.round(setting.scale * 100)}%
          </div>
        </div>
      )}
      
      <div className={isUiEditMode ? "pointer-events-none opacity-80" : "pointer-events-auto"}>
         {children}
      </div>
    </motion.div>
  );
}
