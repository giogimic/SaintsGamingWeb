'use client';

import { useGameStore } from '../store';
import { FloatingWindow } from '../hud/FloatingWindow';
import EquipmentOverlay from '../equipment-overlay';
import { Shield } from 'lucide-react';

export function EquipmentWindow() {
  const isOpen = useGameStore((s) => s.openWindows.includes('equipment'));
  const closeWindow = useGameStore((s) => s.closeWindow);

  if (!isOpen) return null;

  return (
    <FloatingWindow
      id="window-equipment"
      title="EQUIPMENT & GEAR"
      icon={<Shield className="w-4 h-4 text-cyan-400" />}
      isOpen={isOpen}
      onClose={() => closeWindow('equipment')}
      defaultWidth={500}
      defaultHeight={620}
      minWidth={400}
      minHeight={350}
    >
      <EquipmentOverlay />
    </FloatingWindow>
  );
}
