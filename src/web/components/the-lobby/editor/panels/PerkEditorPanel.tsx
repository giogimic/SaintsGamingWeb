import React from 'react';
import { useEditorStore } from '../editor-store';
import { DraggablePanel } from '../DraggablePanel';
import { PerkStudioTab } from './tabs/PerkStudioTab';

export function PerkEditorPanel() {
  const panel = useEditorStore((s) => s.panels.perks);
  if (!panel?.isOpen) return null;

  return (
    <DraggablePanel id="perks">
      <div className="flex flex-col h-full bg-[#050b14]/95 overflow-y-auto custom-scrollbar p-4">
        <PerkStudioTab />
      </div>
    </DraggablePanel>
  );
}
