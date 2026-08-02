'use client';

import React, { useEffect } from 'react';
import { useEditorStore, PanelId } from './editor-store';
import { DraggablePanel } from './DraggablePanel';
import { 
  Hammer, 
  Settings2, 
  Image as ImageIcon, 
  Users, 
  Map, 
  Skull, 
  TerminalSquare,
  Sword,
  PawPrint
} from 'lucide-react';

// We will create these panel components next
import { WorldBuilderPanel } from './panels/WorldBuilderPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { AssetBrowserPanel } from './panels/AssetBrowserPanel';
import { NpcEditorPanel } from './panels/NpcEditorPanel';
import { DevToolsPanel } from './panels/DevToolsPanel';
import { StarterHeroEditorPanel } from './panels/StarterHeroEditorPanel';
import { CreatureDefEditorPanel } from './panels/CreatureDefEditorPanel';

export const StudioEditorShell: React.FC = () => {
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const toggleCreationMode = useEditorStore((state) => state.toggleCreationMode);
  const panels = useEditorStore((state) => state.panels);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+E to toggle Creation Mode — shell is only mounted on /studio
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        toggleCreationMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCreationMode]);

  // Studio shell is never mounted on the player client (/lobby).

  if (!isCreationMode) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {/* 
        The shell is pointer-events-none so clicks pass through to the game world.
        The individual panels and bottom dock will have pointer-events-auto.
      */}

      {/* Render Active Floating Panels */}
      <div className="pointer-events-auto">
        <DraggablePanel id="build" icon={<Hammer className="w-4 h-4" />}>
          <WorldBuilderPanel />
        </DraggablePanel>

        <DraggablePanel id="properties" icon={<Settings2 className="w-4 h-4" />}>
          <PropertiesPanel />
        </DraggablePanel>

        <DraggablePanel id="assets" icon={<ImageIcon className="w-4 h-4" />}>
          <AssetBrowserPanel />
        </DraggablePanel>

        <DraggablePanel id="npc" icon={<Users className="w-4 h-4" />}>
          <NpcEditorPanel />
        </DraggablePanel>

        <DraggablePanel id="dev" icon={<TerminalSquare className="w-4 h-4" />}>
          <DevToolsPanel />
        </DraggablePanel>

        <DraggablePanel id="characters" icon={<Sword className="w-4 h-4" />}>
          <StarterHeroEditorPanel />
        </DraggablePanel>

        <DraggablePanel id="creature" icon={<PawPrint className="w-4 h-4" />}>
          <CreatureDefEditorPanel />
        </DraggablePanel>
      </div>

      {/* Bottom Dock (Toolbar) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="sg-glass bg-[#050b14]/90 border border-[#806f47]/40 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
          <DockButton id="build" icon={<Hammer className="w-5 h-5" />} label="Build" />
          <DockButton id="properties" icon={<Settings2 className="w-5 h-5" />} label="Props" />
          <DockButton id="assets" icon={<ImageIcon className="w-5 h-5" />} label="Assets" />
          <DockButton id="npc" icon={<Users className="w-5 h-5" />} label="NPCs" />
          <div className="w-px h-6 bg-[#806f47]/30 mx-1" />
          <DockButton id="dev" icon={<TerminalSquare className="w-5 h-5" />} label="Dev" />
          <DockButton id="characters" icon={<Sword className="w-5 h-5" />} label="Heroes" />
          <DockButton id="creature" icon={<PawPrint className="w-5 h-5" />} label="Creatures" />
          <div className="w-px h-6 bg-[#806f47]/30 mx-1" />
          <button 
            onClick={toggleCreationMode}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="font-bold text-[10px] uppercase font-mono">Exit (Ctrl+E)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DockButton: React.FC<{ id: PanelId; icon: React.ReactNode; label: string }> = ({ id, icon, label }) => {
  const isOpen = useEditorStore((state) => state.panels[id].isOpen);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <button
      onClick={() => togglePanel(id)}
      className={`
        flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[60px]
        ${isOpen ? 'bg-[#806f47]/20 text-[#cbb26a] shadow-[inset_0_0_10px_rgba(203,178,106,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}
      `}
    >
      {icon}
      <span className="font-bold text-[10px] uppercase font-mono tracking-wider">{label}</span>
      {/* Active Indicator Dot */}
      <div className={`w-1 h-1 rounded-full mt-0.5 ${isOpen ? 'bg-[#cbb26a]' : 'bg-transparent'}`} />
    </button>
  );
};
