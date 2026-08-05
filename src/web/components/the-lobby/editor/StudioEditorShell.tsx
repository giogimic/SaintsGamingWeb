'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  useEditorStore,
  PanelId,
  StudioMode,
  STUDIO_MODE_META,
  STUDIO_DOCK_META,
} from './editor-store';
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
  Play,
  Coins,
  Wrench,
  Footprints,
  UserRound,
} from 'lucide-react';
import { useGameStore } from '../store';
import { canUseStudioDock } from '@/shared/game/studioPermissions';
import { STUDIO_MAP_CELLS_CHANGED_EVENT } from '@/shared/game/studioEvents';
import { StudioPaintHud } from './StudioPaintHud';

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
import { LootManagerPanel } from './panels/LootManagerPanel';
import { WorldProfileBar } from './WorldProfileBar';

const MODE_BUTTONS: Array<{
  id: StudioMode;
  icon: React.ReactNode;
}> = [
  { id: 'develop', icon: <Wrench className="w-4 h-4" /> },
  { id: 'npc', icon: <Users className="w-4 h-4" /> },
  { id: 'quest', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'creature', icon: <PawPrint className="w-4 h-4" /> },
  { id: 'test', icon: <Footprints className="w-4 h-4" /> },
];

export const StudioEditorShell: React.FC = () => {
  const { data: session } = useSession();
  const permissionLevel = session?.user?.permissionLevel ?? 0;
  const isCreationMode = useEditorStore((state) => state.isCreationMode);
  const studioMode = useEditorStore((state) => state.studioMode);
  const mapDirty = useEditorStore((state) => state.mapDirty);
  const pieOptions = useEditorStore((state) => state.pieOptions);
  const setPieOption = useEditorStore((state) => state.setPieOption);
  const toggleCreationMode = useEditorStore((state) => state.toggleCreationMode);
  const enterDevelopmentMode = useEditorStore((state) => state.enterDevelopmentMode);
  const setStudioMode = useEditorStore((state) => state.setStudioMode);
  const closePanel = useEditorStore((state) => state.closePanel);
  const showToast = useGameStore((state) => state.showToast);
  const gameMode = useGameStore((state) => state.gameMode);

  const canDev = canUseStudioDock(permissionLevel, 'dev');

  useEffect(() => {
    // Restore dock geometry, then enter Development Mode (tools on by default).
    useEditorStore.getState().hydratePanelLayouts();
    enterDevelopmentMode();
  }, [enterDevelopmentMode]);

  useEffect(() => {
    (Object.keys(useEditorStore.getState().panels) as PanelId[]).forEach((id) => {
      if (!canUseStudioDock(permissionLevel, id)) {
        closePanel(id);
      }
    });
  }, [permissionLevel, closePanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Ctrl+E toggles Editor ↔ Playtest
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const mode = useGameStore.getState().gameMode;
        if (mode !== 'EXPLORING' && mode !== 'BATTLE') return;
        toggleCreationMode();
        return;
      }

      // Ctrl+Z / Ctrl+Y — map-scope undo/redo (editor runtime only)
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const result = useEditorStore.getState().undoLastOp(map);
        if (!result.ok || !result.op) return;
        if (result.op.kind === 'paint_cells') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: result.op.cells.map((c) => ({
                  r: c.r,
                  c: c.c,
                  layerIdx: c.layerIdx,
                  value: c.before,
                })),
              },
            })
          );
        }
        showToast('Undo');
        return;
      }

      if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        if (!useEditorStore.getState().isCreationMode) return;
        e.preventDefault();
        const map = useGameStore.getState().activeMapData;
        if (!map) return;
        const result = useEditorStore.getState().redoLastOp(map);
        if (!result.ok || !result.op) return;
        if (result.op.kind === 'paint_cells') {
          window.dispatchEvent(
            new CustomEvent(STUDIO_MAP_CELLS_CHANGED_EVENT, {
              detail: {
                cells: result.op.cells.map((c) => ({
                  r: c.r,
                  c: c.c,
                  layerIdx: c.layerIdx,
                  value: c.after,
                })),
              },
            })
          );
        }
        showToast('Redo');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCreationMode, showToast]);

  if (gameMode !== 'EXPLORING' && gameMode !== 'BATTLE') {
    return null;
  }

  // Playtest — compact return chip + PIE options (bible 32 §4)
  if (!isCreationMode) {
    return (
      <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        <div className="sg-glass max-w-md rounded-2xl border border-emerald-500/30 bg-[#050b14]/95 px-4 py-3 text-center shadow-2xl">
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <Footprints className="h-4 w-4" />
            Playtest · PIE private shard
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Isolated from public lobby DEMO. Editor tools stay frozen until you stop playtest.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-1.5 text-left sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300">
              <input
                type="checkbox"
                checked={pieOptions.isolateShard}
                disabled
                className="accent-emerald-500"
              />
              Isolate shard
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300 hover:border-emerald-700/40">
              <input
                type="checkbox"
                checked={pieOptions.pauseSpawners}
                onChange={(e) => setPieOption('pauseSpawners', e.target.checked)}
                className="accent-emerald-500"
              />
              Pause spawners
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-300 hover:border-emerald-700/40">
              <input
                type="checkbox"
                checked={pieOptions.godMode}
                onChange={(e) => setPieOption('godMode', e.target.checked)}
                className="accent-emerald-500"
              />
              God mode (no encounters)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-black/30 px-2 py-1.5 text-[10px] text-slate-500">
              <input
                type="checkbox"
                checked={pieOptions.pauseWorldEvents}
                disabled
                className="accent-emerald-500"
              />
              Pause world events
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => useEditorStore.getState().exitPlaytest()}
          className="sg-glass flex items-center gap-2 rounded-full border border-[#806f47]/50 bg-[#050b14]/95 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#cbb26a] shadow-2xl hover:bg-[#806f47]/20"
          title="Return to Editor (Ctrl+E)"
        >
          <Wrench className="h-4 w-4" />
          Stop Playtest
          <span className="font-medium normal-case tracking-normal text-slate-500">Ctrl+E</span>
        </button>
      </div>
    );
  }

  const activeMeta = STUDIO_MODE_META[studioMode];

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <WorldProfileBar />
      <StudioPaintHud />

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

        {canUseStudioDock(permissionLevel, 'quest') && (
          <DraggablePanel id="quest" icon={<ScrollText className="w-4 h-4" />}>
            <QuestEditorPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'dialogue') && (
          <DraggablePanel id="dialogue" icon={<MessageSquare className="w-4 h-4" />}>
            <DialogueEditorPanel />
          </DraggablePanel>
        )}

        {canDev && (
          <DraggablePanel id="dev" icon={<TerminalSquare className="w-4 h-4" />}>
            <DevToolsPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'characters') && (
          <DraggablePanel id="characters" icon={<Sword className="w-4 h-4" />}>
            <StarterHeroEditorPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'creature') && (
          <DraggablePanel id="creature" icon={<PawPrint className="w-4 h-4" />}>
            <CreatureDefEditorPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'loot') && (
          <DraggablePanel id="loot" icon={<Coins className="w-4 h-4" />}>
            <LootManagerPanel />
          </DraggablePanel>
        )}

        {canUseStudioDock(permissionLevel, 'classes') && (
          <DraggablePanel id="classes" icon={<UserCheck className="w-4 h-4" />}>
            <ClassEditorPanel />
          </DraggablePanel>
        )}
      </div>

      {/* Mode strip + dock */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2 max-w-[95vw]">
        <div className="sg-glass rounded-2xl border border-[#806f47]/40 bg-[#050b14]/95 px-3 py-2 shadow-2xl">
          <div className="flex flex-wrap items-center justify-center gap-1">
            <span className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#806f47]">
              Workspace
            </span>
            {MODE_BUTTONS.map((m) => {
              const meta = STUDIO_MODE_META[m.id];
              const active = studioMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={`${meta.label} — ${meta.blurb}`}
                  onClick={() => setStudioMode(m.id)}
                  className={`
                    flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all
                    ${active
                      ? m.id === 'test'
                        ? 'bg-emerald-500/20 text-emerald-300 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]'
                        : 'bg-[#cbb26a]/20 text-[#cbb26a] shadow-[inset_0_0_12px_rgba(203,178,106,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  {m.icon}
                  {meta.label}
                </button>
              );
            })}
            {mapDirty && (
              <span className="ml-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-200">
                Unsaved
              </span>
            )}
          </div>
          <p className="mt-1.5 max-w-xl text-center text-[10px] leading-relaxed text-slate-400">
            <span className="font-semibold text-[#e2d5b3]">{activeMeta.label}:</span> {activeMeta.blurb}
          </p>
        </div>

        <div className="sg-glass bg-[#050b14]/90 border border-[#806f47]/40 rounded-full px-3 py-2 flex items-center gap-1.5 sm:gap-2 shadow-2xl overflow-x-auto max-w-full">
          <DockButton id="build" icon={<Hammer className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="properties" icon={<Settings2 className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="assets" icon={<ImageIcon className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="npc" icon={<Users className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="quest" icon={<ScrollText className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="dialogue" icon={<MessageSquare className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <div className="w-px h-6 bg-[#806f47]/30 mx-0.5 shrink-0" />
          {canDev && (
            <DockButton id="dev" icon={<TerminalSquare className="w-5 h-5" />} permissionLevel={permissionLevel} />
          )}
          <DockButton id="characters" icon={<Sword className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="creature" icon={<PawPrint className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="loot" icon={<Coins className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <DockButton id="classes" icon={<UserCheck className="w-5 h-5" />} permissionLevel={permissionLevel} />
          <div className="w-px h-6 bg-[#806f47]/30 mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => {
              useGameStore.getState().setGameMode('CHARACTER_SELECT');
              showToast('Load a character for Playtest — or cancel back to author session');
            }}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors min-w-[64px]"
            title="Load a game character (optional — author session needs none)"
          >
            <UserRound className="w-4 h-4" />
            <span className="font-bold text-[9px] uppercase font-mono tracking-wider">Hero</span>
          </button>
          <button
            type="button"
            onClick={() => {
              useEditorStore.getState().enterPlaytest();
              showToast('Playtest — gameplay systems on');
            }}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors min-w-[64px]"
            title={STUDIO_MODE_META.test.blurb}
          >
            <Play className="w-4 h-4" />
            <span className="font-bold text-[9px] uppercase font-mono tracking-wider">Play</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const DockButton: React.FC<{
  id: PanelId;
  icon: React.ReactNode;
  permissionLevel: number;
}> = ({ id, icon, permissionLevel }) => {
  const isOpen = useEditorStore((state) => state.panels[id].isOpen);
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const showToast = useGameStore((state) => state.showToast);
  const meta = STUDIO_DOCK_META[id];

  if (!canUseStudioDock(permissionLevel, id)) return null;

  return (
    <button
      type="button"
      title={`${meta.label} — ${meta.blurb}`}
      onClick={() => {
        if (!canUseStudioDock(permissionLevel, id)) {
          showToast('Insufficient permission for this dock');
          return;
        }
        togglePanel(id);
      }}
      className={`
        flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[56px]
        ${isOpen ? 'bg-[#806f47]/20 text-[#cbb26a] shadow-[inset_0_0_10px_rgba(203,178,106,0.1)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}
      `}
    >
      {icon}
      <span className="font-bold text-[9px] uppercase font-mono tracking-wider">{meta.label}</span>
      <div className={`w-1 h-1 rounded-full mt-0.5 ${isOpen ? 'bg-[#cbb26a]' : 'bg-transparent'}`} />
    </button>
  );
};
