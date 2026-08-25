'use client';

import React, { useState } from 'react';
import { UserCircle, Swords, Users, ArrowLeft, Sparkles, Shield, Layers } from 'lucide-react';
import { ArchetypeEditorWorkspace } from './ArchetypeEditorWorkspace';
import { ClassEditorWorkspace } from './ClassEditorWorkspace';
import { useEditorStore } from '../editor-store';
import { soundSynth } from '@/engine/sound-synth';

export type HeroWorkspaceId = 'archetypes' | 'classes';

export function HeroStudioSuite() {
  const [activeWorkspace, setActiveWorkspace] = useState<HeroWorkspaceId>('archetypes');
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const activeGameId = useEditorStore((s) => s.activeGameId);

  const renderContent = () => {
    switch (activeWorkspace) {
      case 'archetypes':
        return <ArchetypeEditorWorkspace />;
      case 'classes':
        return <ClassEditorWorkspace />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full pointer-events-auto select-none overflow-hidden bg-[#030810]">
      {/* ─── Top Studio Banner & Navigation ─── */}
      <div className="h-11 flex-shrink-0 flex items-center justify-between px-4 bg-[#050b14]/95 border-b border-slate-800/80 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setStudioMode('develop');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 hover:text-white text-[10px] font-bold font-mono transition-all cursor-pointer border border-slate-700/50"
            title="Back to Map / World Editor"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Map Editor</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <UserCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider text-purple-300 font-mono uppercase">
                Hero Studio
              </span>
              <span className="text-[9px] text-slate-500 font-mono ml-2 hidden sm:inline">
                Profile: <span className="text-slate-400">{activeGameId}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Top Center Workspace Switcher */}
        <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setActiveWorkspace('archetypes');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              activeWorkspace === 'archetypes'
                ? 'bg-purple-600/90 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Archetypes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setActiveWorkspace('classes');
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              activeWorkspace === 'classes'
                ? 'bg-cyan-600/90 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3 h-3" />
            <span>Classes</span>
          </button>
        </div>

        {/* Right Info / Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundSynth?.playUiClick?.();
              setStudioMode('assets');
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[9px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 transition-all cursor-pointer"
            title="Switch to Asset Manager to browse sprite packs"
          >
            <Layers className="w-3 h-3" />
            <span>Asset Manager</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Workspace ─── */}
      <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
