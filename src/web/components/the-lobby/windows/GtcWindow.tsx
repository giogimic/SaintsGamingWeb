'use client';

import { useGameStore } from '../store';
import { FloatingWindow } from '../hud/FloatingWindow';
import GtcOverlay from '../gtc-overlay';
import { Store } from 'lucide-react';

export function GtcWindow() {
  const isOpen = useGameStore((s) => s.openWindows.includes('gtc'));
  const closeWindow = useGameStore((s) => s.closeWindow);

  if (!isOpen) return null;

  return (
    <FloatingWindow
      id="window-gtc"
      title="GLOBAL TRADE CENTER"
      icon={<Store className="w-4 h-4 text-emerald-400" />}
      isOpen={isOpen}
      onClose={() => closeWindow('gtc')}
      defaultWidth={580}
      defaultHeight={550}
      minWidth={420}
      minHeight={300}
    >
      <GtcOverlay />
    </FloatingWindow>
  );
}
