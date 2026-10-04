import React from 'react';
import { useGameStore } from '@/web/components/the-lobby/store';

export function AssetLoadingOverlay() {
  const assetLoadingStatus = useGameStore(s => s.assetLoadingStatus);

  if (!assetLoadingStatus) return null;

  return (
    <div className="absolute inset-x-0 top-24 z-[100] flex flex-col items-center justify-start pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0a101b]/90 border border-primary/30 shadow-[0_0_30px_rgba(219,39,119,0.2)] rounded-2xl p-4 flex items-center gap-4 max-w-sm backdrop-blur-md">
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div className="space-y-1 flex-1">
          <div className="text-xs font-black text-white sg-text-gradient uppercase tracking-wider">
            {assetLoadingStatus}
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary/50 w-full animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
