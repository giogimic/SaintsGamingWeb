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
  defaultWidth = 600,
  defaultHeight = 400
}: UcpDraggableWindowProps) {
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[400] flex items-center justify-center" 
      ref={constraintsRef}
    >
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={constraintsRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        style={{ width: defaultWidth, minHeight: defaultHeight }}
        className="pointer-events-auto absolute"
      >
        <Card 
          className="sg-glass border-border/50 shadow-2xl flex flex-col bg-background/95 backdrop-blur-3xl w-full h-full relative" 
          style={{ resize: 'both', overflow: 'hidden', minWidth: '400px', minHeight: '300px' }}
        >
          
          {/* Window Header (Draggable Area) */}
          <div 
            className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-border/50 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripHorizontal className="w-4 h-4" />
              <span className="text-sm font-bold text-foreground">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-rose-500/20 hover:text-rose-400"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>

        </Card>
      </motion.div>
    </div>
  );
}
