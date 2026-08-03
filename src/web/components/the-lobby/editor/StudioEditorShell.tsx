'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useEditorStore, PanelId, StudioMode } from './editor-store';
import { DraggablePanel } from './DraggablePanel';
import { 
  Hammer, 
  Settings2, 
  Image as ImageIcon, 
  Users, 
  TerminalSquare,
  Sword,
  PawPrint,
  UserCheck,
  ScrollText,
  MessageSquare,
} from 'lucide-react';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';

import { WorldBuilderPanel } from './panels/WorldBuilderPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { AssetBrowserPanel } from './panels/AssetBrowserPanel';
import { NpcEditorPanel } from './panels/NpcEditorPanel';
import { DevToolsPanel } from './panels/DevToolsPanel';
import { StarterHeroEditorPanel } from './panels/StarterHeroEditorPanel';
import { CreatureDefEditorPanel } from './panels/CreatureDefEditorPanel';
import { ClassEditorPanel } from './panels/ClassEditorPanel';
import { QuestEditorPanel } from './panels/QuestEditorPanel';
import { DialogueEditorPanel } from './panels/DialogueEditorPanel';
import { WorldProfileBar } from './WorldProfileBar';

export const StudioEditorShell: React.FC = () => {
  const { data: session } = useSession();
  const permissionLevel = session?.user?.permissionLevel ?? 0;
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const studioMode = useEditorStore((state) => state.studioMode);
  const toggleCreationMode = useEditorStore((state) => state.toggleCreationMode);
  const enterWalkMode = useEditorStore((state) => state.enterWalkMode);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const closePanel = useEditorStore((state) => state.closePanel);
  const showToast = useGameStore((state) => state.showToast);

  const canDev = canUseStudioDock(permissionLevel, 'dev');

  useEffect(() => {
    // Doc 16 §4: restore dock geometry from localStorage, then Walk Mode (create tools opt-in).
    useEditorStore.getState().hydratePanelLayouts();
    enterWalkMode();
  }, [enterWalkMode]);

  // Close docks the user cannot open (e.g. Dev without Admin+).
  useEffect(() => {
    (Object.keys(useEditorStore.getState().panels) as PanelId[]).forEach((id) => {
      if (!canUseStudioDock(permissionLevel, id)) {
        closePanel(id);
      }
    });
  }, [permissionLevel, closePanel]);

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

      <WorldProfileBar />

      {/* Render Active Floating Panels */}
      <div className="pointer-events-auto">
        {canUseStudioDock(permissionLevel, 'build') && (
          <DraggablePanel id="build" icon={<Hammer className="w-4 h-4" />}>
            <WorldBuilderPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'properties') && (
          <DraggablePanel id="properties" icon={<Settings2 className="w-4 h-4" />}>
            <PropertiesPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'assets') && (
          <DraggablePanel id="assets" icon={<ImageIcon className="w-4 h-4" />}>
            <AssetBrowserPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'npc') && (
          <DraggablePanel id="npc" icon={<Users className="w-4 h-4" />}>
            <NpcEditorPanel />
          </DraggablePanel>
        )}

        <DraggablePanel id="quest" icon={<ScrollText className="w-4 h-4" />}>
          <QuestEditorPanel />
        </DraggablePanel>

        <DraggablePanel id="dialogue" icon={<MessageSquare className="w-4 h-4" />}>
          <DialogueEditorPanel />
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

        <DraggablePanel id="classes" icon={<UserCheck className="w-4 h-4" />}>
          <ClassEditorPanel />
        </DraggablePanel>
      </div>

      {/* Mode strip + dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        <div className="sg-glass bg-[#050b14]/95 border border-[#806f47]/50 rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl">
          <span className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#806f47]">Mode</span>
          {MODE_BUTTONS.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={m.disabled}
              title={m.title || m.label}
              onClick={() => {
                if (m.disabled) {
                  showToast(m.title || 'Not available yet');
                  return;
                }
                setStudioMode(m.id);
              }}
              className={`
                flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all
                ${m.disabled
                  ? 'cursor-not-allowed text-slate-600 opacity-50'
                  : studioMode === m.id
                    ? 'bg-[#cbb26a]/20 text-[#cbb26a] shadow-[inset_0_0_12px_rgba(203,178,106,0.15)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>

        <div className="sg-glass bg-[#050b14]/90 border border-[#806f47]/40 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
          <DockButton id="build" icon={<Hammer className="w-5 h-5" />} label="Build" />
          <DockButton id="properties" icon={<Settings2 className="w-5 h-5" />} label="Props" />
          <DockButton id="assets" icon={<ImageIcon className="w-5 h-5" />} label="Assets" />
          <DockButton id="npc" icon={<Users className="w-5 h-5" />} label="NPCs" />
          <DockButton id="quest" icon={<ScrollText className="w-5 h-5" />} label="Quests" />
          <DockButton id="dialogue" icon={<MessageSquare className="w-5 h-5" />} label="Talk" />
          <div className="w-px h-6 bg-[#806f47]/30 mx-1" />
          <DockButton id="dev" icon={<TerminalSquare className="w-5 h-5" />} label="Dev" />
          <DockButton id="characters" icon={<Sword className="w-5 h-5" />} label="Heroes" />
          <DockButton id="creature" icon={<PawPrint className="w-5 h-5" />} label="Creatures" />
          <DockButton id="classes" icon={<UserCheck className="w-5 h-5" />} label="Classes" />
          <div className="w-px h-6 bg-[#806f47]/30 mx-1" />
          <button 
            onClick={() => setStudioMode('test')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            title="Return to Walk Mode"
          >
            <span className="font-bold text-[10px] uppercase font-mono">Walk (Ctrl+E)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DockButton: React.FC<{
  id: PanelId;
  icon: React.ReactNode;
  label: string;
  permissionLevel: number;
}> = ({ id, icon, label, permissionLevel }) => {
  const isOpen = useEditorStore((state) => state.panels[id].isOpen);
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const showToast = useGameStore((state) => state.showToast);

  if (!canUseStudioDock(permissionLevel, id)) return null;

  return (
    <button
      onClick={() => {
        if (!canUseStudioDock(permissionLevel, id)) {
          showToast('Insufficient permission for this dock');
          return;
        }
        togglePanel(id);
      }}
      className={`
        flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[60px]
        ${isOpen ? 'bg-[#806f47]/20 text-[#cbb26a] shadow-[inset_0_0_10px_rgba(203,178,106,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}
      `}
    >
      {icon}
      <span className="font-bold text-[10px] uppercase font-mono tracking-wider">{label}</span>
      <div className={`w-1 h-1 rounded-full mt-0.5 ${isOpen ? 'bg-[#cbb26a]' : 'bg-transparent'}`} />
    </button>
  );
};
