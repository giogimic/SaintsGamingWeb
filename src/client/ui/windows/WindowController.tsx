'use client';

import { useSessionStore } from '../../state/useSessionStore';
import { useHudStore } from '../../state/useHudStore';

import { InventoryWindow } from './InventoryWindow';
import { EquipmentWindow } from './EquipmentWindow';
import { SkillsWindow } from './SkillsWindow';
import { QuestLogWindow } from './QuestLogWindow';
import { GtcWindow } from './GtcWindow';

export function WindowController() {
  const openWindows = useHudStore((s) => s.openWindows);
  const closeWindow = useHudStore((s) => s.closeWindow);

  return (
    <>
      <InventoryWindow 
        isOpen={openWindows.includes('inventory')} 
        onClose={() => closeWindow('inventory')} 
      />
      <EquipmentWindow 
        isOpen={openWindows.includes('equipment')} 
        onClose={() => closeWindow('equipment')} 
      />
      <SkillsWindow 
        isOpen={openWindows.includes('skills')} 
        onClose={() => closeWindow('skills')} 
      />
      <QuestLogWindow 
        isOpen={openWindows.includes('quests')} 
        onClose={() => closeWindow('quests')} 
      />
      <GtcWindow 
        isOpen={openWindows.includes('gtc')} 
        onClose={() => closeWindow('gtc')} 
      />
    </>
  );
}
