'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, PawPrint, Skull, Smile, ArrowLeft } from 'lucide-react';
import { ArchetypeEditorWorkspace } from '@/web/components/the-lobby/editor/hero-studio/ArchetypeEditorWorkspace';
import { CreatureDefEditorPanel } from '@/web/components/the-lobby/editor/panels/CreatureDefEditorPanel';

export type ActorCategory = 'ARCHETYPE' | 'CREATURE' | 'MONSTER' | 'NPC' | null;

interface ActorsSetupStepProps {}

export function ActorsSetupStep({}: ActorsSetupStepProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<ActorCategory>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If a workspace is active, render it full screen via Portal so it escapes the Wizard's stacking contexts
  if (activeWorkspace) {
    const workspaceContent = (
      <div className="fixed inset-0 z-[200] bg-[#050b14] flex flex-col pointer-events-auto">
        {/* Workspace Header */}
        <div className="h-14 shrink-0 border-b border-border/40 bg-slate-950 flex items-center px-4">
          <button
            onClick={() => setActiveWorkspace(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              Actors
            </span>
          </button>
          <div className="mx-4 w-px h-6 bg-slate-800" />
          <h1 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            {activeWorkspace === 'ARCHETYPE' && 'Archetype Creator'}
            {activeWorkspace === 'CREATURE' && 'Creature Creator'}
            {activeWorkspace === 'MONSTER' && 'Monster Creator'}
            {activeWorkspace === 'NPC' && 'NPC Creator'}
          </h1>
          
          <div className="ml-auto text-xs text-amber-400/80 font-mono flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            DRAFT MODE
          </div>
        </div>

        {/* Workspace Content */}
        <div className="flex-1 overflow-hidden relative">
          {activeWorkspace === 'ARCHETYPE' && <ArchetypeEditorWorkspace />}
          {activeWorkspace === 'CREATURE' && <CreatureDefEditorPanel />}
          {activeWorkspace === 'MONSTER' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Skull className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-widest">Monster Creator</p>
              <p className="text-xs mt-2 max-w-md text-center">World-first 3D physical entities. This editor is simplified for the onboarding flow.</p>
            </div>
          )}
          {activeWorkspace === 'NPC' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Smile className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-widest">NPC Creator</p>
              <p className="text-xs mt-2 max-w-md text-center">Define basic dialogue and shopkeepers.</p>
            </div>
          )}
        </div>
      </div>
    );

    return mounted ? createPortal(workspaceContent, document.body) : null;
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
