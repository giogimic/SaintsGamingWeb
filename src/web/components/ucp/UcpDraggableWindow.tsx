'use client';

import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, GripHorizontal } from 'lucide-react';
import { Card } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';

interface UcpDraggableWindowProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function UcpDraggableWindow({ 
  title, 
  children, 
  onClose,
  defaultWidth = 1150,
  defaultHeight = 720
}: UcpDraggableWindowProps) {
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[400] flex items-center justify-center p-2" 
      ref={constraintsRef}
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={constraintsRef}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
        style={{ 
          width: `min(${defaultWidth}px, 96vw)`, 
          height: `min(${defaultHeight}px, 88vh)`,
          maxWidth: '98vw',
          maxHeight: '94vh',
        }}
        className="pointer-events-auto absolute flex flex-col"
      >
        <Card 
          className="sg-glass border-border/50 shadow-2xl flex flex-col bg-background/95 backdrop-blur-3xl w-full h-full max-h-full relative overflow-hidden" 
          style={{ resize: 'both', minWidth: '420px', minHeight: '320px', maxWidth: '98vw', maxHeight: '94vh' }}
        >
          {/* Window Header (Draggable Area) */}
          <div 
            className="flex items-center justify-between px-3.5 py-2.5 bg-black/70 border-b border-border/50 cursor-grab active:cursor-grabbing select-none shrink-0"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <GripHorizontal className="w-4 h-4 text-primary/70" />
              <span className="text-sm font-bold font-mono tracking-wide text-foreground">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Window Content */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </div>

        </Card>
      </motion.div>
    </div>
  );
}
