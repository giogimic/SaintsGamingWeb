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
      {/* Outer container with thick border and shadow */}
      <div className="w-full h-full relative flex flex-col rounded-lg overflow-hidden border-[6px] border-[#3e2723] bg-[#271c19] shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.9)]">
        
        {/* Header bar */}
        <div className="flex justify-between items-center p-3 border-b-4 border-[#3e2723] bg-gradient-to-b from-[#4e342e] to-[#3e2723] shadow-[0_2px_10px_rgba(0,0,0,0.5)] z-10">
          <h2 className="text-xl md:text-2xl font-bold text-[#e0e0e0] tracking-widest uppercase drop-shadow-[2px_2px_0px_#000]" style={{ fontFamily: 'monospace' }}>
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-[#b71c1c] text-white font-bold rounded-sm border-2 border-[#ff5252] hover:bg-[#ff5252] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-colors flex items-center justify-center leading-none"
          >
            X
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
          <div className="absolute inset-0 bg-black/40" /> {/* Darken texture */}
          <div className="relative w-full h-full p-4 flex flex-col z-10">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
