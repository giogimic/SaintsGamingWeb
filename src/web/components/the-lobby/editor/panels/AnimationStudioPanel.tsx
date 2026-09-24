'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export function AnimationStudioPanel() {
  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs -m-3 mb-0 overflow-hidden p-6 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <Sparkles className="w-12 h-12 text-slate-600" />
        <h2 className="font-extrabold text-slate-400 tracking-wider uppercase text-lg">
          Animation Studio Deprecated
        </h2>
        <p className="text-[11px] text-slate-500 font-sans">
          The 2D Sprite Animation Studio has been retired. Animations are now bundled directly within the 3D `.glb` assets and managed through their respective asset profiles.
        </p>
      </div>
    </div>
  );
}
