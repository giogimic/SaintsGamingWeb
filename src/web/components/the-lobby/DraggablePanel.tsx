'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { useGameStore } from './store';
import { Maximize2, Minimize2, Move } from 'lucide-react';

const SNAP = 8;

function snap(n: number) {
  return Math.round(n / SNAP) * SNAP;
}

interface DraggablePanelProps {
  id: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultScale?: number;
  className?: string;
}

export default function DraggablePanel({
  id,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultScale = 1,
  className = '',
}: DraggablePanelProps) {
  const isEditing = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  const uiSettings = useGameStore((s) => s.uiSettings);
  const updateUiSetting = useGameStore((s) => s.updateUiSetting);
  const uiLayoutEpoch = useGameStore((s) => s.uiLayoutEpoch);
  const setting = uiSettings[id] || {
    x: defaultPosition.x,
    y: defaultPosition.y,
    scale: defaultScale,
  };
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(setting.x);
  const y = useMotionValue(setting.y);

  useEffect(() => {
    x.set(setting.x);
    y.set(setting.y);
  }, [setting.x, setting.y, x, y]);

  // Load from localStorage (or defaults) on mount / layout reset
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
      } catch {
        /* ignore */
      }
    }

    if (typeof window !== 'undefined') {
      const margin = 20;
      const editorTopBarHeight = 50;
      if (initialX < margin) initialX = margin;
      if (initialY < editorTopBarHeight) initialY = editorTopBarHeight;
      if (initialX > window.innerWidth - 100) initialX = window.innerWidth - 100;
      if (initialY > window.innerHeight - 100) initialY = window.innerHeight - 100;
    }

    updateUiSetting(id, { x: initialX, y: initialY, scale: initialScale });
    x.set(initialX);
    y.set(initialY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, uiLayoutEpoch]);

  useEffect(() => {
    if (uiSettings[id]) {
      localStorage.setItem(`saints-ui-${id}`, JSON.stringify(uiSettings[id]));
    }
  }, [uiSettings, id]);

  const handleDragEnd = () => {
    const margin = 20;
    const editorTopBarHeight = 50;

    let finalX = snap(x.get());
    let finalY = snap(y.get());

    if (finalX < margin) finalX = margin;
    if (finalY < editorTopBarHeight) finalY = editorTopBarHeight;

    if (typeof window !== 'undefined') {
      if (finalX > window.innerWidth - 100) finalX = window.innerWidth - 100;
      if (finalY > window.innerHeight - 100) finalY = window.innerHeight - 100;
    }

    x.set(finalX);
    y.set(finalY);
    updateUiSetting(id, { x: finalX, y: finalY });
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateUiSetting(id, { scale: parseFloat(e.target.value) });
  };

  return (
    <motion.div
      ref={containerRef}
      drag={isEditing}
      dragControls={dragControls}
      dragListener={isEditing}
      dragMomentum={false}
      dragElastic={0.05}
      onDragEnd={handleDragEnd}
      style={{
        x,
        y,
        scale: setting.scale,
        transformOrigin: 'center center',
        cursor: isEditing ? 'grab' : undefined,
      }}
      whileDrag={isEditing ? { cursor: 'grabbing', zIndex: 80 } : undefined}
      className={`absolute z-40 ${className} ${
        isEditing
          ? 'rounded-md outline outline-2 outline-dashed outline-[#10B981] outline-offset-2 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]'
          : ''
      }`}
    >
      {isEditing && (
        <div className="absolute -top-10 left-0 z-50 flex min-w-[200px] pointer-events-auto items-center gap-2 rounded-lg border border-[#10B981]/40 bg-[#0A0B10]/95 p-2 shadow-xl backdrop-blur-md">
          <div
            className="cursor-grab touch-none rounded p-1 hover:bg-white/10 active:cursor-grabbing"
            onPointerDown={(e) => dragControls.start(e, { snapToCursor: false })}
          >
            <Move size={16} className="pointer-events-none text-[#10B981]" />
          </div>
          <div className="flex flex-1 items-center gap-2 px-2">
            <Minimize2 size={12} className="text-white/40" />
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={setting.scale}
              onChange={handleScaleChange}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 cursor-ew-resize accent-[#10B981]"
            />
            <Maximize2 size={12} className="text-white/40" />
          </div>
          <div className="px-1 text-xs font-bold text-white">
            {Math.round(setting.scale * 100)}%
          </div>
        </div>
      )}

      <div className={isEditing ? 'pointer-events-none opacity-90' : 'pointer-events-auto'}>
        {children}
      </div>
    </motion.div>
  );
}
