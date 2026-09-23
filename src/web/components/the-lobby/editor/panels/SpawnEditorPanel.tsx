'use client';

import React from 'react';
import { MapPin } from 'lucide-react';

export const SpawnEditorPanel: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs -m-3 mb-0 overflow-hidden p-6 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <MapPin className="w-12 h-12 text-slate-600" />
        <h2 className="font-extrabold text-slate-400 tracking-wider uppercase text-lg">
          Spawn Editor Deprecated
        </h2>
        <p className="text-[11px] text-slate-500 font-sans">
          The global canonical spawn map has been replaced by the Release Manager. 
          You can now explicitly select the default spawn map when publishing a World Release Snapshot.
        </p>
      </div>
    </div>
  );
};
