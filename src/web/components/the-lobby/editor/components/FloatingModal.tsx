import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface FloatingModalProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  defaultWidth?: number;
  defaultHeight?: number;
}

export function FloatingModal({ title, icon, children, onClose, defaultWidth = 600, defaultHeight = 500 }: FloatingModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeOrigin = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    setPos({
      x: window.innerWidth / 2 - defaultWidth / 2,
      y: window.innerHeight / 2 - defaultHeight / 2,
    });
    setMounted(true);
  }, [defaultWidth, defaultHeight]);

  if (!mounted) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const handleResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeOrigin.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    panelRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dragOffset.current.y)),
      });
    } else if (isResizing) {
      setSize({
        w: Math.max(300, resizeOrigin.current.w + (e.clientX - resizeOrigin.current.x)),
        h: Math.max(200, resizeOrigin.current.h + (e.clientY - resizeOrigin.current.y)),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    setIsResizing(false);
    if (panelRef.current?.hasPointerCapture(e.pointerId)) {
      try {
        panelRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] pointer-events-none"
    >
      <div
        ref={panelRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          touchAction: 'none',
        }}
        className="pointer-events-auto bg-[#050b14]/95 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden font-sans"
      >
        <div
          onPointerDown={handlePointerDown}
          className="flex items-center justify-between px-3 py-2 cursor-move select-none shrink-0 bg-gradient-to-r from-[#0a1225] to-[#050b14] border-b border-cyan-500/20"
        >
          <div className="flex items-center gap-2 pointer-events-none">
            {icon && <span className="text-cyan-400 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
            <span className="font-semibold text-[11px] tracking-widest uppercase font-mono text-cyan-200">
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
        
        <div
          onPointerDown={handleResizeDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
        />
      </div>
    </div>,
    document.body
  );
}
