'use client';

import React, { useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
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

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`saints-ui-${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        updateUiSetting(id, parsed);
      } catch (e) {}
    } else {
        updateUiSetting(id, { x: defaultPosition.x, y: defaultPosition.y, scale: defaultScale });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save to local storage when setting changes
  useEffect(() => {
    if (uiSettings[id]) {
      localStorage.setItem(`saints-ui-${id}`, JSON.stringify(uiSettings[id]));
    }
  }, [uiSettings, id]);

  const handleDragEnd = (event: any, info: any) => {
    updateUiSetting(id, { 
      x: setting.x + info.offset.x, 
      y: setting.y + info.offset.y 
    });
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUiSetting(id, { scale: parseFloat(e.target.value) });
  };

  return (
    <motion.div
      drag={isUiEditMode}
      dragControls={dragControls}
      dragListener={false}
      onDragEnd={handleDragEnd}
      animate={{ 
        x: setting.x, 
        y: setting.y, 
        scale: setting.scale 
      }}
      initial={false}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`absolute z-40 ${className}`}
      style={{
        transformOrigin: 'center center',
      }}
    >
      {isUiEditMode && (
        <div className="absolute -top-10 left-0 min-w-[200px] bg-black/90 border border-sg-primary/50 rounded-lg p-2 flex items-center gap-2 shadow-xl z-50">
          <div 
            className="cursor-move p-1 hover:bg-white/10 rounded touch-none"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <Move size={16} className="text-sg-primary" />
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
              className="flex-1 accent-sg-primary cursor-ew-resize"
            />
            <Maximize2 size={12} className="text-gray-400" />
          </div>
          <div className="text-xs font-bold text-white px-1">
            {Math.round(setting.scale * 100)}%
          </div>
        </div>
      )}
      
      <div className={isUiEditMode ? "pointer-events-none opacity-80" : ""}>
         {children}
      </div>
    </motion.div>
  );
}
