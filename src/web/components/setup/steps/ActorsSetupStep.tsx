'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { Users, PawPrint, Skull, Smile, ArrowLeft, Maximize2 } from 'lucide-react';
import { ArchetypeEditorWorkspace } from '@/web/components/the-lobby/editor/hero-studio/ArchetypeEditorWorkspace';
import { CreatureDefEditorPanel } from '@/web/components/the-lobby/editor/panels/CreatureDefEditorPanel';
import { FloatingWindow } from '@/web/components/the-lobby/hud/FloatingWindow';
import { AssetUploadPanel } from '@/web/components/the-lobby/editor/panels/AssetUploadPanel';
import { TilesetQuickUploadPanel } from '@/web/components/the-lobby/editor/panels/TilesetQuickUploadPanel';
import { MonsterEditorPanel } from '@/web/components/the-lobby/editor/panels/MonsterEditorPanel';
import { NpcEditorPanel } from '@/web/components/the-lobby/editor/panels/NpcEditorPanel';

export type ActorCategory = 'ARCHETYPE' | 'CREATURE' | 'MONSTER' | 'NPC' | null;

interface ActorsSetupStepProps {}

export function ActorsSetupStep({}: ActorsSetupStepProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<ActorCategory>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If a workspace is active, render it in a Floating Window via Portal
  if (activeWorkspace) {
    const workspaceContent = (
      <FloatingWindow
        id={`setup-creator-${activeWorkspace}`}
        title={`${activeWorkspace === 'ARCHETYPE' ? 'Archetype' : activeWorkspace === 'CREATURE' ? 'Creature' : activeWorkspace === 'MONSTER' ? 'Monster' : 'NPC'} Creator`}
        icon={
          activeWorkspace === 'ARCHETYPE' ? <Users className="w-4 h-4" /> :
          activeWorkspace === 'CREATURE' ? <PawPrint className="w-4 h-4" /> :
          activeWorkspace === 'MONSTER' ? <Skull className="w-4 h-4" /> : <Smile className="w-4 h-4" />
        }
        isOpen={true}
        onClose={() => setActiveWorkspace(null)}
        defaultWidth={1100}
        defaultPosition={{ x: 80, y: 40 }}
        zIndex={500}
        className="resize overflow-hidden"
        bodyClassName="p-0 overflow-hidden h-[80vh] flex flex-col"
        headerRight={
          <div className="text-xs text-amber-400/80 font-mono flex items-center gap-2 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mr-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            DRAFT MODE
          </div>
        }
      >
        <div className="flex-1 w-full h-full relative bg-[#050b14] overflow-hidden">
          {activeWorkspace === 'ARCHETYPE' && <ArchetypeEditorWorkspace />}
          {activeWorkspace === 'CREATURE' && <CreatureDefEditorPanel />}
          {activeWorkspace === 'MONSTER' && <MonsterEditorPanel />}
          {activeWorkspace === 'NPC' && <NpcEditorPanel />}
        </div>
      </FloatingWindow>
    );

    return mounted ? createPortal(
      <>
        {workspaceContent}
        {/* Mount global editor panels that might be triggered from within the tools */}
        <AssetUploadPanel />
        <TilesetQuickUploadPanel />
      </>,
      document.body
    ) : null;
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Users className="w-4 h-4 text-sky-400" />
            2. Actor Initialization
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create your initial classes, creatures, and characters. Changes are saved immediately as drafts.
          </p>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <button
          onClick={() => setActiveWorkspace('ARCHETYPE')}
          className="group relative flex flex-col items-start p-6 rounded-xl bg-[#070e1b] border border-slate-800 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-left overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-24 h-24 text-sky-400" />
          </div>
          <Users className="w-8 h-8 text-sky-400 mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">Archetypes</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">
            Define playable classes, starter heroes, or canonical player archetypes. Setup stats, visual assets, and default abilities.
          </p>
        </button>

        <button
          onClick={() => setActiveWorkspace('CREATURE')}
          className="group relative flex flex-col items-start p-6 rounded-xl bg-[#070e1b] border border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <PawPrint className="w-24 h-24 text-emerald-400" />
          </div>
          <PawPrint className="w-8 h-8 text-emerald-400 mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">Creatures</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">
            Create battle-capable species. Configure elemental types, battle presentations, and overworld representations.
          </p>
        </button>

        <button
          onClick={() => setActiveWorkspace('MONSTER')}
          className="group relative flex flex-col items-start p-6 rounded-xl bg-[#070e1b] border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all text-left overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Skull className="w-24 h-24 text-rose-400" />
          </div>
          <Skull className="w-8 h-8 text-rose-400 mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">Monsters</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">
            World-first 3D physical entities. Primarily focused on physical world presence and collision models.
          </p>
        </button>

        <button
          onClick={() => setActiveWorkspace('NPC')}
          className="group relative flex flex-col items-start p-6 rounded-xl bg-[#070e1b] border border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Smile className="w-24 h-24 text-amber-400" />
          </div>
          <Smile className="w-8 h-8 text-amber-400 mb-4" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">NPCs</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-[85%]">
            Populate your world with shopkeepers, dialogue givers, bankers, and townsfolk.
          </p>
        </button>

      </div>
    </div>
  );
}
