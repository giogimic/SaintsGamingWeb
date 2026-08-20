'use client';

import { useGameStore } from '../store';
import { FloatingWindow } from '../hud/FloatingWindow';
import QuestLogOverlay from '../quest-log-overlay';
import { ScrollText } from 'lucide-react';

export function QuestLogWindow() {
  const isOpen = useGameStore((s) => s.openWindows.includes('quests'));
  const closeWindow = useGameStore((s) => s.closeWindow);

  if (!isOpen) return null;

  return (
    <FloatingWindow
      id="window-quests"
      title="QUEST JOURNAL & CAMPAIGN LOG"
      icon={<ScrollText className="w-4 h-4 text-amber-400" />}
      isOpen={isOpen}
      onClose={() => closeWindow('quests')}
      defaultWidth={620}
      defaultHeight={550}
      minWidth={400}
      minHeight={300}
    >
      <QuestLogOverlay />
    </FloatingWindow>
  );
}
