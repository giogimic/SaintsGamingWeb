'use client';

import { useGameStore } from '../store';
import { FloatingWindow } from '../hud/FloatingWindow';
import InventoryOverlay from '../inventory-overlay';
import { Backpack } from 'lucide-react';

export function InventoryWindow() {
  const isOpen = useGameStore((s) => s.openWindows.includes('inventory'));
  const closeWindow = useGameStore((s) => s.closeWindow);

  if (!isOpen) return null;

  return (
    <FloatingWindow
      id="window-inventory"
      title="INVENTORY"
      icon={<Backpack className="w-4 h-4 text-amber-400" />}
      isOpen={isOpen}
      onClose={() => closeWindow('inventory')}
      defaultWidth={420}
      defaultHeight={600}
      minWidth={360}
      minHeight={300}
    >
      <InventoryOverlay />
    </FloatingWindow>
  );
}
