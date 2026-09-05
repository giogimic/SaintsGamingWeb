'use client';

import React, { useState } from 'react';
import { UserCircle, Swords, Users, ArrowLeft, Layers } from 'lucide-react';
import { ArchetypeEditorWorkspace } from './ArchetypeEditorWorkspace';
import { ClassEditorWorkspace } from './ClassEditorWorkspace';
import { useEditorStore } from '../editor-store';
import { soundSynth } from '@/engine/sound-synth';
import { WindowMenuBar, WindowMenuButton, WindowMenuTabGroup, WindowMenuDivider } from '../WindowMenuBar';

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
    <div className="flex-1 flex flex-col h-full pointer-events-auto select-none overflow-hidden bg-background pb-9">
      {/* ─── Top Studio Banner & Navigation ─── */}
      <WindowMenuBar className="h-10 py-1.5 px-3 bg-card/95">
        <WindowMenuButton
          label="Map Editor"
          icon={ArrowLeft}
          onClick={() => setStudioMode('develop')}
          title="Back to Map / World Editor"
        />
        <WindowMenuDivider />
        
        <div className="flex items-center gap-2">
          <div className="p-0.5 rounded-md bg-purple-500/20 text-purple-400">
            <UserCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-black tracking-wider text-purple-300 font-mono uppercase">
              Hero Studio
            </span>
            <span className="text-[9px] text-slate-500 font-mono ml-2 hidden sm:inline">
              Profile: <span className="text-slate-400">{activeGameId}</span>
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <WindowMenuTabGroup
          tabs={[
            { id: 'archetypes', label: 'Archetypes', icon: Users },
            { id: 'classes', label: 'Classes', icon: Swords },
          ]}
          activeTab={activeWorkspace}
          onChange={(id) => setActiveWorkspace(id as HeroWorkspaceId)}
        />

        <div className="flex-1" />

        <WindowMenuButton
          label="Asset Manager"
          icon={Layers}
          onClick={() => setStudioMode('assets')}
          title="Switch to Asset Manager to browse sprite packs"
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
        />
      </WindowMenuBar>

      {/* ─── Main Content Workspace ─── */}
      <div className="flex-1 flex min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
