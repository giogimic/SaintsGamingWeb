'use client';

import { ReactNode } from 'react';

interface RpgPanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function RpgPanel({ title, onClose, children }: RpgPanelProps) {
  return (
    <div className="absolute inset-2 md:inset-8 z-30 animate-in fade-in zoom-in-95 duration-200 flex flex-col pointer-events-auto">
      {/* Outer container with thin gold border and translucent slate background */}
      <div className="w-full h-full relative flex flex-col rounded-md overflow-hidden border-2 border-[#806f47] bg-[#0b1320]/85 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.7),inset_0_0_20px_rgba(11,19,32,0.9)]">
        
        {/* Header bar */}
        <div className="flex justify-between items-center p-2.5 border-b border-[#806f47]/50 bg-gradient-to-b from-[#1e293b]/80 to-[#0f172a]/90 shadow-md z-10">
          <h2 className="text-lg md:text-xl font-bold text-[#e2d5b3] tracking-wider uppercase drop-shadow-[1px_1px_2px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'monospace' }}>
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="w-6 h-6 bg-[#801717]/80 text-[#e2d5b3] font-bold rounded-sm border border-[#a83232] hover:bg-[#a83232] hover:text-white transition-colors flex items-center justify-center leading-none text-xs"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-transparent to-[#050b14]/50">
          <div className="relative w-full h-full p-4 flex flex-col z-10">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
